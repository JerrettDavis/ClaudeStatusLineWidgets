import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getCacheTTL, getCacheSessionStats } from "./cache.js";
import { readUsageCache, triggerBackgroundFetch, fetchAndCacheUsage } from "./usage.js";
import {
  isHeadroomActive, readHeadroomCache, triggerHeadroomFetch, fetchAndCacheHeadroom,
} from "./headroom.js";
import { triggerSessionTracking, performSessionTracking } from "./session-tracking.js";
import { loadSettings } from "./config/loader.js";
import { renderStatusLine } from "./renderer.js";
import { loadExtensions } from "./extensions/register-cli.js";
import type { StatusLinePayload, RenderContext } from "./widgets/types.js";
import { buildRuntimeData } from "./runtime.js";
import { readInstallMode, shouldStripStatusLine } from "./self-clean.js";

const PLUGIN_KEY = "cache-ttl-statusline@claude-statusline-widgets";

/**
 * Remove the legacy `statusLine` entry from settings.json when the install mode
 * and plugin state say it shouldn't be there (see shouldStripStatusLine).
 * Returns true if it did, so the caller can exit cleanly.
 */
function removeStatusLineIfMigrated(): boolean {
  try {
    const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
    const settingsPath = join(claudeDir, "settings.json");

    // Read directly without a preceding existsSync to avoid a TOCTOU race
    // between the existence check and the file read (js/file-system-race).
    let settings: any;
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      return false; // file absent or unreadable
    }

    const pluginState = settings?.enabledPlugins?.[PLUGIN_KEY];
    const pluginEnabled = typeof pluginState === "boolean" ? pluginState : undefined;
    if (!shouldStripStatusLine(readInstallMode(), pluginEnabled)) return false;

    if (!settings.statusLine) return false;

    delete settings.statusLine;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
    setTimeout(() => resolve(Buffer.concat(chunks).toString("utf-8")), 1000);
  });
}

async function main(): Promise<void> {
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

  // Piped mode: render statusline (the `hook` install mode's statusLine command).

  const input = await readStdin();
  if (!input.trim()) {
    process.stdout.write("\n");
    return;
  }

  let payload: StatusLinePayload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.stdout.write("\n");
    return;
  }

  // Self-clean: in mod mode the Mod draws the line, and a disabled plugin can't
  // re-add its entry, so strip the statusLine entry. Hook mode keeps it.
  if (removeStatusLineIfMigrated()) {
    process.stdout.write("\n");
    return;
  }

  // Kick off background fetches if caches are stale (non-blocking)
  triggerBackgroundFetch();
  triggerHeadroomFetch();
  triggerSessionTracking();

  const cacheRead = payload.context_window?.current_usage?.cache_read_input_tokens ?? 0;
  const cacheTTL = getCacheTTL(payload.transcript_path, cacheRead);
  const cacheStats = getCacheSessionStats(payload.transcript_path);
  const usageCache = readUsageCache();
  const headroomCache = isHeadroomActive() ? readHeadroomCache() : null;

  const settings = loadSettings();
  const context: RenderContext = {
    payload,
    cacheTTL,
    cacheStats,
    usageData: usageCache?.data ?? null,
    headroomStats: headroomCache?.data ?? null,
    runtime: buildRuntimeData(payload, usageCache?.data ?? null),
    displayMode: settings.minimalistMode ? "minimal" : "normal",
  };

  const output = renderStatusLine(settings, context);
  process.stdout.write(output + "\n\n");
}

main().catch((err) => {
  process.stderr.write("[ccfooter-config] " + (err?.message ?? String(err)) + "\n");
  process.stdout.write("\n");
});