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
import { emitDeprecationNotice, forceShowDeprecation } from "./deprecation-notice.js";

const PLUGIN_KEY = "cache-ttl-statusline@claude-statusline-widgets";

/**
 * If the plugin status no longer requires the legacy `statusLine` entry,
 * remove it from settings.json and return true so the caller can exit cleanly.
 *
 * - Plugin explicitly disabled (`enabledPlugins[PLUGIN_KEY] === false`):
 *   hooks don't fire, so we must stop being the statusLine command.
 * - Plugin explicitly enabled: the native mod will draw the statusline
 *   into AbovePrompt. The statusLine command would render the *same*
 *   content on top of the mod's draw — wasteful and confusing. Strip it.
 *
 * `enabledPlugins` missing or `undefined` for this key is treated as
 * "not configured" — leave the settings alone; the user may be trialing.
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
    if (pluginState !== false && pluginState !== true) return false;

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
  if (process.argv.includes("--print-deprecation")) {
    forceShowDeprecation();
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

  // Piped mode: render statusline. This is the legacy statusLine command
  // path — emit a one-time migration hint to stderr so users still wired
  // through `~/.claude/settings.json` learn about the native mod.
  emitDeprecationNotice();

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

  // Self-clean: if the plugin is now enabled, the mod draws AbovePrompt
  // and we don't need the legacy statusLine subprocess. If the plugin is
  // explicitly disabled, hooks don't fire and we can't keep drawing. Either
  // way, strip the statusLine entry so future sessions stop calling us.
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