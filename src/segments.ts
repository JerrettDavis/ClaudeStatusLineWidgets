import { green, yellow, red, cyan, dim } from "./colors.js";
import type { CacheTTLResult } from "./cache.js";

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
 * Format model as compact "name[ctx]" string.
 * E.g. "opus-4.6[1m]", "sonnet[200k]"
 *
 * Derives a short name from the model ID (e.g. "claude-opus-4-6" → "opus-4.6"),
 * falling back to display_name if no ID. Appends context window size in brackets.
 */
export function formatModel(
  model: { id?: string; display_name?: string },
  contextWindowSize: number | undefined
): string {
  let name: string;
  if (model.id) {
    // "claude-opus-4-6" → "opus-4.6", "claude-sonnet-4-5-20251001" → "sonnet-4.5"
    name = model.id
      .replace(/^claude-/, "")
      .replace(/-(\d{8,})$/, "")           // strip date suffix
      .replace(/-(\d+)-(\d+)$/, "-$1.$2"); // "4-6" → "4.6"
  } else {
    name = (model.display_name ?? "unknown").toLowerCase();
  }

  if (!contextWindowSize) return name;
  const ctx = contextWindowSize >= 1_000_000
    ? `${Math.round(contextWindowSize / 1_000_000)}m`
    : `${Math.round(contextWindowSize / 1_000)}k`;
  return `${name} ${ctx}`;
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
