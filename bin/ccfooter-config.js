#!/usr/bin/env node
// `ccfooter-config mode [get|hook|mod]` switches install mode;
// `ccfooter-config codex [install|status|uninstall]` wires up Codex;
// anything else is the TUI/renderer.
const subcommands = { mode: "mode.js", codex: "codex.js" };
const script = subcommands[process.argv[2]];
if (script) {
  const { spawnSync } = await import("child_process");
  const { fileURLToPath } = await import("url");
  const path = fileURLToPath(new URL(`../scripts/${script}`, import.meta.url));
  const rest = process.argv.slice(3);
  const args = process.argv[2] === "mode" ? (!rest[0] || rest[0] === "get" ? ["get"] : ["set", rest[0]]) : rest;
  process.exit(spawnSync(process.execPath, [path, ...args], { stdio: "inherit" }).status ?? 1);
}
await import("../dist/index.js");
