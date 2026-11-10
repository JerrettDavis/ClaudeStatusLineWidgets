import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getCacheTTL, getCacheSessionStats } from "./cache.js";
import { readUsageCache, triggerBackgroundFetch, fetchAndCacheUsage } from "./usage.js";
import {
  isHeadroomActive, readHeadroomCache, triggerHeadroomFetch, fetchAndCacheHeadroom,
} from "./headroom.js";
import { triggerSessionTracking, performSessionTracking } from "./session-tracking.js";
import { loadSettings } from "./config/loader.js";
import { renderStatusLine } from "./renderer.js";
import { loadExtensions } from "./extensions/register-cli.js";
import type { StatusLinePayload, RenderContext } from "./widgets/types.js";
import { buildRuntimeData } from "./runtime.js";
import { detectProvider, normalizeCodexPayload } from "./provider.js";
import { resolveSettings, isProvider } from "./config/schema.js";
import type { Settings } from "./config/schema.js";
import { readInstallMode, shouldStripStatusLine } from "./self-clean.js";

const PLUGIN_KEY = "cache-ttl-statusline@claude-statusline-widgets";

/**
 * Remove the legacy `statusLine` entry from settings.json when the install mode
 * and plugin state say it shouldn't be there (see shouldStripStatusLine).
 * Returns true if it did, so the caller can exit cleanly.
 */
function removeStatusLineIfMigrated(): boolean {
  try {
    const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
    const settingsPath = join(claudeDir, "settings.json");

    // Read directly without a preceding existsSync to avoid a TOCTOU race
    // between the existence check and the file read (js/file-system-race).
    let settings: any;
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      return false; // file absent or unreadable
    }

    const pluginState = settings?.enabledPlugins?.[PLUGIN_KEY];
    const pluginEnabled = typeof pluginState === "boolean" ? pluginState : undefined;
    if (!shouldStripStatusLine(readInstallMode(), pluginEnabled)) return false;

    if (!settings.statusLine) return false;

    delete settings.statusLine;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
    setTimeout(() => resolve(Buffer.concat(chunks).toString("utf-8")), 1000);
  });
}

function buildClaudeContext(payload: StatusLinePayload, settings: Settings): RenderContext {
  // Kick off background fetches if caches are stale (non-blocking)
  triggerBackgroundFetch();
  triggerHeadroomFetch();
  triggerSessionTracking();

  const cacheRead = payload.context_window?.current_usage?.cache_read_input_tokens ?? 0;
  const usageCache = readUsageCache();
  const headroomCache = isHeadroomActive() ? readHeadroomCache() : null;
  return {
    provider: "claude",
    payload,
    cacheTTL: getCacheTTL(payload.transcript_path, cacheRead),
    cacheStats: getCacheSessionStats(payload.transcript_path),
    usageData: usageCache?.data ?? null,
    headroomStats: headroomCache?.data ?? null,
    runtime: buildRuntimeData(payload, usageCache?.data ?? null),
    displayMode: settings.minimalistMode ? "minimal" : "normal",
  };
}

// Codex has no Claude transcript, OAuth usage, or session tracking: usage comes
// only from the rate limits Codex puts in its own payload.
function buildCodexContext(raw: StatusLinePayload, settings: Settings): RenderContext {
  const { payload, usage } = normalizeCodexPayload(raw as Record<string, unknown>);
  const usageData = usage.five_hour || usage.seven_day ? usage : null;
  const headroomCache = isHeadroomActive() ? readHeadroomCache() : null;
  triggerHeadroomFetch();
  return {
    provider: "codex",
    payload,
    cacheTTL: getCacheTTL(undefined, 0),
    cacheStats: getCacheSessionStats(undefined),
    usageData,
    headroomStats: headroomCache?.data ?? null,
    runtime: buildRuntimeData(payload, usageData),
    displayMode: settings.minimalistMode ? "minimal" : "normal",
  };
}

async function main(): Promise<void> {
  // Background fetch modes: called by detached children
  if (process.argv.includes("--fetch-usage")) {
    await fetchAndCacheUsage();
    return;
  }
  if (process.argv.includes("--fetch-headroom")) {
    await fetchAndCacheHeadroom();
    return;
  }
  if (process.argv.includes("--track-sessions")) {
    await performSessionTracking();
    return;
  }
  // Stock Codex cannot run a status command: host it in a PTY and draw the footer ourselves.
  const runIdx = process.argv.indexOf("--codex-run");
  if (runIdx >= 0) {
    const sep = process.argv.indexOf("--", runIdx);
    const { runCodexHost } = await import("./codex-host.js");
    process.exitCode = await runCodexHost(sep >= 0 ? process.argv.slice(sep + 1) : []);
    return;
  }

  // Load any globally-installed extension widgets before rendering or TUI.
  await loadExtensions();

  // TTY mode: launch interactive TUI for configuration
  if (process.stdin.isTTY) {
    const { runTUI } = await import("./tui/index.js");
    // `--provider <name>` edits that provider's layout override; default edits the global layout.
    const flag = process.argv.findIndex((a) => a === "--provider" || a.startsWith("--provider="));
    const flagValue = flag < 0 ? undefined
      : process.argv[flag].includes("=") ? process.argv[flag].slice(11) : process.argv[flag + 1];
    const scope = isProvider(flagValue) ? flagValue : null;
    await runTUI(scope);
    return;
  }

  // Piped mode: render statusline (the `hook` install mode's statusLine command).

  const input = await readStdin();
  if (!input.trim()) {
    process.stdout.write("\n");
    return;
  }

  let payload: StatusLinePayload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.stdout.write("\n");
    return;
  }

  const provider = detectProvider(payload);

  // Self-clean edits Claude's settings.json, so it only applies to Claude Code.
  if (provider === "claude" && removeStatusLineIfMigrated()) {
    process.stdout.write("\n");
    return;
  }

  const settings = resolveSettings(loadSettings(), provider);
  const context = provider === "codex"
    ? buildCodexContext(payload, settings)
    : buildClaudeContext(payload, settings);
  const output = renderStatusLine(settings, context);
  process.stdout.write(output + "\n\n");
}

main().catch((err) => {
  process.stderr.write("[ccfooter-config] " + (err?.message ?? String(err)) + "\n");
  process.stdout.write("\n");
});