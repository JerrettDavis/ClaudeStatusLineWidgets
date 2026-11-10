#!/usr/bin/env node
// Codex integration: registers this statusline as Codex's `[tui.status_line_command]`.
//
// Usage: node scripts/codex.js [install | status | uninstall] [options]
//   install    write ~/.codex/config.toml (or $CODEX_HOME/config.toml)
//   status     report what is configured for Codex and Claude Code
//   uninstall  remove our status_line_command from the Codex config
//
// Options:
//   --layout shared|separate   shared (default): Codex uses the same global layout as Claude.
//                              separate: copy the current layout into a Codex-only override.
//   --force                    replace a status_line_command that is not ours
//   --dry-run                  print the resulting config without writing

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const SECTION = "tui.status_line_command";
const widgetsDir = () => join(homedir(), ".config", "claude-statusline-widgets");
const widgetsSettings = () => join(widgetsDir(), "settings.json");
const claudeSettings = () =>
  join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "settings.json");
export const codexConfigPath = () =>
  join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "config.toml");

const HEADER = /^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*(#.*)?$/;

const isOurs = (text) =>
  typeof text === "string" &&
  /dist[\\/]index\.js/.test(text) &&
  /(cache-ttl-statusline|claude-statusline-widgets|ClaudeStatusLineWidgets)/i.test(text);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** What exists on this machine for Claude Code and for our shared layout. */
export function detectClaude() {
  const settings = readJson(claudeSettings());
  const statusLine = settings?.statusLine?.command;
  return {
    claudeConfigured: Boolean(settings),
    claudeUsesWidgets: isOurs(statusLine) || Boolean(settings?.enabledPlugins &&
      Object.keys(settings.enabledPlugins).some((k) => k.startsWith("cache-ttl-statusline@"))),
    layoutExists: existsSync(widgetsSettings()),
  };
}

function splitSections(toml) {
  const lines = toml.split(/\r?\n/);
  const sections = [];
  let current = { name: null, start: 0 };
  lines.forEach((line, i) => {
    const m = HEADER.exec(line);
    if (m) {
      current.end = i;
      sections.push(current);
      current = { name: m[1], start: i };
    }
  });
  current.end = lines.length;
  sections.push(current);
  return { lines, sections };
}

export function commandArray(root) {
  return ["node", `${root.replace(/\\/g, "/")}/dist/index.js`, "--provider", "codex"];
}

/** The `command` array currently configured in the toml, as raw text, or null. */
export function readCommand(toml) {
  const { lines, sections } = splitSections(toml);
  const sec = sections.find((s) => s.name === SECTION);
  if (!sec) return null;
  const body = lines.slice(sec.start + 1, sec.end).join("\n");
  return /^\s*command\s*=\s*(\[[\s\S]*?\])/m.exec(body)?.[1] ?? null;
}

export function removeStatusLineCommand(toml) {
  const { lines, sections } = splitSections(toml);
  const sec = sections.find((s) => s.name === SECTION);
  if (!sec) return toml;
  const kept = [...lines.slice(0, sec.start), ...lines.slice(sec.end)];
  while (kept.length && kept[kept.length - 1].trim() === "" && sec.end >= lines.length) kept.pop();
  return kept.join("\n") + (kept.length ? "\n" : "");
}

export function upsertStatusLineCommand(toml, root) {
  let text = removeStatusLineCommand(toml);
  const { lines, sections } = splitSections(text);
  const tui = sections.find((s) => s.name === "tui");
  const block = [];
  if (!tui) {
    block.push("[tui]", "status_line = []", "");
  } else if (!lines.slice(tui.start + 1, tui.end).some((l) => /^\s*status_line\s*=/.test(l))) {
    lines.splice(tui.start + 1, 0, "status_line = []");
  }
  block.push(
    `[${SECTION}]`,
    `command = [${commandArray(root).map((s) => JSON.stringify(s)).join(", ")}]`,
    "refresh_interval_ms = 1000",
    "timeout_ms = 2000",
    "max_lines = 4",
  );
  text = lines.join("\n").replace(/\s*$/, "");
  return (text ? text + "\n\n" : "") + block.join("\n") + "\n";
}

/** Copy the current global layout into a Codex-only override (no-op if one exists). */
export function applySeparateLayout(settings) {
  if (settings?.providers?.codex) return { settings, changed: false };
  const { lines, defaultSeparator, minimalistMode } = settings;
  const codex = JSON.parse(JSON.stringify({ lines, defaultSeparator, minimalistMode }));
  return { settings: { ...settings, providers: { ...settings.providers, codex } }, changed: true };
}

export function install({ root, layout = "shared", force = false, dryRun = false, log = () => {} }) {
  const path = codexConfigPath();
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const current = readCommand(existing);
  if (current && !isOurs(current) && !force) {
    log(`Codex already has a different ${SECTION} in ${path}; re-run with --force to replace it.`);
    return false;
  }
  const next = upsertStatusLineCommand(existing, root);

  const claude = detectClaude();
  if (claude.layoutExists) {
    log(layout === "shared"
      ? "Found an existing statusline layout (used by Claude Code): Codex will share it."
      : "Found an existing statusline layout: copying it into a Codex-only layout.");
  } else if (claude.claudeConfigured) {
    log("Claude Code is configured but has no custom layout yet: Codex will share the default layout.");
  } else {
    log("No Claude Code configuration found: Codex will use the default layout.");
  }

  let widgets = null;
  if (layout === "separate") {
    const settings = readJson(widgetsSettings());
    if (settings) {
      const result = applySeparateLayout(settings);
      if (result.changed) widgets = result.settings;
    } else {
      log("No layout file yet: run `ccfooter-config --provider codex` to create a Codex-only layout.");
    }
  }

  if (dryRun) {
    log(`--- ${path} ---\n${next}`);
    return true;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next, "utf8");
  if (widgets) writeFileSync(widgetsSettings(), JSON.stringify(widgets, null, 2), "utf8");
  log(`Codex status line installed in ${path}. Restart Codex to apply.`);
  return true;
}

export function uninstall({ log = () => {} } = {}) {
  const path = codexConfigPath();
  if (!existsSync(path)) {
    log("No Codex config found; nothing to remove.");
    return;
  }
  const toml = readFileSync(path, "utf8");
  const current = readCommand(toml);
  if (!current) return log("No status_line_command is configured for Codex.");
  if (!isOurs(current)) return log("The configured Codex status_line_command is not ours; leaving it alone.");
  writeFileSync(path, removeStatusLineCommand(toml), "utf8");
  log(`Removed our status_line_command from ${path}.`);
}

export function status({ log = () => {} } = {}) {
  const path = codexConfigPath();
  const current = existsSync(path) ? readCommand(readFileSync(path, "utf8")) : null;
  const claude = detectClaude();
  const settings = readJson(widgetsSettings());
  log(`codex config:   ${path}`);
  log(`codex command:  ${current ? (isOurs(current) ? "installed" : "other: " + current) : "not installed"}`);
  log(`claude config:  ${claude.claudeConfigured ? "found" : "not found"}${claude.claudeUsesWidgets ? " (uses these widgets)" : ""}`);
  log(`layout:         ${claude.layoutExists ? widgetsSettings() : "defaults"}${settings?.providers?.codex ? " (Codex-only override present)" : " (shared by all providers)"}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const cmd = args[0] && !args[0].startsWith("--") ? args[0] : "install";
  const flag = (name) => args.includes(`--${name}`);
  const layoutIdx = args.indexOf("--layout");
  const layout = layoutIdx >= 0 ? args[layoutIdx + 1] : "shared";
  const log = (m) => process.stdout.write(`${m}\n`);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (layout !== "shared" && layout !== "separate") {
    process.stderr.write("--layout must be shared or separate\n");
    process.exit(1);
  }
  if (cmd === "install") {
    if (!existsSync(join(root, "dist", "index.js"))) log("Warning: dist/index.js not found; run `npm run build`.");
    process.exit(install({ root, layout, force: flag("force"), dryRun: flag("dry-run"), log }) ? 0 : 1);
  } else if (cmd === "uninstall") {
    uninstall({ log });
  } else if (cmd === "status") {
    status({ log });
  } else {
    process.stderr.write("usage: codex [install | status | uninstall] [--layout shared|separate] [--force] [--dry-run]\n");
    process.exit(1);
  }
}
