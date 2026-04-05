import { green, yellow, red, cyan, dim } from "./colors.js";
import type { CacheTTLResult } from "./cache.js";
import type { UsageData } from "./usage.js";

/**
 * Format local time from epoch ms as compact "h:mma" (e.g. "9:32p").
 */
function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "p" : "a";
  hours = hours % 12 || 12;
  return `${hours}:${mins}${ampm}`;
}

/**
 * Format cache expiry as a compact timestamp with color coding.
 *
 * Active:  ⛓️ @ 9:32p   (green/yellow/red by urgency, cyan for 1h tier)
 * Expired: ⛓️‍💥          (dim gray)
 */
export function formatCache(cache: CacheTTLResult): string {
  if (cache.tier === "none" && !cache.cacheReadActive) {
    return dim("\u26D3\uFE0F\u200D\uD83D\uDCA5");
  }

  if (cache.remainingSeconds <= 0 || !cache.expiresAt) {
    return dim("\u26D3\uFE0F\u200D\uD83D\uDCA5");
  }

  const timeStr = formatTime(cache.expiresAt);
  const label = `\u26D3\uFE0F @ ${timeStr}`;

  if (cache.tier === "1h") {
    return cyan(label);
  }
  if (cache.remainingSeconds > 120) {
    return green(label);
  }
  if (cache.remainingSeconds > 60) {
    return yellow(label);
  }
  return red(label);
}

/**
 * Format model display name. Passes through whatever Claude Code provides.
 */
export function formatModel(model: { id?: string; display_name?: string }): string {
  return model.display_name ?? model.id ?? "unknown";
}

/**
 * Format session cost.
 */
export function formatCost(totalCostUsd: number | undefined): string {
  if (totalCostUsd === undefined || totalCostUsd === null) return "$0.00";
  return `$${totalCostUsd.toFixed(2)}`;
}

/**
 * Format context window usage as a progress bar + percentage.
 * Bar is 8 characters wide using block elements.
 */
export function formatContext(usedPercentage: number | undefined | null): string {
  const pct = usedPercentage ?? 0;
  const barWidth = 8;
  const filled = Math.round((pct / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);

  let colorFn = green;
  if (pct > 80) colorFn = red;
  else if (pct > 60) colorFn = yellow;

  return `${colorFn(bar)} ${Math.round(pct)}%`;
}

/**
 * Format the working directory path.
 */
export function formatPath(cwd: string | undefined): string | null {
  return cwd ?? null;
}

/**
 * Format the git branch name.
 */
export function formatBranch(branch: string | undefined): string | null {
  return branch ?? null;
}

/**
 * Format usage limits as compact string.
 * E.g. "5h:45% 7d:72%" or "5h:45% 7d:72% +$3.50/$20"
 */
export function formatUsage(data: UsageData | null): string | null {
  if (!data) return null;

  const parts: string[] = [];

  if (data.five_hour?.utilization != null) {
    const pct = Math.round(data.five_hour.utilization);
    const colorFn = pct > 80 ? red : pct > 60 ? yellow : dim;
    parts.push(colorFn(`5h:${pct}%`));
  }

  if (data.seven_day?.utilization != null) {
    const pct = Math.round(data.seven_day.utilization);
    const colorFn = pct > 80 ? red : pct > 60 ? yellow : dim;
    parts.push(colorFn(`7d:${pct}%`));
  }

  if (data.extra_usage?.is_enabled && data.extra_usage.used_credits != null) {
    const used = (data.extra_usage.used_credits / 100).toFixed(2);
    const limit = data.extra_usage.monthly_limit != null
      ? `/$${(data.extra_usage.monthly_limit / 100).toFixed(0)}`
      : "";
    const pct = data.extra_usage.utilization ?? 0;
    const colorFn = pct > 80 ? red : pct > 50 ? yellow : dim;
    parts.push(colorFn(`+$${used}${limit}`));
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
