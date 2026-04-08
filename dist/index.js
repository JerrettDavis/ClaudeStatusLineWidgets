import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getCacheTTL, getCacheSessionStats } from "./cache.js";
import { readUsageCache, triggerBackgroundFetch, fetchAndCacheUsage } from "./usage.js";
import { isHeadroomActive, readHeadroomCache, triggerHeadroomFetch, fetchAndCacheHeadroom, } from "./headroom.js";
import { triggerSessionTracking, performSessionTracking } from "./session-tracking.js";
import { loadSettings } from "./config/loader.js";
import { renderStatusLine } from "./renderer.js";
import { loadExtensions } from "./widgets/registry.js";
const PLUGIN_KEY = "cache-ttl-statusline@claude-statusline-widgets";
/**
 * If the plugin was explicitly disabled in settings.json, remove the statusLine
 * entry we previously wrote and return true so the caller can exit cleanly.
 * This handles the case where the plugin is disabled but the statusLine command
 * is still set (hooks don't fire for disabled plugins, so this is the only
 * opportunity to self-clean).
 */
function removeStatusLineIfDisabled() {
    try {
        const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
        const settingsPath = join(claudeDir, "settings.json");
        if (!existsSync(settingsPath))
            return false;
        const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
        if (settings?.enabledPlugins?.[PLUGIN_KEY] !== false)
            return false;
        delete settings.statusLine;
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
        return true;
    }
    catch {
        return false;
    }
}
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
    if (process.argv.includes("--track-sessions")) {
        await performSessionTracking();
        return;
    }
    // Load any globally-installed extension widgets before rendering or TUI.
    await loadExtensions();
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
    // Self-clean if the plugin was disabled while the statusLine command was still set.
    // After this write, future sessions won't call us at all.
    if (removeStatusLineIfDisabled()) {
        process.stdout.write("\n");
        return;
    }
    // Kick off background fetches if caches are stale (non-blocking)
    triggerBackgroundFetch();
    if (isHeadroomActive())
        triggerHeadroomFetch();
    triggerSessionTracking();
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
