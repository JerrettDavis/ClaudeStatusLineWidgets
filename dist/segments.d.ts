import type { CacheTTLResult, CacheSessionStats } from "./cache.js";
import type { UsageData } from "./usage.js";
import type { HeadroomStats } from "./headroom.js";
/**
 * Format cache expiry as a compact timestamp with color coding.
 *
 * Active:  ⛓️ @ 9:32p   (green/yellow/red by urgency, cyan for 1h tier)
 * Expired: ⛓️‍💥          (dim gray)
 */
export declare function formatCache(cache: CacheTTLResult): string;
/**
 * Format model display name. Passes through whatever Claude Code provides.
 */
export declare function formatModel(model: {
    id?: string;
    display_name?: string;
}): string;
/**
 * Format session cost.
 */
export declare function formatCost(totalCostUsd: number | undefined): string;
/**
 * Format context window usage as a progress bar + percentage.
 * Bar is 8 characters wide using block elements.
 */
export declare function formatContext(usedPercentage: number | undefined | null): string;
/**
 * Format the working directory path.
 */
export declare function formatPath(cwd: string | undefined): string | null;
/**
 * Format the git branch name.
 */
export declare function formatBranch(branch: string | undefined): string | null;
/**
 * Format usage rate limits and overage as individual segments.
 * Returns an array of segments (one per metric) so auto-wrap
 * can split them across lines independently.
 */
export declare function formatUsageSegments(data: UsageData | null): string[];
/** Individual usage sub-formatters for widget system */
export declare function formatUsage5h(data: UsageData | null): string | null;
export declare function formatUsage7d(data: UsageData | null): string | null;
export declare function formatUsageOverage(data: UsageData | null): string | null;
/**
 * Format compact token count: 491425 → "491k", 1234567 → "1.2M"
 */
export declare function compactTokens(n: number): string;
/**
 * Format Headroom proxy stats as segments for line 3.
 * E.g. "Headroom: 34% compressed | 491k tokens saved | $0.12 saved"
 */
export declare function formatHeadroomSegments(stats: HeadroomStats | null): string[];
/** Individual headroom sub-formatters for widget system */
export declare function formatHeadroomTokens(stats: HeadroomStats | null): string | null;
export declare function formatHeadroomCompression(stats: HeadroomStats | null): string | null;
export declare function formatHeadroomCost(stats: HeadroomStats | null): string | null;
export declare function formatHeadroomCacheHit(stats: HeadroomStats | null): string | null;
/**
 * Format cache session stats: reads, writes, break count, last break time.
 *
 * A "large rewrite" indicator fires when the most recent break was ≥2× the
 * session average (signals a full context re-cache, e.g. after CLAUDE.md update).
 *
 * Returns null when there is no data yet.
 */
export declare function formatCacheStats(stats: CacheSessionStats): string | null;
