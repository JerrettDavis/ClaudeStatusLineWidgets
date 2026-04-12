#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "fs";
import { homedir } from "os";
import { dirname, join, relative, resolve, sep } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const isGlobalInstall =
  process.env.npm_config_global === "true" ||
  process.env.npm_config_location === "global";

if (!isWindows || !isGlobalInstall) {
  process.exit(0);
}

const prefix = process.env.npm_config_prefix;

if (!prefix) {
  process.stderr.write(
    "[postinstall] npm_config_prefix is missing; cannot install the Windows launcher.\n"
  );
  process.exit(1);
}

const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
const runtimeRoot = join(localAppData, "claude-statusline-widgets", "global-runtime");
const stableRoot = join(runtimeRoot, "package");
const stageRoot = join(runtimeRoot, `package.stage-${process.pid}`);
const entriesToCopy = [
  ".claude-plugin",
  "bin",
  "dist",
  "hooks",
  "skills",
  "LICENSE",
  "package.json",
  "README.md"
];

mkdirSync(runtimeRoot, { recursive: true });
rmSync(stageRoot, { recursive: true, force: true });
cpSync(root, stageRoot, {
  recursive: true,
  force: true,
  filter(source) {
    const rel = relative(root, source);

    if (rel === "") {
      return true;
    }

    const topLevel = rel.split(sep, 1)[0];
    return entriesToCopy.includes(topLevel);
  }
});

const launcherPath = join(stageRoot, "bin", "ccfooter-config.js");

if (!existsSync(launcherPath)) {
  process.stderr.write(
    `[postinstall] Missing launcher after staging runtime: ${launcherPath}\n`
  );
  process.exit(1);
}

rmSync(stableRoot, { recursive: true, force: true });
renameSync(stageRoot, stableRoot);
