import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { rmSync, writeFileSync } from "fs";
import { isHeadroomActive, getCacheFilePath } from "./headroom.js";

// Use the exported path accessor so tests always target the same secure
// subdirectory that the module writes to (eliminates the insecure-temporary-file
// finding on the previously-hardcoded join(tmpdir(), "...") path in tests).
const CACHE_FILE = getCacheFilePath();

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
