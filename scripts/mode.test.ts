import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script without types
import { applyMode, getMode, setMode } from "./mode.js";

const ROOT = "C:/plugins/cache-ttl-statusline/1.6.0";
let home: string;
let settings: string;
const read = () => JSON.parse(readFileSync(settings, "utf8"));

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "mode-"));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.CLAUDE_CONFIG_DIR = home;
  delete process.env.CCFOOTER_MODE;
  settings = join(home, "settings.json");
});

describe("install mode", () => {
  it("defaults to hook and persists a switch", () => {
    expect(getMode()).toBe("hook");
    setMode("mod");
    expect(getMode()).toBe("mod");
    expect(() => setMode("nope")).toThrow();
  });

  it("hook mode writes the statusLine command, replacing a stale plugin path", () => {
    writeFileSync(settings, JSON.stringify({ a: 1, statusLine: { type: "command", command: 'node "/x/cache-ttl-statusline/1.1.6/dist/index.js"' } }));
    applyMode(ROOT, "hook");
    expect(read().statusLine.command).toBe(`node "${ROOT}/dist/index.js"`);
    expect(read().a).toBe(1);
  });

  it("mod mode removes only our statusLine", () => {
    writeFileSync(settings, JSON.stringify({ statusLine: { type: "command", command: `node "${ROOT}/dist/index.js"` } }));
    applyMode(ROOT, "mod");
    expect(read().statusLine).toBeUndefined();

    writeFileSync(settings, JSON.stringify({ statusLine: { type: "command", command: "my-own.sh" } }));
    applyMode(ROOT, "mod");
    expect(read().statusLine.command).toBe("my-own.sh");
  });

  it("hook mode never overwrites a user's own statusLine", () => {
    writeFileSync(settings, JSON.stringify({ statusLine: { type: "command", command: "my-own.sh" } }));
    applyMode(ROOT, "hook");
    expect(read().statusLine.command).toBe("my-own.sh");
  });

  it("hook mode fills an empty slot", () => {
    writeFileSync(settings, "{}");
    applyMode(ROOT, "hook");
    expect(read().statusLine.command).toBe(`node "${ROOT}/dist/index.js"`);
  });
});
