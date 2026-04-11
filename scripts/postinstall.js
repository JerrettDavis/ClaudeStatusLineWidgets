#!/usr/bin/env node
import { spawn } from "child_process";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "fs";
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

const stableLauncherPath = join(stableRoot, "bin", "ccfooter-config.js");
const ps = (value) => value.replace(/'/g, "''");
const helperScript = `
$prefix = '${ps(prefix)}'
$launcherPath = '${ps(stableLauncherPath)}'
$cmdPath = Join-Path $prefix 'ccfooter-config.cmd'
$ps1Path = Join-Path $prefix 'ccfooter-config.ps1'
$cmdShim = @"
@ECHO OFF
SETLOCAL
IF EXIST "%~dp0\\node.exe" (
  "%~dp0\\node.exe" "$launcherPath" %*
) ELSE (
  node "$launcherPath" %*
)
"@
$ps1Shim = @"
$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent
if (Test-Path "$basedir\\node.exe") {
  & "$basedir\\node.exe" "$launcherPath" $args
} else {
  & "node" "$launcherPath" $args
}
"@
for ($i = 0; $i -lt 60; $i++) {
  try { Set-Content -Path $cmdPath -Value $cmdShim -Encoding Ascii -Force } catch {}
  try { Set-Content -Path $ps1Path -Value $ps1Shim -Encoding Ascii -Force } catch {}
  Start-Sleep -Milliseconds 250
}
`;
const encodedHelper = Buffer.from(helperScript, "utf16le").toString("base64");

const helper = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedHelper], {
  detached: true,
  stdio: "ignore",
  windowsHide: true
});

helper.unref();
