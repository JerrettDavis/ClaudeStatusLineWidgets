import type { CacheTTLResult, CacheSessionStats } from "./cache-core.js";
import type { UsageData } from "./usage-core.js";
import type { HeadroomStats } from "./headroom-core.js";
import type { StyledToken } from "./widgets/types.js";

/** Build a single plain token (wrapped in an array). */
function t(text: string, style?: StyledToken["style"]): StyledToken[] {
  return [{ text, style }];
}

/** Pick a color for a percent value: green/yellow/red thresholds. */
function pctColor(pct: number): "green" | "yellow" | "red" {
  if (pct > 80) return "red";
  if (pct > 60) return "yellow";
  return "green";
}

/** Format local time from epoch ms as compact "h:mma" (e.g. "9:32p"). */
function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "p" : "a";
  hours = hours % 12 || 12;
  return `${hours}:${mins}${ampm}`;
}

/** Build a styled progress bar of N filled + M empty blocks. */
function barTokens(filled: number, empty: number, color: "green" | "yellow" | "red"): StyledToken[] {
  const blocks = "█".repeat(filled) + "░".repeat(empty);
  return [{ text: blocks, style: { color } }];
}

/**
 * Format cache expiry as a compact timestamp with color coding.
 *
 * Active:  ⛓️ @ 9:32p   (green/yellow/red by urgency, cyan for 1h tier)
 * Expired: ⛓️‍💥          (dim gray)
 */
export function formatCache(cache: CacheTTLResult): StyledToken[] | null {
  if (cache.tier === "none" && !cache.cacheReadActive) {
    return t("⛓️‍💥", { dim: true });
  }
  if (cache.remainingSeconds <= 0 || !cache.expiresAt) {
    return t("⛓️‍💥", { dim: true });
  }
  const timeStr = formatTime(cache.expiresAt);
  const label = `⛓️ @ ${timeStr}`;
  if (cache.tier === "1h") {
    return t(label, { color: "cyan" });
  }
  const color = pctColor(100 - Math.min(cache.remainingSeconds, 100));
  if (cache.remainingSeconds > 120) {
    return t(label, { color: "green" });
  }
  if (cache.remainingSeconds > 60) {
    return t(label, { color: "yellow" });
  }
  return t(label, { color: "red" });
}

/**
 * Format model display name. Passes through whatever Claude Code provides.
 */
export function formatModel(model: { id?: string; display_name?: string }): StyledToken[] | null {
  const v = model.display_name ?? model.id ?? "unknown";
  return t(v);
}

/**
 * Format session cost.
 */
export function formatCost(totalCostUsd: number | undefined): StyledToken[] | null {
  if (totalCostUsd === undefined || totalCostUsd === null) return t("$0.00");
  return t(`$${totalCostUsd.toFixed(2)}`);
}

/**
 * Format context window usage as a progress bar + percentage.
 * Bar is 8 characters wide using block elements.
 */
export function formatContext(usedPercentage: number | undefined | null): StyledToken[] | null {
  const pct = Math.max(0, Math.min(100, usedPercentage ?? 0));
  const barWidth = 8;
  const filled = Math.round((pct / 100) * barWidth);
  const empty = barWidth - filled;
  const color = pctColor(pct);
  return [...barTokens(filled, empty, color), ...t(` ${Math.round(pct)}%`)];
}

/**
 * Format the working directory path.
 */
export function formatPath(cwd: string | undefined): StyledToken[] | null {
  return cwd ? t(cwd) : null;
}

/**
 * Format the git branch name.
 */
export function formatBranch(branch: string | undefined): StyledToken[] | null {
  return branch ? t(branch) : null;
}

/**
 * Build a compact labeled progress bar: "label ████░░ N%"
 */
function miniBar(label: string, pct: number, barWidth: number = 5): StyledToken[] {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * barWidth);
  const empty = barWidth - filled;
  const color = pctColor(clamped);
  return [
    ...t(`${label} `),
    ...barTokens(filled, empty, color),
    ...t(` ${Math.round(clamped)}%`),
  ];
}

/**
 * Format usage rate limits and overage as individual segments.
 * Returns an array of segments (one per metric) so auto-wrap
 * can split them across lines independently.
 */
export function formatUsageSegments(data: UsageData | null): StyledToken[][] {
  if (!data) return [];

  const out: StyledToken[][] = [];

  if (data.five_hour?.utilization != null) {
    out.push(miniBar("5h", data.five_hour.utilization));
  }

  if (data.seven_day?.utilization != null) {
    out.push(miniBar("7d", data.seven_day.utilization));
  }

  if (data.extra_usage?.is_enabled && data.extra_usage.used_credits != null) {
    const used = `$${(data.extra_usage.used_credits / 100).toFixed(0)}`;
    const limit = data.extra_usage.monthly_limit != null
      ? `/$${(data.extra_usage.monthly_limit / 100).toFixed(0)}`
      : "";
    const pct = data.extra_usage.utilization ?? 0;
    out.push(miniBar(`+${used}${limit}`, pct));
  }

  return out;
}

/** Individual usage sub-formatters for widget system */
export function formatUsage5h(data: UsageData | null): StyledToken[] | null {
  if (data?.five_hour?.utilization == null) return null;
  return miniBar("5h", data.five_hour.utilization);
}

export function formatUsage7d(data: UsageData | null): StyledToken[] | null {
  if (data?.seven_day?.utilization == null) return null;
  return miniBar("7d", data.seven_day.utilization);
}

export function formatUsageOverage(data: UsageData | null): StyledToken[] | null {
  if (!data?.extra_usage?.is_enabled || data.extra_usage.used_credits == null) return null;
  const used = `$${(data.extra_usage.used_credits / 100).toFixed(0)}`;
  const limit = data.extra_usage.monthly_limit != null
    ? `/$${(data.extra_usage.monthly_limit / 100).toFixed(0)}`
    : "";
  const pct = data.extra_usage.utilization ?? 0;
  return miniBar(`+${used}${limit}`, pct);
}

/**
 * Format compact token count: 491425 → "491k", 1234567 → "1.2M"
 */
export function compactTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Format Headroom proxy stats as segments for line 3.
 * E.g. "Headroom: 34% compressed | 491k tokens saved | $0.12 saved"
 */
export function formatHeadroomSegments(stats: HeadroomStats | null): StyledToken[][] {
  if (!stats) return [];
  const out: StyledToken[][] = [];

  const totalSaved = stats.tokensSaved;
  if (totalSaved > 0) {
    out.push(t(`⚖️ ${compactTokens(totalSaved)} tokens saved`, { dim: true }));
  }

  if (stats.compressionPct > 0) {
    out.push(t(`${Math.round(stats.compressionPct)}% compressed`, { color: "green" }));
  }

  if (stats.costSavedUsd > 0) {
    out.push(t(`$${stats.costSavedUsd.toFixed(2)} saved`, { color: "green" }));
  }

  if (stats.cacheHitRate > 0) {
    out.push(t(`${Math.round(stats.cacheHitRate * 100)}% cache hit`, { dim: true }));
  }

  return out;
}

/** Individual headroom sub-formatters for widget system */
export function formatHeadroomTokens(stats: HeadroomStats | null): StyledToken[] | null {
  if (!stats || stats.tokensSaved <= 0) return null;
  return t(`⚖️ ${compactTokens(stats.tokensSaved)} tokens saved`, { dim: true });
}

export function formatHeadroomCompression(stats: HeadroomStats | null): StyledToken[] | null {
  if (!stats || stats.compressionPct <= 0) return null;
  return t(`${Math.round(stats.compressionPct)}% compressed`, { color: "green" });
}

export function formatHeadroomCost(stats: HeadroomStats | null): StyledToken[] | null {
  if (!stats || stats.costSavedUsd <= 0) return null;
  return t(`$${stats.costSavedUsd.toFixed(2)} saved`, { color: "green" });
}

export function formatHeadroomCacheHit(stats: HeadroomStats | null): StyledToken[] | null {
  if (!stats || stats.cacheHitRate <= 0) return null;
  return t(`${Math.round(stats.cacheHitRate * 100)}% cache hit`, { dim: true });
}

/**
 * Format local time from an ISO timestamp as compact "h:mma".
 */
function formatTimeFromISO(iso: string): string {
  return formatTime(new Date(iso).getTime());
}

/**
 * Format cache session stats: reads, writes, break count, last break time.
 *
 * A "large rewrite" indicator fires when the most recent break was ≥2× the
 * session average (signals a full context re-cache, e.g. after CLAUDE.md update).
 *
 * Returns null when there is no data yet.
 */
export function formatCacheStats(stats: CacheSessionStats): StyledToken[] | null {
  if (stats.breakCount === 0 && stats.totalReads === 0) return null;

  const parts: StyledToken[][] = [];
  if (stats.totalReads > 0) {
    parts.push(t(`↓${compactTokens(stats.totalReads)}`, { dim: true }));
  }
  if (stats.totalWrites > 0) {
    parts.push(t(`↑${compactTokens(stats.totalWrites)}`, { dim: true }));
  }
  if (stats.breakCount > 0) {
    const timeStr = stats.lastBreakTime ? ` ${formatTimeFromISO(stats.lastBreakTime)}` : "";
    const isLargeRewrite =
      stats.breakCount > 1 &&
      stats.lastBreakTokens >= stats.avgBreakTokens * 2;
    const countStr = `${stats.breakCount}↺`;
    parts.push(t(countStr + timeStr, isLargeRewrite ? { color: "yellow" } : { dim: true }));
  }
  if (parts.length === 0) return null;
  // Join with " " — preserve distinct tokens but render single visible string.
  const joined: StyledToken[] = [];
  parts.forEach((p, i) => {
    if (i > 0) joined.push(...t(" "));
    joined.push(...p);
  });
  return joined;
}