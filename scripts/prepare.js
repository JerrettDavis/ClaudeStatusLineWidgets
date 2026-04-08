#!/usr/bin/env node
// Runs as the npm `prepare` lifecycle hook.
// Tries to build with tsc. If tsc is unavailable (e.g. during a global
// npm install -g where the inner npm install partially failed due to
// Windows path-length issues), falls back to the pre-built dist/ that
// semantic-release commits as part of every release. Fails hard only when
// tsc is missing AND dist/ was never built.

import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const tsc = resolve(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");

const result = spawnSync(tsc, [], { stdio: "inherit", cwd: root, shell: true });

if (result.status === 0) process.exit(0);

// Build failed. Check if a pre-built dist/ exists (shipped in release commits).
if (existsSync(resolve(root, "dist", "index.js"))) {
  process.stderr.write(
    "[prepare] tsc unavailable — using pre-built dist/ from release commit.\n"
  );
  process.exit(0);
}

process.stderr.write(
  "[prepare] Build failed and dist/ is missing. Run `npm run build` manually.\n"
);
process.exit(1);
