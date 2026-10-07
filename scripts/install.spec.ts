import { spawnSync } from "child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath!;
const windows = process.platform === "win32";
const input = JSON.stringify({
  model: { display_name: "Opus" },
  cost: { total_cost_usd: 0.12 },
  context_window: { used_percentage: 45 },
});
let workspace: string;
let tarball: string;

function npm(args: string[]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}

function runLauncher(prefix: string, args: string[], stdin = "") {
  const launcher = join(prefix, windows ? "ccfooter-config.ps1" : "bin/ccfooter-config");
  const home = join(workspace, "isolated home");
  const result = spawnSync(
    windows ? "pwsh" : launcher,
    windows
      ? ["-NoProfile", "-NonInteractive", "-Command", "$input | & $env:TEST_LAUNCHER @($env:TEST_ARGS | ConvertFrom-Json); exit $LASTEXITCODE"]
      : args,
    {
      cwd: workspace,
      encoding: "utf8",
      input: stdin,
      timeout: 30_000,
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        CLAUDE_CONFIG_DIR: join(home, ".claude"),
        CCFOOTER_MODE: "hook",
        TEST_LAUNCHER: launcher,
        TEST_ARGS: JSON.stringify(args),
      },
    },
  );
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), "ccfooter install with spaces "));
  const packed = JSON.parse(npm([
    "pack", "--ignore-scripts", "--json", "--pack-destination", workspace,
  ]))[0];
  const files = packed.files.map((file: { path: string }) => file.path);
  for (const required of [
    "bin/ccfooter-config.js",
    "dist/index.js",
    "dist/extension-api.js",
    "dist/renderer.js",
    "dist/runtime.js",
    "dist/config/schema.js",
    "scripts/mode.js",
    "scripts/configure-statusline.js",
    ".claude-plugin/plugin.json",
    "hooks/hooks.json",
    "hooks/statusline.tsx",
  ]) {
    expect(files).toContain(required);
  }
  expect(files).not.toContain("install-global.js");
  expect(files).not.toContain("scripts/postinstall.js");
  tarball = join(workspace, packed.filename);
}, 120_000);

afterAll(() => {
  if (workspace) rmSync(workspace, { recursive: true, force: true });
});

describe("npm-managed CLI installation", () => {
  it("builds in a path containing spaces without shell command parsing", () => {
    const buildRoot = join(workspace, "source directory with spaces");
    mkdirSync(join(buildRoot, "scripts"), { recursive: true });
    for (const file of ["src", "package.json", "tsconfig.json", "scripts/build.js"]) {
      cpSync(join(root, file), join(buildRoot, file), { recursive: true });
    }
    symlinkSync(join(root, "node_modules"), join(buildRoot, "node_modules"), "junction");
    const result = spawnSync(process.execPath, [join(buildRoot, "scripts/build.js")], {
      cwd: buildRoot,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(result.error, result.stderr).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(existsSync(join(buildRoot, "dist/index.js"))).toBe(true);
  }, 120_000);

  it.each(["tarball", "local directory"])("installs and uninstalls from a %s", (source) => {
    const prefix = join(workspace, `${source} prefix with spaces`);
    npm(["install", "--global", "--prefix", prefix, "--no-audit", "--no-fund",
      source === "tarball" ? tarball : root]);

    const packageRoot = join(prefix, windows ? "node_modules" : "lib/node_modules", "claude-statusline-widgets");
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    expect(manifest.bin).toEqual({ "ccfooter-config": "bin/ccfooter-config.js" });
    expect(manifest.scripts.postinstall).toBeUndefined();
    if (source === "tarball") {
      expect(existsSync(join(packageRoot, "node_modules"))).toBe(false);
    }

    const launchers = windows
      ? ["ccfooter-config", "ccfooter-config.cmd", "ccfooter-config.ps1"]
      : ["bin/ccfooter-config"];
    for (const launcher of launchers) {
      expect(existsSync(join(prefix, launcher))).toBe(true);
    }
    expect(runLauncher(prefix, ["mode", "get"]).trim()).toBe("hook");
    expect(runLauncher(prefix, [], input)).toContain("Opus");

    npm(["uninstall", "--global", "--prefix", prefix, "claude-statusline-widgets"]);
    for (const launcher of launchers) {
      expect(existsSync(join(prefix, launcher))).toBe(false);
    }
  }, 120_000);
});
