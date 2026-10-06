/**
 * One-time deprecation notice for users still invoking this CLI as a
 * `statusLine` command in their `~/.claude/settings.json`.
 *
 * The plugin is published as a native "mod" (function hooks module under
 * `hooks/statusline.tsx`) that draws into `AbovePrompt` directly. Hooks
 * users don't need this subprocess at all — Claude Code will render the
 * statusline through the mod when the plugin is enabled.
 *
 * When the CLI is invoked in piped mode (statusLine subprocess), print a
 * short migration hint to stderr. We cache a marker in the user's config
 * dir so the hint shows once per host, not once per redraw.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

const PLUGIN_NAME = "cache-ttl-statusline@claude-statusline-widgets";

const MIGRATION_HINT = [
  "",
  "[cache-ttl-statusline] You are running this CLI as a `statusLine` command.",
  "[cache-ttl-statusline] The plugin is now a native Claude Code mod — no subprocess needed.",
  `[cache-ttl-statusline] Migrate: \`/plugin enable ${PLUGIN_NAME}\`, then remove the`,
  "[cache-ttl-statusline] `statusLine` entry from ~/.claude/settings.json.",
  "",
].join("\n");

/**
 * Has the user already seen the migration hint on this account?
 * Stored under `~/.claude/.cache/cache-ttl-statusline-deprecation-notice`.
 */
function markerPath(): string {
  const dir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(dir, ".cache", "cache-ttl-statusline-deprecation-notice");
}

function hasBeenShown(): boolean {
  try {
    return existsSync(markerPath());
  } catch {
    return false;
  }
}

function markShown(): void {
  const path = markerPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, new Date().toISOString(), "utf-8");
  } catch {
    // best effort
  }
}

/**
 * Emit the migration hint to stderr if it hasn't been shown yet. Safe to
 * call repeatedly — at most one write per marker file.
 *
 * Returns true when the hint was actually written this invocation.
 */
export function emitDeprecationNotice(): boolean {
  if (hasBeenShown()) return false;
  process.stderr.write(MIGRATION_HINT);
  markShown();
  return true;
}

/**
 * Force-show the hint regardless of the marker. Used by `--check-deprecation`.
 */
export function forceShowDeprecation(): void {
  process.stderr.write(MIGRATION_HINT);
}