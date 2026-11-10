import { closeSync, openSync, readFileSync, readSync, readdirSync, statSync, fstatSync } from "fs";
import { join } from "path";
import { homedir } from "os";

type Json = Record<string, unknown>;

const TAIL_BYTES = 512 * 1024;

export const codexHome = (): string => process.env.CODEX_HOME ?? join(homedir(), ".codex");

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTail(path: string): string[] {
  let fd: number | null = null;
  try {
    fd = openSync(path, "r");
    const size = fstatSync(fd).size;
    const length = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, size - length);
    const lines = buf.toString("utf8").split("\n");
    if (size > length) lines.shift(); // first line is cut off mid-record
    return lines;
  } catch {
    return [];
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

/** Recent rollout files (newest first), looking only at the latest few day directories. */
export function recentRollouts(home = codexHome(), limit = 12): { path: string; mtimeMs: number }[] {
  const sessions = join(home, "sessions");
  const sorted = (dir: string) => {
    try {
      return readdirSync(dir).sort().reverse();
    } catch {
      return [];
    }
  };
  const out: { path: string; mtimeMs: number }[] = [];
  let days = 0;
  outer: for (const y of sorted(sessions)) {
    for (const m of sorted(join(sessions, y))) {
      for (const d of sorted(join(sessions, y, m))) {
        const dir = join(sessions, y, m, d);
        for (const name of sorted(dir)) {
          if (!name.startsWith("rollout-") || !name.endsWith(".jsonl")) continue;
          const path = join(dir, name);
          try {
            out.push({ path, mtimeMs: statSync(path).mtimeMs });
          } catch {
            // file vanished between listing and stat
          }
        }
        if (++days >= 3 || out.length >= limit * 4) break outer;
      }
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, limit);
}

interface Snapshot {
  tokenCount: Json | null;
  turnContext: Json | null;
}

function scan(lines: string[]): Snapshot {
  const snap: Snapshot = { tokenCount: null, turnContext: null };
  for (let i = lines.length - 1; i >= 0 && !(snap.tokenCount && snap.turnContext); i--) {
    const line = lines[i];
    if (!snap.tokenCount && line.includes('"token_count"')) {
      try {
        const rec = JSON.parse(line);
        if (rec?.payload?.type === "token_count" && isRecord(rec.payload)) snap.tokenCount = rec.payload;
      } catch {
        // partial line at the tail
      }
    } else if (!snap.turnContext && line.includes('"turn_context"')) {
      try {
        const rec = JSON.parse(line);
        if (rec?.type === "turn_context" && isRecord(rec.payload)) snap.turnContext = rec.payload;
      } catch {
        // partial line at the tail
      }
    }
  }
  return snap;
}

/** Top-level `key = "value"` from config.toml; the session log only names the model after the first turn. */
function configValue(home: string, key: string): string | undefined {
  try {
    const top = readFileSync(join(home, "config.toml"), "utf8").split(/\r?\n/);
    for (const line of top) {
      if (/^\s*\[/.test(line)) break; // only the root table
      const m = new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`).exec(line);
      if (m) return m[1];
    }
  } catch {
    // no config file
  }
  return undefined;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Build the statusline payload for an active Codex session from its rollout
 * file. Stock Codex does not push a snapshot to a status command, but it logs
 * token counts, rate limits and the turn context to the rollout as it goes.
 * `since` limits the session to files touched after the host launched; rate
 * limits are account-wide, so they may fall back to an older rollout.
 */
export function buildCodexPayload(since: number, home = codexHome(), cwd = process.cwd()): Json {
  const rollouts = recentRollouts(home);
  const active = rollouts.find((r) => r.mtimeMs >= since) ?? null;
  let snap = active ? scan(readTail(active.path)) : { tokenCount: null, turnContext: null };

  let rateLimits = isRecord(snap.tokenCount?.rate_limits) ? snap.tokenCount.rate_limits : null;
  if (!rateLimits) {
    for (const r of rollouts) {
      const older = scan(readTail(r.path)).tokenCount;
      if (isRecord(older?.rate_limits)) {
        rateLimits = older.rate_limits;
        break;
      }
    }
  }

  const info = isRecord(snap.tokenCount?.info) ? snap.tokenCount.info : null;
  const total = isRecord(info?.total_token_usage) ? info.total_token_usage : null;
  const last = isRecord(info?.last_token_usage) ? info.last_token_usage : null;
  const windowSize = num(info?.model_context_window);
  const lastTotal = num(last?.total_tokens);
  const ctx = snap.turnContext;
  const mode = isRecord(ctx?.collaboration_mode) ? ctx.collaboration_mode : null;
  const settings = isRecord(mode?.settings) ? mode.settings : null;
  const model = typeof ctx?.model === "string" ? ctx.model : configValue(home, "model");
  const effort = typeof settings?.reasoning_effort === "string"
    ? settings.reasoning_effort
    : ctx?.effort ?? configValue(home, "model_reasoning_effort");

  return {
    schema_version: 1,
    cwd: typeof ctx?.cwd === "string" ? ctx.cwd : cwd,
    model: model ? { id: model, display_name: model } : undefined,
    effort: typeof effort === "string" ? { level: effort } : undefined,
    context_window: {
      used_percentage: windowSize && lastTotal !== null ? Math.min(100, Math.round((lastTotal / windowSize) * 100)) : null,
      context_window_size: windowSize ?? undefined,
      total_input_tokens: num(total?.input_tokens) ?? undefined,
      total_output_tokens: num(total?.output_tokens) ?? undefined,
      cache_read_input_tokens: num(total?.cached_input_tokens) ?? undefined,
    },
    rate_limits: rateLimits ?? undefined,
    runtime: { state: active ? "active" : "idle" },
  };
}
