import { green, yellow, red, cyan, dim } from "./colors.js";
/**
 * Format local time from epoch ms as compact "h:mma" (e.g. "9:32p").
 */
function formatTime(epochMs) {
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
export function formatCache(cache) {
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
export function formatModel(model) {
    return model.display_name ?? model.id ?? "unknown";
}
/**
 * Format session cost.
 */
export function formatCost(totalCostUsd) {
    if (totalCostUsd === undefined || totalCostUsd === null)
        return "$0.00";
    return `$${totalCostUsd.toFixed(2)}`;
}
/**
 * Format context window usage as a progress bar + percentage.
 * Bar is 8 characters wide using block elements.
 */
export function formatContext(usedPercentage) {
    const pct = usedPercentage ?? 0;
    const barWidth = 8;
    const filled = Math.round((pct / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    let colorFn = green;
    if (pct > 80)
        colorFn = red;
    else if (pct > 60)
        colorFn = yellow;
    return `${colorFn(bar)} ${Math.round(pct)}%`;
}
/**
 * Format the working directory path.
 */
export function formatPath(cwd) {
    return cwd ?? null;
}
/**
 * Format the git branch name.
 */
export function formatBranch(branch) {
    return branch || null;
}
/**
 * Build a compact labeled progress bar: "label ████░░ N%"
 */
function miniBar(label, pct, barWidth = 5) {
    const clamped = Math.max(0, Math.min(100, pct));
    const filled = Math.round((clamped / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    const colorFn = clamped > 80 ? red : clamped > 60 ? yellow : green;
    return `${label} ${colorFn(bar)} ${Math.round(clamped)}%`;
}
/**
 * Format usage rate limits and overage as individual segments.
 * Returns an array of segments (one per metric) so auto-wrap
 * can split them across lines independently.
 */
export function formatUsageSegments(data) {
    if (!data)
        return [];
    const out = [];
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
export function formatUsage5h(data) {
    if (!data?.five_hour?.utilization)
        return null;
    return miniBar("5h", data.five_hour.utilization);
}
export function formatUsage7d(data) {
    if (!data?.seven_day?.utilization)
        return null;
    return miniBar("7d", data.seven_day.utilization);
}
export function formatUsageOverage(data) {
    if (!data?.extra_usage?.is_enabled || data.extra_usage.used_credits == null)
        return null;
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
function compactTokens(n) {
    if (n >= 1_000_000)
        return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)
        return `${Math.round(n / 1_000)}k`;
    return String(n);
}
/**
 * Format Headroom proxy stats as segments for line 3.
 * E.g. "Headroom: 34% compressed | 491k tokens saved | $0.12 saved"
 */
export function formatHeadroomSegments(stats) {
    if (!stats)
        return [];
    const out = [];
    const totalSaved = stats.tokensSaved;
    if (totalSaved > 0) {
        out.push(dim(`\u2696\uFE0F ${compactTokens(totalSaved)} tokens saved`));
    }
    if (stats.compressionPct > 0) {
        out.push(green(`${Math.round(stats.compressionPct)}% compressed`));
    }
    if (stats.costSavedUsd > 0) {
        out.push(green(`$${stats.costSavedUsd.toFixed(2)} saved`));
    }
    if (stats.cacheHitRate > 0) {
        out.push(dim(`${Math.round(stats.cacheHitRate * 100)}% cache hit`));
    }
    return out;
}
/** Individual headroom sub-formatters for widget system */
export function formatHeadroomTokens(stats) {
    if (!stats || stats.tokensSaved <= 0)
        return null;
    return dim(`\u2696\uFE0F ${compactTokens(stats.tokensSaved)} tokens saved`);
}
export function formatHeadroomCompression(stats) {
    if (!stats || stats.compressionPct <= 0)
        return null;
    return green(`${Math.round(stats.compressionPct)}% compressed`);
}
export function formatHeadroomCost(stats) {
    if (!stats || stats.costSavedUsd <= 0)
        return null;
    return green(`$${stats.costSavedUsd.toFixed(2)} saved`);
}
export function formatHeadroomCacheHit(stats) {
    if (!stats || stats.cacheHitRate <= 0)
        return null;
    return dim(`${Math.round(stats.cacheHitRate * 100)}% cache hit`);
}
