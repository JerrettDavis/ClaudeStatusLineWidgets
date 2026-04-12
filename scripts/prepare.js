#!/usr/bin/env node
// Runs as the npm `prepare` lifecycle hook.
// Builds dist/ with esbuild so that `npm install -g github:...` installs work
// even when the pre-built dist/ is not yet committed (e.g. pre-release branches).
// Falls back to the pre-built dist/ that semantic-release commits on every release.
// Fails hard only when the build fails AND dist/ was never built.

import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const buildScript = resolve(__dirname, "build.js");

const result = spawnSync(process.execPath, [buildScript], { stdio: "inherit", cwd: root });

if (result.status === 0) process.exit(0);

// Build failed. Check if a pre-built dist/ exists (shipped in release commits).
if (existsSync(resolve(root, "dist", "index.js"))) {
  process.stderr.write(
    "[prepare] Build failed — using pre-built dist/ from release commit.\n"
  );
  process.exit(0);
}

process.stderr.write(
  "[prepare] Build failed and dist/ is missing. Run `npm run build` manually.\n"
);
process.exit(1);
