import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { isHeadroomActive } from "./headroom.js";

const CACHE_FILE = join(tmpdir(), "claude-statusline-headroom.json");

const stats = {
  compressionPct: 0,
  tokensSaved: 0,
  cliTokensSaved: 0,
  costSavedUsd: 0,
  requests: 0,
  cacheHitRate: 0,
};

function clearCacheFile() {
  rmSync(CACHE_FILE, { force: true });
}

describe("isHeadroomActive", () => {
  beforeEach(() => {
    clearCacheFile();
  });

  afterEach(() => {
    clearCacheFile();
  });

  it("returns true when cache is missing", () => {
    expect(isHeadroomActive()).toBe(true);
  });

  it("treats legacy cache format with data as active", () => {
    writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), data: stats }), "utf-8");
    expect(isHeadroomActive()).toBe(true);
  });

  it("treats legacy cache format with null data as inactive", () => {
    writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), data: null }), "utf-8");
    expect(isHeadroomActive()).toBe(false);
  });

  it("uses explicit isActive when present", () => {
    writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), isActive: false, data: stats }), "utf-8");
    expect(isHeadroomActive()).toBe(false);
  });
});
