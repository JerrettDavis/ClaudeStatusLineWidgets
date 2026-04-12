#!/usr/bin/env node
import { spawnSync } from "child_process";
import { build } from "esbuild";
import { mkdirSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const tsc = resolve(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
const distDir = resolve(root, "dist");

const typecheck = spawnSync(tsc, [], { stdio: "inherit", cwd: root, shell: true });

if (typecheck.status !== 0) {
  process.exit(typecheck.status ?? 1);
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  jsx: "automatic",
  packages: "bundle"
});

await build({
  absWorkingDir: root,
  entryPoints: ["src/extension-api.ts"],
  outfile: "dist/extension-api.js",
  bundle: false,
  format: "esm",
  platform: "node",
  target: "node22",
  jsx: "automatic"
});
