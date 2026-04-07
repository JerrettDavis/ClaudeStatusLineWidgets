#!/usr/bin/env node
// Runs on every SessionStart via hooks/hooks.json.
// Writes the correct statusLine command into ~/.claude/settings.json,
// pointing at this plugin version's dist/index.js.
// Only writes if the value has changed, to avoid unnecessary file churn.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const pluginRoot = process.argv[2];
if (!pluginRoot) {
  process.stderr.write("[configure-statusline] No plugin root provided — skipping.\n");
  process.exit(0);
}

const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
const settingsPath = join(claudeDir, "settings.json");
if (!existsSync(settingsPath)) process.exit(0);

let settings;
try {
  settings = JSON.parse(readFileSync(settingsPath, "utf8"));
} catch {
  process.exit(0);
}

// Normalize to forward slashes — Claude Code provides CLAUDE_PLUGIN_ROOT with
// forward slashes, but guard against backslashes if called from other contexts.
const root = pluginRoot.replace(/\\/g, "/");
const command = `node "${root}/dist/index.js"`;

if (settings?.statusLine?.command === command) process.exit(0);

settings.statusLine = { ...settings.statusLine, type: "command", command };

try {
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
} catch {
  // Non-fatal — worst case the user sees the old statusline until next restart.
  process.exit(0);
}
