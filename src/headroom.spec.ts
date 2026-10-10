import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { rmSync, writeFileSync } from "fs";
import {
  isHeadroomActive,
  getCacheFilePath,
  getProxyToken,
  fetchAndCacheHeadroom,
  readHeadroomCache,
  isCacheStale,
} from "./headroom.js";

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

describe("getProxyToken", () => {
  it("prefers HEADROOM_PROXY_TOKEN", () => {
    expect(
      getProxyToken({
        HEADROOM_PROXY_TOKEN: " direct ",
        ANTHROPIC_CUSTOM_HEADERS: "x-headroom-proxy-token: from-headers",
      })
    ).toBe("direct");
  });

  it("parses the header line out of ANTHROPIC_CUSTOM_HEADERS, case-insensitively", () => {
    expect(
      getProxyToken({
        ANTHROPIC_CUSTOM_HEADERS: "X-Other: a\r\nX-Headroom-Proxy-Token:  tok:with:colons \nX-Last: b",
      })
    ).toBe("tok:with:colons");
  });

  it("returns null when neither source has a token", () => {
    expect(getProxyToken({})).toBeNull();
    expect(getProxyToken({ HEADROOM_PROXY_TOKEN: "  ", ANTHROPIC_CUSTOM_HEADERS: "X-Other: a" })).toBeNull();
    expect(getProxyToken({ ANTHROPIC_CUSTOM_HEADERS: "x-headroom-proxy-token:" })).toBeNull();
  });
});

describe("fetchAndCacheHeadroom", () => {
  const TOKEN = "test-proxy-token";
  let calls: Array<{ url: string; headers: Record<string, string> }>;

  function stubFetch(statsStatus: number) {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
        calls.push({ url, headers: { ...(init?.headers ?? {}) } });
        if (url.endsWith("/health")) return new Response(JSON.stringify({ status: "healthy" }));
        return new Response(JSON.stringify({ tokens: { savings_percent: 12 } }), { status: statsStatus });
      })
    );
  }

  beforeEach(() => {
    clearCacheFile();
    vi.stubEnv("HEADROOM_PROXY_TOKEN", "");
    vi.stubEnv("ANTHROPIC_CUSTOM_HEADERS", "");
    vi.stubEnv("ANTHROPIC_BASE_URL", "https://proxy.example.test/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearCacheFile();
  });

  it("sends the token on /stats only, to ANTHROPIC_BASE_URL", async () => {
    vi.stubEnv("ANTHROPIC_CUSTOM_HEADERS", `x-headroom-proxy-token: ${TOKEN}`);
    stubFetch(200);

    await fetchAndCacheHeadroom();

    expect(calls.map((c) => c.url)).toEqual([
      "https://proxy.example.test/health",
      "https://proxy.example.test/stats",
    ]);
    expect(calls[0].headers).toEqual({});
    expect(calls[1].headers).toEqual({ "x-headroom-proxy-token": TOKEN });
    expect(readHeadroomCache()?.isActive).toBe(true);
  });

  it("sends no token header when none is configured", async () => {
    stubFetch(200);

    await fetchAndCacheHeadroom();

    expect(calls[1].headers).toEqual({});
  });

  it("never sends the token to the localhost fallback", async () => {
    vi.stubEnv("ANTHROPIC_BASE_URL", "");
    vi.stubEnv("HEADROOM_PROXY_TOKEN", TOKEN);
    stubFetch(200);

    await fetchAndCacheHeadroom();

    expect(calls[1].url).toBe("http://127.0.0.1:8787/stats");
    expect(calls[1].headers).toEqual({});
  });

  it("backs off for about 10 minutes after a 401 instead of retrying every 30 s", async () => {
    vi.stubEnv("HEADROOM_PROXY_TOKEN", TOKEN);
    const logged = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
    ];
    stubFetch(401);
    const before = Date.now();

    await fetchAndCacheHeadroom();

    const cache = readHeadroomCache();
    expect(cache?.isActive).toBe(false);
    expect(cache?.data).toBeNull();
    expect(cache?.retryAfter).toBeGreaterThanOrEqual(before + 10 * 60_000);
    expect(cache?.retryAfter).toBeLessThanOrEqual(Date.now() + 10 * 60_000);
    expect(isCacheStale()).toBe(false);
    for (const spy of logged) expect(spy).not.toHaveBeenCalled();
  });

  it("goes stale again once the back-off has passed", () => {
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ fetchedAt: 0, isActive: false, data: null, retryAfter: Date.now() - 1 }),
      "utf-8"
    );
    // Freshly written, so still inside the normal 30 s window...
    expect(isCacheStale()).toBe(false);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 31_000);
    // ...and past it, the expired retryAfter no longer holds the fetch back.
    expect(isCacheStale()).toBe(true);
  });

  it("keeps other /stats failures on the normal 30 s cadence", async () => {
    stubFetch(500);

    await fetchAndCacheHeadroom();

    const cache = readHeadroomCache();
    expect(cache?.isActive).toBe(false);
    expect(cache?.retryAfter).toBeUndefined();
  });
});
