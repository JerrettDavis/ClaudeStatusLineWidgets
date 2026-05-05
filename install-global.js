#!/usr/bin/env node
// Installs platform-specific launcher wrappers for global npm installs.
// Lives at project root to survive GitHub URL install tarball extraction.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, chmodSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const isWindows = process.platform === "win32";
const isGlobalInstall =
  process.env.npm_config_global === "true" ||
  process.env.npm_config_location === "global";

if (!isGlobalInstall) {
  process.exit(0);
}

const prefix = process.env.npm_config_prefix;
if (!prefix) {
  process.stderr.write("[install-global] npm_config_prefix is missing; cannot install the Windows launcher.\n");
  process.exit(1);
}

if (isWindows) {
  const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
  const runtimeRoot = join(localAppData, "claude-statusline-widgets", "global-runtime");
  const stableRoot = join(runtimeRoot, "package");
  const stageRoot = join(runtimeRoot, `package.stage-${process.pid}`);
  const entriesToCopy = [
    ".claude-plugin",
    "bin",
    "dist",
    "hooks",
    "scripts",
    "skills",
    "LICENSE",
    "package.json",
    "README.md"
  ];

  const rootLauncher = join(root, "bin", "ccfooter-config.js");
  const stableLauncher = join(stableRoot, "bin", "ccfooter-config.js");

  mkdirSync(runtimeRoot, { recursive: true });

  function findPackedTarball() {
    const cacheBase = process.env.npm_config_cache ?? join(homedir(), ".npm");
    const cacheContentDir = join(cacheBase, "_cacache", "content-v2", "sha512");
    if (!existsSync(cacheContentDir)) return null;

    const candidates = [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    function scan(dir, depth) {
      if (depth > 3) return;
      let entries;
      try { entries = readdirSync(dir); } catch { return; }
      for (const e of entries) {
        const full = join(dir, e);
        let st;
        try { st = statSync(full); } catch { continue; }
        if (st.isDirectory()) {
          scan(full, depth + 1);
        } else if (st.mtimeMs > cutoff) {
          candidates.push(full);
        }
      }
    }

    scan(cacheContentDir, 0);

    for (const file of candidates) {
      try {
        const listing = execFileSync("tar", ["-tzf", file], {
          encoding: "utf8",
          timeout: 10_000,
          maxBuffer: 1024 * 1024
        });
        if (listing.includes("package/bin/ccfooter-config.js")) {
          return file;
        }
      } catch { /* not a valid tarball or doesn't match */ }
    }

    return null;
  }

  if (existsSync(rootLauncher)) {
    rmSync(stageRoot, { recursive: true, force: true });
    mkdirSync(stageRoot, { recursive: true });

    for (const entry of entriesToCopy) {
      const source = join(root, entry);
      if (!existsSync(source)) continue;
      cpSync(source, join(stageRoot, entry), { recursive: true, force: true });
    }

    const stagedLauncher = join(stageRoot, "bin", "ccfooter-config.js");
    if (!existsSync(stagedLauncher)) {
      process.stderr.write(`[install-global] Missing launcher after staging runtime: ${stagedLauncher}\n`);
      process.exit(1);
    }

    rmSync(stableRoot, { recursive: true, force: true });
    renameSync(stageRoot, stableRoot);
  } else {
    const tarball = findPackedTarball();
    if (tarball) {
      let recovered = false;
      try {
        rmSync(stageRoot, { recursive: true, force: true });
        mkdirSync(stageRoot, { recursive: true });
        execFileSync("tar", ["-xzf", tarball, "-C", stageRoot, "--strip-components=1"], {
          timeout: 30_000
        });
        const stagedLauncher = join(stageRoot, "bin", "ccfooter-config.js");
        if (existsSync(stagedLauncher)) {
          rmSync(stableRoot, { recursive: true, force: true });
          renameSync(stageRoot, stableRoot);
          recovered = true;
        }
      } catch { /* fall through to stale-install fallback */ }
      rmSync(stageRoot, { recursive: true, force: true });
      if (!recovered && !existsSync(stableLauncher)) {
        process.stderr.write("[install-global] Cache recovery failed and no prior install found.\n");
        process.exit(1);
      }
    } else if (!existsSync(stableLauncher)) {
      process.stderr.write(`[install-global] Missing Windows launcher: ${rootLauncher}\n`);
      process.exit(1);
    }
  }

  const launcher = stableLauncher;

  writeFileSync(
    join(prefix, "ccfooter-config.cmd"),
    ["@ECHO OFF", "SETLOCAL", `IF EXIST "%~dp0\\node.exe" (`, `  "%~dp0\\node.exe" "${launcher}" %*`, ") ELSE (", `  node "${launcher}" %*`, ")", ""].join("\r\n")
  );

  writeFileSync(
    join(prefix, "ccfooter-config.ps1"),
    [
      "$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent",
      `$nodeExe = if (Test-Path "$basedir\\node.exe") { "$basedir\\node.exe" } else { "node" }`,
      "if ($MyInvocation.ExpectingInput) {",
      `  $input | & $nodeExe "${launcher}" @args`,
      "} else {",
      `  & $nodeExe "${launcher}" @args`,
      "}",
      ""
    ].join("\r\n")
  );

  process.exit(0);
}

const launcher = join(root, "bin", "ccfooter-config.js");
if (!existsSync(launcher)) {
  process.stderr.write(`[install-global] Missing launcher: ${launcher}\n`);
  process.exit(1);
}

const binDir = join(prefix, "bin");
mkdirSync(binDir, { recursive: true });

const shim = join(binDir, "ccfooter-config");
writeFileSync(shim, `#!/usr/bin/env sh\nexec node "${launcher}" "$@"\n`);
chmodSync(shim, 0o755);