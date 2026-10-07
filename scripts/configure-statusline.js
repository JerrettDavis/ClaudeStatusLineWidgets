#!/usr/bin/env node
// SessionStart hook: reconcile settings.json's statusLine with the install
// mode (see scripts/mode.js). Argument: the plugin root.
import { applyMode } from "./mode.js";

const pluginRoot = process.argv[2];
if (!pluginRoot) {
  process.stderr.write("[configure-statusline] No plugin root provided — skipping.\n");
  process.exit(0);
}
applyMode(pluginRoot);
