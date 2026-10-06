/**
 * Claude Code native mod: cache TTL statusline bridge.
 *
 * Renders the configured statusline as a React band AbovePrompt using native
 * `Box` / `Text` / `Link` elements from `$.ui.resolve(e)`. Data sources
 * are engine nouns (`$.session.*`, `$.fs.read`, `$.http.fetch`,
 * `$.process.run`); no Node APIs are touched.
 *
 * Engine constraints honored:
 *   1. No dynamic `import()` (validator rejects).
 *   2. No Node-only imports transitively (`fs`, `child_process`, etc.).
 *      Every helper that uses `$.fs` etc. lives in this file.
 *   3. `$` (EngineInterface) does not cross imports — every helper that
 *      accepts `$` must live in this file.
 *
 * Replaces the legacy bridge that spawned the CLI as a subprocess. The
 * CLI itself is kept for the TUI configurator and background-fetch modes.
 */
import type {
  Register,
  EngineInterface,
  RenderInput,
  RenderElement,
} from "claude-code";
import { createDefaultSettings, validateSettings } from "../src/config/schema.js";
import type { Settings, StatusLinePayload } from "../src/widgets/types.js";
import type {
  CacheTTLResult,
  CacheSessionStats,
} from "../src/cache-core.js";
import type { HeadroomStats } from "../src/headroom-core.js";
import type { UsageData } from "../src/usage-core.js";
import type {
  GitInfo,
  RemoteInfo,
  RuntimeData,
  SessionInfo,
  TokenInfo,
  UsageWindowInfo,
} from "../src/runtime-core.js";
import { renderStatusLineElement } from "../src/widgets/renderer-mod.js";

// ────────────────────────────────────────────────────────────────────────────
// Local helpers — every function that takes `$` lives here.
// ────────────────────────────────────────────────────────────────────────────

type $ = EngineInterface;

const TRANSCRIPT_REF = { plugin: "cache-ttl-statusline", key: "transcript_path" } as const;

function pathBasename(p: string): string {
  const norm = p.replace(/\\/g, "/");
  const idx = norm.lastIndexOf("/");
  return idx === -1 ? norm : norm.slice(idx + 1);
}

async function readText($: $, path: string): Promise<string | null> {
  try {
    const raw = await $.fs.read(path, { as: "text" });
    return typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  } catch {
    return null;
  }
}

async function writeTextSafe($: $, path: string, text: string): Promise<boolean> {
  try {
    await $.fs.write(path, text);
    return true;
  } catch {
    return false;
  }
}

async function getHome($: $): Promise<string | null> {
  return (
    (await $.env.get("CLAUDE_CONFIG_DIR")) ??
    (await $.env.get("HOME")) ??
    (await $.env.get("USERPROFILE")) ??
    null
  );
}

async function getTranscriptPath($: $): Promise<string | undefined> {
  try {
    const r = await $.state.get<string>(TRANSCRIPT_REF);
    return r.value;
  } catch {
    return undefined;
  }
}

async function loadSettingsMod($: $): Promise<Settings> {
  const home = await getHome($);
  if (!home) return createDefaultSettings();
  const path = `${home}/.config/claude-statusline-widgets/settings.json`;
  const text = await readText($, path);
  if (text === null) return createDefaultSettings();
  try {
    return validateSettings(JSON.parse(text));
  } catch {
    return createDefaultSettings();
  }
}

// --- Cache TTL: parse the JSONL directly using --fs. ---
async function getCacheTTLMod(
  $: $,
  transcriptPath: string | undefined,
  currentCacheRead: number,
): Promise<CacheTTLResult> {
  const noData: CacheTTLResult = {
    remainingSeconds: -1,
    tier: "none",
    lastWriteTime: null,
    expiresAt: null,
    cacheReadActive: currentCacheRead > 0,
  };
  if (!transcriptPath) return noData;

  // Stat first to fail fast on huge transcripts ($.fs.read has a 4 MiB cap).
  try {
    const stat = await $.fs.stat(transcriptPath);
    if (stat.size > 4 * 1024 * 1024) return noData;
  } catch {
    return noData;
  }

  const text = await readText($, transcriptPath);
  if (text === null) return noData;
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  // Walk backwards.
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry: {
      timestamp?: string;
      message?: {
        usage?: {
          cache_creation_input_tokens?: number;
          cache_creation?: {
            ephemeral_5m_input_tokens?: number;
            ephemeral_1h_input_tokens?: number;
          };
        };
      };
    };
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const usage = entry.message?.usage;
    if (!usage?.cache_creation_input_tokens || usage.cache_creation_input_tokens <= 0) continue;
    const timestamp = entry.timestamp;
    if (!timestamp) continue;
    const creation = usage.cache_creation;
    const is1h = (creation?.ephemeral_1h_input_tokens ?? 0) > 0;
    const ttlSeconds = is1h ? 3600 : 300;
    const tier: "1h" | "5m" = is1h ? "1h" : "5m";
    const writeTime = new Date(timestamp).getTime();
    const expiresAt = writeTime + ttlSeconds * 1000;
    const now = await $.clock.now();
    const remaining = Math.max(0, (expiresAt - now) / 1000);
    return {
      remainingSeconds: Math.round(remaining),
      tier,
      lastWriteTime: timestamp,
      expiresAt,
      cacheReadActive: currentCacheRead > 0,
    };
  }
  return noData;
}

async function getCacheSessionStatsMod(
  $: $,
  transcriptPath: string | undefined,
): Promise<CacheSessionStats> {
  const empty: CacheSessionStats = {
    totalReads: 0,
    totalWrites: 0,
    breakCount: 0,
    lastBreakTime: null,
    lastBreakTokens: 0,
    avgBreakTokens: 0,
  };
  if (!transcriptPath) return empty;
  try {
    const stat = await $.fs.stat(transcriptPath);
    if (stat.size > 4 * 1024 * 1024) return empty;
  } catch {
    return empty;
  }
  const text = await readText($, transcriptPath);
  if (text === null) return empty;
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  let totalReads = 0;
  let totalWrites = 0;
  const breakList: { tokens: number; time: string }[] = [];
  let lastExpiresAt: number | null = null;

  for (const line of lines) {
    let entry: {
      timestamp?: string;
      message?: {
        usage?: {
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
          cache_creation?: {
            ephemeral_5m_input_tokens?: number;
            ephemeral_1h_input_tokens?: number;
          };
        };
      };
    };
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const usage = entry.message?.usage;
    if (!usage) continue;
    if (usage.cache_read_input_tokens) totalReads += usage.cache_read_input_tokens;
    const written = usage.cache_creation_input_tokens ?? 0;
    if (written > 0 && entry.timestamp) {
      totalWrites += written;
      const writeMs = new Date(entry.timestamp).getTime();
      const isBreak = lastExpiresAt === null || writeMs > lastExpiresAt;
      if (isBreak) breakList.push({ tokens: written, time: entry.timestamp });
      const creation = usage.cache_creation;
      const ttlSeconds =
        (creation?.ephemeral_1h_input_tokens ?? 0) > 0 ? 3600 : 300;
      lastExpiresAt = writeMs + ttlSeconds * 1000;
    }
  }

  if (breakList.length === 0) return { ...empty, totalReads, totalWrites };
  const lastBreak = breakList[breakList.length - 1];
  const avgBreakTokens = Math.round(
    breakList.reduce((s, b) => s + b.tokens, 0) / breakList.length,
  );
  return {
    totalReads,
    totalWrites,
    breakCount: breakList.length,
    lastBreakTime: lastBreak.time,
    lastBreakTokens: lastBreak.tokens,
    avgBreakTokens,
  };
}

// --- Usage cache + fetch. ---
async function readUsageCacheMod($: $): Promise<{ fetchedAt: number; data: UsageData; rateLimitedUntil?: number } | null> {
  const home = await getHome($);
  if (!home) return null;
  const text = await readText($, `${home}/.claude/.cache/usage.json`);
  if (text === null) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function fetchUsageMod($: $): Promise<void> {
  const home = await getHome($);
  if (!home) return;
  let token: string | null = (await $.env.get("CLAUDE_CODE_OAUTH_TOKEN")) ?? null;
  if (!token) {
    const text = await readText($, `${home}/.claude/.credentials.json`);
    if (text !== null) {
      try {
        const j = JSON.parse(text) as { claudeAiOauth?: { accessToken?: string } };
        token = j?.claudeAiOauth?.accessToken ?? null;
      } catch { /* ignore */ }
    }
  }
  if (!token) return;
  try {
    const res = await $.http.fetch("https://api.anthropic.com/api/oauth/usage", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json",
      },
      timeoutMs: 5000,
    });
    if (!res.ok) return;
    const data = await res.json();
    await writeTextSafe(
      $,
      `${home}/.claude/.cache/usage.json`,
      JSON.stringify({ fetchedAt: Date.now(), data }),
    );
  } catch { /* ignore */ }
}

async function getUsageDataMod($: $): Promise<UsageData | null> {
  const cache = await readUsageCacheMod($);
  if (!cache) return null;
  const stale =
    Date.now() - cache.fetchedAt > 60_000 &&
    (!cache.rateLimitedUntil || Date.now() >= cache.rateLimitedUntil);
  if (stale) {
    try { await fetchUsageMod($); } catch { /* ignore */ }
    const after = await readUsageCacheMod($);
    return after?.data ?? cache.data ?? null;
  }
  return cache.data ?? null;
}

// --- Headroom cache + fetch. ---
async function readHeadroomCacheMod($: $): Promise<{ fetchedAt: number; isActive: boolean; data: HeadroomStats | null } | null> {
  const home = await getHome($);
  if (!home) return null;
  const text = await readText($, `${home}/.claude/.cache/headroom.json`);
  if (text === null) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function fetchHeadroomMod($: $): Promise<void> {
  const home = await getHome($);
  if (!home) return;
  const baseUrl = (await $.env.get("ANTHROPIC_BASE_URL")) ?? "http://127.0.0.1:8787";
  try {
    const healthRes = await $.http.fetch(`${baseUrl}/health`, { timeoutMs: 2000 });
    if (!healthRes.ok) return;
    const health = await healthRes.json() as { status?: string };
    if (health.status !== "healthy") return;
    const statsRes = await $.http.fetch(`${baseUrl}/stats`, { timeoutMs: 2000 });
    if (!statsRes.ok) return;
    const raw = await statsRes.json() as Record<string, unknown>;
    const tokens = raw.tokens as Record<string, unknown> | undefined;
    const cost = raw.cost as Record<string, unknown> | undefined;
    const requests = raw.requests as Record<string, unknown> | undefined;
    const prefixCache = raw.prefix_cache as Record<string, Record<string, unknown>> | undefined;
    const stats: HeadroomStats = {
      compressionPct: safeNum(tokens?.savings_percent),
      tokensSaved: safeNum(tokens?.saved) + safeNum(tokens?.cli_tokens_avoided),
      cliTokensSaved: safeNum(tokens?.cli_tokens_avoided),
      costSavedUsd: safeNum(cost?.savings_usd),
      requests: safeNum(requests?.total),
      cacheHitRate: safeNum(prefixCache?.totals?.hit_rate) / 100,
    };
    await writeTextSafe(
      $,
      `${home}/.claude/.cache/headroom.json`,
      JSON.stringify({ fetchedAt: Date.now(), isActive: true, data: stats }),
    );
  } catch { /* ignore */ }
}

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function getHeadroomStatsMod($: $): Promise<HeadroomStats | null> {
  const cache = await readHeadroomCacheMod($);
  if (!cache) {
    try { await fetchHeadroomMod($); } catch { /* ignore */ }
    return (await readHeadroomCacheMod($))?.data ?? null;
  }
  if (Date.now() - cache.fetchedAt > 30_000) {
    try { await fetchHeadroomMod($); } catch { /* ignore */ }
    return (await readHeadroomCacheMod($))?.data ?? cache.data ?? null;
  }
  return cache.data ?? null;
}

// --- Git info via $.process.run. ---
async function runGit($: $, args: string[], cwd: string): Promise<string | null> {
  try {
    const res = await $.process.run(["git", ...args], { cwd, timeoutMs: 4000 });
    if (res.exitCode !== 0) return null;
    return res.stdout.trim();
  } catch {
    return null;
  }
}

function parseRemote(rawUrl: string | null): RemoteInfo | null {
  if (!rawUrl) return null;
  const m = rawUrl.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  if (!m) return { rawUrl, owner: null, repo: null };
  return { rawUrl, owner: m[1] || null, repo: m[2] || null };
}

async function parseGitInfoMod($: $, cwd: string | null): Promise<GitInfo> {
  const empty: GitInfo = {
    available: false,
    cwd,
    branch: null,
    rootPath: null,
    rootName: null,
    sha: null,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicts: 0,
    changes: 0,
    insertions: 0,
    deletions: 0,
    ahead: 0,
    behind: 0,
    origin: null,
    upstream: null,
    isFork: false,
    worktreeMode: null,
    worktreeName: null,
    worktreeBranch: null,
    worktreeOriginalBranch: null,
  };
  if (!cwd) return empty;

  const status = await runGit($, ["status", "--porcelain=v2", "--branch"], cwd);
  if (!status) return empty;

  const rootPath = await runGit($, ["rev-parse", "--show-toplevel"], cwd);
  const origin = parseRemote(await runGit($, ["config", "--get", "remote.origin.url"], cwd));
  const upstream = parseRemote(await runGit($, ["config", "--get", "remote.upstream.url"], cwd));

  let branch: string | null = null;
  let ahead = 0;
  let behind = 0;
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  let conflicts = 0;
  let changedPaths = 0;

  for (const line of status.split(/\r?\n/)) {
    if (line.startsWith("# branch.head ")) {
      branch = line.slice("# branch.head ".length).trim();
      if (branch === "(detached)") branch = null;
      continue;
    }
    if (line.startsWith("# branch.ab ")) {
      const m = line.match(/\+(\d+)\s+-(\d+)/);
      ahead = Number(m?.[1] ?? 0);
      behind = Number(m?.[2] ?? 0);
      continue;
    }
    if (line.startsWith("? ")) { untracked += 1; continue; }
    if (line.startsWith("u ")) { conflicts += 1; continue; }
    if (line.startsWith("1 ") || line.startsWith("2 ")) {
      changedPaths += 1;
      const xy = line.split(" ")[1] ?? "..";
      const i = xy[0] ?? ".";
      const w = xy[1] ?? ".";
      if (i !== ".") staged += 1;
      if (w !== ".") unstaged += 1;
    }
  }

  const diffShortstat = await runGit($, ["diff", "--shortstat", "HEAD"], cwd);
  const cachedShortstat = await runGit($, ["diff", "--cached", "--shortstat"], cwd);
  const insertions = Number(
    (diffShortstat ?? cachedShortstat ?? "")?.match(/(\d+)\s+insertions?\(\+\)/)?.[1] ?? 0,
  );
  const deletions = Number(
    (diffShortstat ?? cachedShortstat ?? "")?.match(/(\d+)\s+deletions?\(-\)/)?.[1] ?? 0,
  );

  return {
    available: true,
    cwd,
    branch,
    rootPath,
    rootName: rootPath ? pathBasename(rootPath) : null,
    sha: await runGit($, ["rev-parse", "--short", "HEAD"], cwd),
    staged,
    unstaged,
    untracked,
    conflicts,
    changes: changedPaths + untracked + conflicts,
    insertions,
    deletions,
    ahead,
    behind,
    origin,
    upstream,
    isFork: Boolean(
      origin?.owner && origin.repo && upstream?.owner && upstream.repo &&
        (origin.owner !== upstream.owner || origin.repo !== upstream.repo),
    ),
    worktreeMode: rootPath ? "primary" : null,
    worktreeName: rootPath ? pathBasename(rootPath) : null,
    worktreeBranch: branch,
    worktreeOriginalBranch: branch,
  };
}

// --- Account email via $.fs.read. ---
async function readAccountEmailMod($: $): Promise<string | null> {
  const home = await getHome($);
  if (!home) return null;
  const candidates = [`${home}/.claude.json`, `${home}/.claude/.credentials.json`];
  for (const path of candidates) {
    const text = await readText($, path);
    if (text === null) continue;
    try {
      const json: unknown = JSON.parse(text);
      const e = findEmail(json);
      if (e) return e;
    } catch { continue; }
  }
  return null;
}

function findEmail(value: unknown): string | null {
  if (typeof value === "string") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const m = findEmail(item);
      if (m) return m;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      const m = findEmail(entry);
      if (m) return m;
    }
  }
  return null;
}

// --- Compose everything. ---
async function buildRuntimeDataMod($: $): Promise<RuntimeData> {
  const cwd = await $.session.cwd().catch(() => "");
  const version = (await $.session.version().catch(() => ({ version: null }))).version ?? null;

  const session: SessionInfo = {
    sessionId: (await $.session.id().catch(() => null)) ?? null,
    version,
    outputStyle: null,
    vimMode: null,
    thinkingEffort: null,
    skills: [],
    accountEmail: await readAccountEmailMod($),
    startedAt: null,
    elapsedSeconds: null,
  };

  const tokens: TokenInfo = {
    input: null,
    output: null,
    cached: null,
    total: null,
    inputSpeed: null,
    outputSpeed: null,
    totalSpeed: null,
  };

  const usage: UsageWindowInfo = {
    fiveHourResetSeconds: null,
    sevenDayResetSeconds: null,
  };

  return {
    git: await parseGitInfoMod($, cwd || null),
    session,
    system: { terminalWidth: null, memoryUsedBytes: 0, memoryTotalBytes: 0 },
    tokens,
    usage,
  };
}

async function buildPayloadMod(
  $: $,
  transcriptPath: string | undefined,
  usage: { context: { tokens: number; window: number; percent: number | null }; cost: unknown } | null,
): Promise<StatusLinePayload> {
  // Mirror the legacy register.ts buildPayload: pull every field the widget
  // registry reads (cwd, model, cost, context_window, transcript_path,
  // git_branch) from $.session.* so mod and CLI see identical data.
  const [cwd, sessionId, model, versionInfo] = await Promise.all([
    $.session.cwd().catch(() => ""),
    $.session.id().catch(() => null),
    $.session.model().catch(() => ""),
    $.session.version().catch(() => ({ version: null })),
  ]);

  const context = usage?.context;
  const costRaw = usage?.cost;
  let cost: { total_cost_usd?: number } | undefined;
  if (typeof costRaw === "number") {
    cost = { total_cost_usd: costRaw };
  } else if (costRaw && typeof costRaw === "object") {
    const r = costRaw as Record<string, unknown>;
    const total =
      typeof r.total_cost_usd === "number"
        ? r.total_cost_usd
        : typeof r.totalCostUsd === "number"
          ? r.totalCostUsd
          : typeof r.usd === "number"
            ? r.usd
            : undefined;
    if (typeof total === "number") cost = { total_cost_usd: total };
  }

  const payload: StatusLinePayload = {
    cwd: typeof cwd === "string" && cwd.length > 0 ? cwd : undefined,
    session_id: typeof sessionId === "string" ? sessionId : undefined,
    version: versionInfo.version ?? undefined,
    model: typeof model === "string" && model.length > 0
      ? { id: model, display_name: model }
      : undefined,
    context_window: {
      used_percentage: context?.percent ?? null,
      context_window_size: context?.window ?? undefined,
    },
    transcript_path: transcriptPath,
  };
  if (cost) payload.cost = cost;
  return payload;
}

async function buildContextMod(
  $: $,
  transcriptPath: string | undefined,
  currentCacheRead: number,
): Promise<{
  payload: StatusLinePayload;
  cacheTTL: CacheTTLResult;
  cacheStats: CacheSessionStats;
  usageData: UsageData | null;
  headroomStats: HeadroomStats | null;
  runtime: RuntimeData;
}> {
  // Fetch usage once; pass it into both the payload builder (which needs
  // context + cost) and the cache TTL helper (which needs current cache_read).
  const usage = await $.session.usage().catch(() => null);

  const [cacheTTL, cacheStats, usageData, headroomStats, runtime, payload] = await Promise.all([
    getCacheTTLMod($, transcriptPath, currentCacheRead),
    getCacheSessionStatsMod($, transcriptPath),
    getUsageDataMod($),
    getHeadroomStatsMod($),
    buildRuntimeDataMod($),
    buildPayloadMod($, transcriptPath, usage),
  ]);
  return { payload, cacheTTL, cacheStats, usageData, headroomStats, runtime };
}

// ────────────────────────────────────────────────────────────────────────────
// Hooks
// ────────────────────────────────────────────────────────────────────────────

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    const r = await next(e);
    // Cache TTL countdown needs periodic redraw; hot-reload cancels the
    // timer; re-arm on every session.start.
    $.clock.every(15_000, () => $.ui.invalidate("ui.render"));
    return r;
  });

  // classic.SessionStart carries transcript_path (the native session API
  // intentionally does not expose it). Capture into $.state so cache reads
  // survive hot reloads (classic.SessionStart fires once per session).
  on("classic.SessionStart", async ($, e, next) => {
    const result = await next(e);
    if (typeof e.transcript_path === "string") {
      try { await $.state.set(TRANSCRIPT_REF, e.transcript_path); } catch { /* ignore */ }
    }
    $.clock.after(0, () => $.ui.invalidate("ui.render"));
    return result;
  }).catch((_$, _e, next) => {
    // Classic hooks have no chain beneath; a refusal of our own SessionStart
    // shouldn't block the engine's. Log and swallow.
    const msg = next && next.error && next.error.message ? next.error.message : "unknown";
    console.warn(`claude-statusline-widgets: classic.SessionStart failed: ${msg}`);
  });

  on("turn.complete", async ($, e, next) => {
    const r = await next(e);
    if (e.agentId === undefined) {
      $.clock.after(0, () => $.ui.invalidate("ui.render"));
    }
    return r;
  });

  on("session.measure", async ($, e, next) => {
    const r = await next(e);
    $.clock.after(0, () => $.ui.invalidate("ui.render"));
    return r;
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    // Compose with other mods' AbovePrompt content first.
    const below = await next(e).catch(() => null);

    // Yield to surveys; the engine handles them with its own drawing.
    if (e.props.hasSurvey) return below;

    const tree = await renderAbovePrompt($, e);
    if (tree === undefined) return below;

    const { Box } = $.ui.resolve(e);
    return (
      <Box key="stack" flexDirection="column">
        {below}
        {tree}
      </Box>
    );
  });
};

async function renderAbovePrompt(
  $: $,
  _e: RenderInput<"AbovePrompt">,
): Promise<RenderElement | undefined> {
  try {
    const transcriptPath = await getTranscriptPath($);
    // currentCacheRead is read from a small follow-up usage() so we don't pay
    // for the whole buildPayloadMod path just for one number — but in practice
    // buildContextMod also calls $.session.usage(). A future cleanup could
    // thread the count through to avoid the duplicate. Cost is negligible
    // because the engine caches the snapshot.
    const session = await $.session.usage().catch(() => null);
    const currentCacheRead = session?.context.tokens ?? 0;
    const [settings, ctx] = await Promise.all([
      loadSettingsMod($),
      buildContextMod($, transcriptPath, currentCacheRead),
    ]);
    // Wire git_branch from runtime into payload so BranchWidget has a value
    // even when the user hasn't set up git on the project.
    if (ctx.runtime.git.branch && !ctx.payload.git_branch) {
      ctx.payload.git_branch = ctx.runtime.git.branch;
    }
    const elements = $.ui.resolve(_e);
    return renderStatusLineElement(settings, ctx, elements);
  } catch (err) {
    $.ui.log(
      `claude-statusline-widgets: render failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { to: "debug" },
    );
    return undefined;
  }
}