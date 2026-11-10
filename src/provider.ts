import type { Provider } from "./config/schema.js";
import { isProvider } from "./config/schema.js";
import type { UsageData, RateLimit } from "./usage-core.js";
import type { StatusLinePayload } from "./widgets/types.js";

export type { Provider } from "./config/schema.js";

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Decide which host is invoking the statusline. Precedence: `--provider <name>`
 * (or `--provider=<name>`), `CCFOOTER_PROVIDER`, then payload shape. Codex's
 * status_line_command snapshot carries `schema_version` plus `rate_limits`/`runtime`;
 * Claude Code's payload never does.
 */
export function detectProvider(
  payload: unknown,
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): Provider {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = arg === "--provider" ? argv[i + 1] : arg.startsWith("--provider=") ? arg.slice(11) : undefined;
    if (isProvider(value)) return value;
  }
  if (isProvider(env.CCFOOTER_PROVIDER)) return env.CCFOOTER_PROVIDER;
  if (isRecord(payload) && "schema_version" in payload && ("rate_limits" in payload || "runtime" in payload)) {
    return "codex";
  }
  return "claude";
}

function toResetIso(value: unknown): string | null {
  const n = num(value);
  if (n !== null) return new Date((n < 1e12 ? n * 1000 : n)).toISOString();
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function toRateLimit(window: Json): RateLimit {
  const resets = window.resets_at ?? window.reset_at ?? window.resets_at_unix;
  return {
    utilization: num(window.used_percentage) ?? num(window.used_percent),
    resets_at: toResetIso(resets),
  };
}

/** Pick the primary/secondary windows of every limit group into 5h and weekly slots by duration. */
export function codexUsage(payload: Json): UsageData {
  const usage: UsageData = {};
  const limits = payload.rate_limits;
  // Either one flat {primary, secondary} group (rollout files) or a map/array of groups.
  const groups = isRecord(limits)
    ? ("primary" in limits || "secondary" in limits ? [limits] : Object.values(limits))
    : Array.isArray(limits) ? limits : [];
  for (const group of groups) {
    if (!isRecord(group)) continue;
    for (const window of [group.primary, group.secondary]) {
      if (!isRecord(window)) continue;
      const minutes = num(window.window_minutes);
      if (minutes === null) continue;
      if (minutes >= 285 && minutes <= 315 && !usage.five_hour) usage.five_hour = toRateLimit(window);
      else if (minutes >= 9576 && minutes <= 10584 && !usage.seven_day) usage.seven_day = toRateLimit(window);
    }
  }
  return usage;
}

/**
 * Map Codex's status_line_command snapshot onto the Claude-shaped payload the
 * widgets read, and derive provider-local usage from its rate-limit windows so
 * Claude's OAuth usage is never shown inside Codex.
 */
export function normalizeCodexPayload(raw: Json): { payload: StatusLinePayload; usage: UsageData } {
  const payload = { ...raw } as StatusLinePayload & Json;
  const effort = raw.effort;
  if (isRecord(effort)) {
    payload.effort = typeof effort.level === "string" ? effort.level : undefined;
  }
  const micros = isRecord(raw.cost) ? num(raw.cost.estimated_thread_cost_usd_micros) : null;
  const existing = isRecord(raw.cost) ? num(raw.cost.total_cost_usd) : null;
  const cost = existing ?? (micros !== null && micros > 0 ? micros / 1_000_000 : null);
  payload.cost = cost !== null ? { total_cost_usd: cost } : undefined;
  if (!payload.session_id && typeof raw.thread_id === "string") payload.session_id = raw.thread_id;
  return { payload, usage: codexUsage(raw) };
}
