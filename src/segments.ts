import { green, yellow, red, cyan, dim, bold } from "./colors.js";
import type { CacheTTLResult } from "./cache.js";

/**
 * Format cache TTL as a countdown with color coding.
 *
 * States:
 *   ◆ Cache 3:42    (green, >2min remaining)
 *   ◆ Cache 1:30    (yellow, 1-2min)
 *   ◆ Cache 0:42    (red, <1min)
 *   ○ Cache expired  (dim gray)
 *   ◇ Cache 45:12   (cyan, 1h tier)
 */
export function formatCache(cache: CacheTTLResult): string {
  if (cache.tier === "none" && !cache.cacheReadActive) {
    return dim("○ No cache");
  }

  if (cache.remainingSeconds <= 0) {
    return dim("○ Cache expired");
  }

  const mins = Math.floor(cache.remainingSeconds / 60);
  const secs = cache.remainingSeconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  if (cache.tier === "1h") {
    return cyan(`◇ Cache ${timeStr}`);
  }

  if (cache.remainingSeconds > 120) {
    return green(`◆ Cache ${timeStr}`);
  }
  if (cache.remainingSeconds > 60) {
    return yellow(`◆ Cache ${timeStr}`);
  }
  return red(`◆ Cache ${timeStr}`);
}

/**
 * Format model display name.
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
export function formatContext(
  usedPercentage: number | undefined | null,
  contextWindowSize: number | undefined
): string {
  const pct = usedPercentage ?? 0;
  const barWidth = 8;
  const filled = Math.round((pct / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  let colorFn = green;
  if (pct > 80) colorFn = red;
  else if (pct > 60) colorFn = yellow;

  return `${colorFn(bar)} ${Math.round(pct)}%`;
}
