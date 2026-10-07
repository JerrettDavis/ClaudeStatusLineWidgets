#!/usr/bin/env node
// `ccfooter-config mode [get|hook|mod]` switches install mode; anything else is the TUI/renderer.
if (process.argv[2] === "mode") {
  const { spawnSync } = await import("child_process");
  const { fileURLToPath } = await import("url");
  const script = fileURLToPath(new URL("../scripts/mode.js", import.meta.url));
  const arg = process.argv[3];
  const args = !arg || arg === "get" ? ["get"] : ["set", arg];
  process.exit(spawnSync(process.execPath, [script, ...args], { stdio: "inherit" }).status ?? 1);
}
await import("../dist/index.js");
