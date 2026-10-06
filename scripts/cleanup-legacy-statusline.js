#!/usr/bin/env node
// One-shot migration, run by the Mod on session start.
// Earlier releases wrote a `statusLine` command into settings.json. The native
// Mod now owns the status line, so remove that entry — but only when it points
// at this plugin's renderer, never a user's own status line.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
const settingsPath = join(claudeDir, "settings.json");

let settings;
try {
  settings = JSON.parse(readFileSync(settingsPath, "utf8"));
} catch {
  process.exit(0);
}

const command = settings?.statusLine?.command;
const isOurs =
  typeof command === "string" &&
  /dist[\/]index\.js/.test(command) &&
  /(cache-ttl-statusline|claude-statusline-widgets|ClaudeStatusLineWidgets)/i.test(command);

if (!isOurs) process.exit(0);

delete settings.statusLine;
try {
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
} catch {
  // Non-fatal: the Mod still renders; the stale entry is harmless to retry next session.
}
