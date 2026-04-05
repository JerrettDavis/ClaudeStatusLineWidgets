import { green, yellow, red, cyan, dim } from "./colors.js";
import type { CacheTTLResult } from "./cache.js";

/**
 * Format local time from epoch ms as "h:mm AM/PM".
 */
function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${mins} ${ampm}`;
}

/**
 * Format cache TTL as an expiration time with color coding.
 *
 * States:
 *   ◆ Cache til 9:32 PM   (green, >2min remaining)
 *   ◆ Cache til 9:30 PM   (yellow, 1-2min)
 *   ◆ Cache til 9:29 PM   (red, <1min)
 *   ○ Cache expired        (dim gray)
 *   ◇ Cache til 10:28 PM  (cyan, 1h tier)
 */
export function formatCache(cache: CacheTTLResult): string {
  if (cache.tier === "none" && !cache.cacheReadActive) {
    return dim("○ No cache");
  }

  if (cache.remainingSeconds <= 0 || !cache.expiresAt) {
    return dim("○ Cache expired");
  }

  const timeStr = formatTime(cache.expiresAt);

  if (cache.tier === "1h") {
    return cyan(`◇ Cache til ${timeStr}`);
  }

  if (cache.remainingSeconds > 120) {
    return green(`◆ Cache til ${timeStr}`);
  }
  if (cache.remainingSeconds > 60) {
    return yellow(`◆ Cache til ${timeStr}`);
  }
  return red(`◆ Cache til ${timeStr}`);
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
