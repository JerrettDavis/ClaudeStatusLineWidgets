import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export type InstallMode = "hook" | "mod";

/**
 * Active install mode. Mirrors getMode() in scripts/mode.js (env override, then
 * the persisted mode.json, default "hook"); that script is plain JS outside
 * this package's rootDir, so the few lines are repeated here.
 */
export function readInstallMode(): InstallMode {
  const env = process.env.CCFOOTER_MODE;
  if (env === "hook" || env === "mod") return env;
  try {
    const file = join(homedir(), ".config", "claude-statusline-widgets", "mode.json");
    const mode = JSON.parse(readFileSync(file, "utf8"))?.mode;
    if (mode === "hook" || mode === "mod") return mode;
  } catch {
    // Absent or unreadable: fall through to the default.
  }
  return "hook";
}

/**
 * Should the classic statusLine command remove its own settings.json entry?
 *
 * - mod mode: the Mod draws the line, so the entry is redundant.
 * - hook mode: the entry is the whole point while the plugin is enabled; only a
 *   disabled plugin (its hooks can't re-add the entry) justifies removing it.
 * - plugin state unset: the user may be trialing it; leave settings alone.
 */
export function shouldStripStatusLine(mode: InstallMode, pluginEnabled: boolean | undefined): boolean {
  if (pluginEnabled === undefined) return false;
  return mode === "mod" || pluginEnabled === false;
}
