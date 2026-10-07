#!/usr/bin/env node
// Install-mode switch shared by every entry point.
//
//   hook  classic `statusLine` command in settings.json: full ANSI colour and
//         every row, drawn below the prompt (the default).
//   mod   native Claude Code Mod: no settings.json entry; coloured rows are
//         drawn by the Mod above the prompt.
//
// Usage: node scripts/mode.js [get | set <hook|mod> | apply]
//   get    print the active mode
//   set    persist a mode and apply it to settings.json immediately
//   apply  reconcile settings.json with the persisted mode (SessionStart hook)

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

export const MODES = ["hook", "mod"];
const configDir = () => join(homedir(), ".config", "claude-statusline-widgets");
const modeFile = () => join(configDir(), "mode.json");
const claudeSettings = () =>
  join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "settings.json");

export function getMode() {
  const env = process.env.CCFOOTER_MODE;
  if (MODES.includes(env)) return env;
  try {
    const mode = JSON.parse(readFileSync(modeFile(), "utf8"))?.mode;
    if (MODES.includes(mode)) return mode;
  } catch {
    // Absent or unreadable: fall through to the default.
  }
  return "hook";
}

export function setMode(mode) {
  if (!MODES.includes(mode)) throw new Error(`mode must be one of: ${MODES.join(", ")}`);
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(modeFile(), JSON.stringify({ mode }, null, 2), "utf8");
}

const isOurs = (command) =>
  typeof command === "string" &&
  /dist[\\/]index\.js/.test(command) &&
  /(cache-ttl-statusline|claude-statusline-widgets|ClaudeStatusLineWidgets)/i.test(command);

/** Make settings.json agree with the mode. Never touches a user's own statusLine. */
export function applyMode(pluginRoot, mode = getMode()) {
  let settings;
  try {
    settings = JSON.parse(readFileSync(claudeSettings(), "utf8"));
  } catch {
    return; // absent or not valid JSON — nothing to reconcile
  }
  const current = settings?.statusLine?.command;
  let next = null;

  if (mode === "hook") {
    const command = `node "${pluginRoot.replace(/\\/g, "/")}/dist/index.js"`;
    // Replace ours (a stale plugin path) or fill an empty slot; leave a foreign command alone.
    if (current === command || (current && !isOurs(current))) return;
    next = { ...settings, statusLine: { ...settings.statusLine, type: "command", command } };
  } else if (isOurs(current)) {
    next = { ...settings };
    delete next.statusLine;
  }
  if (!next) return;
  try {
    writeFileSync(claudeSettings(), JSON.stringify(next, null, 2), "utf8");
  } catch {
    // Non-fatal: retried at the next SessionStart.
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd = "get", arg] = process.argv.slice(2);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (cmd === "get") {
    process.stdout.write(`${getMode()}\n`);
  } else if (cmd === "apply") {
    applyMode(process.argv[3] ?? root);
  } else if (cmd === "set") {
    try {
      setMode(arg);
    } catch (err) {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    }
    applyMode(root);
    process.stdout.write(`status line mode: ${arg} (restart Claude Code or /reload-plugins to apply)\n`);
  } else {
    process.stderr.write("usage: mode [get | set <hook|mod>]\n");
    process.exit(1);
  }
}
