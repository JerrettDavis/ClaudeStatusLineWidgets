import { getCacheTTL, getCacheSessionStats } from "./cache.js";
import { readUsageCache, triggerBackgroundFetch, fetchAndCacheUsage } from "./usage.js";
import { isHeadroomActive, readHeadroomCache, triggerHeadroomFetch, fetchAndCacheHeadroom, } from "./headroom.js";
import { loadSettings } from "./config/loader.js";
import { renderStatusLine } from "./renderer.js";
function readStdin() {
    return new Promise((resolve, reject) => {
        const chunks = [];
        process.stdin.on("data", (chunk) => chunks.push(chunk));
        process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        process.stdin.on("error", reject);
        setTimeout(() => resolve(Buffer.concat(chunks).toString("utf-8")), 1000);
    });
}
async function main() {
    // Background fetch modes: called by detached children
    if (process.argv.includes("--fetch-usage")) {
        await fetchAndCacheUsage();
        return;
    }
    if (process.argv.includes("--fetch-headroom")) {
        await fetchAndCacheHeadroom();
        return;
    }
    // TTY mode: launch interactive TUI for configuration
    if (process.stdin.isTTY) {
        const { runTUI } = await import("./tui/index.js");
        await runTUI();
        return;
    }
    // Piped mode: render statusline
    const input = await readStdin();
    if (!input.trim()) {
        process.stdout.write("\n");
        return;
    }
    let payload;
    try {
        payload = JSON.parse(input);
    }
    catch {
        process.stdout.write("\n");
        return;
    }
    // Kick off background fetches if caches are stale (non-blocking)
    triggerBackgroundFetch();
    if (isHeadroomActive())
        triggerHeadroomFetch();
    const cacheRead = payload.context_window?.current_usage?.cache_read_input_tokens ?? 0;
    const cacheTTL = getCacheTTL(payload.transcript_path, cacheRead);
    const cacheStats = getCacheSessionStats(payload.transcript_path);
    const usageCache = readUsageCache();
    const headroomCache = isHeadroomActive() ? readHeadroomCache() : null;
    const settings = loadSettings();
    const context = {
        payload,
        cacheTTL,
        cacheStats,
        usageData: usageCache?.data ?? null,
        headroomStats: headroomCache?.data ?? null,
    };
    const output = renderStatusLine(settings, context);
    process.stdout.write(output + "\n\n");
}
main().catch(() => {
    process.stdout.write("\n");
});
