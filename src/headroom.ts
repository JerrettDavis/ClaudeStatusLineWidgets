import { readFileSync, writeFileSync, statSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import type { HeadroomStats } from "./headroom-core.js";

export type { HeadroomStats } from "./headroom-core.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface HeadroomCache {
  fetchedAt: number;
  isActive: boolean;
  data: HeadroomStats | null;
  /** Epoch ms before which no refetch is attempted (set after a 401). */
  retryAfter?: number;
}

/**
 * Cache directory for headroom data: stored inside the Claude config directory
 * (~/.claude/.cache/) rather than the world-writable system tmpdir.
 * This avoids insecure-temporary-file findings (js/insecure-temporary-file)
 * while keeping the cache accessible to all processes for the same user.
 */
function getCacheDir(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const dir = join(configDir, ".cache");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // Already exists or permissions error — proceed; writes will fail gracefully
  }
  return dir;
}

let _cacheDir: string | null = null;
function cacheDir(): string {
  if (!_cacheDir) _cacheDir = getCacheDir();
  return _cacheDir;
}

/** Absolute path to the headroom cache file. */
export function getCacheFilePath(): string {
  return resolve(cacheDir(), "headroom.json");
}

const STALE_THRESHOLD_MS = 30_000; // 30 seconds — local call, cheap
// A 401 means the proxy wants a token we don't have; retrying every 30 s only
// adds rejected requests to its log until the configuration changes.
const AUTH_BACKOFF_MS = 10 * 60_000;
const HEADROOM_FALLBACK_BASE = "http://127.0.0.1:8787";
const PROXY_TOKEN_HEADER = "x-headroom-proxy-token";

function getHeadroomBaseUrl(): string {
  const envBase = process.env.ANTHROPIC_BASE_URL;
  return envBase ? envBase.replace(/\/$/, "") : HEADROOM_FALLBACK_BASE;
}

/**
 * Token for a Headroom proxy that requires one (server-side HEADROOM_PROXY_TOKEN).
 * Taken from HEADROOM_PROXY_TOKEN, else from the x-headroom-proxy-token line of
 * ANTHROPIC_CUSTOM_HEADERS (newline-separated "Name: Value"), which is how
 * Claude Code itself sends it. Never logged.
 */
export function getProxyToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const direct = env.HEADROOM_PROXY_TOKEN?.trim();
  if (direct) return direct;
  for (const line of (env.ANTHROPIC_CUSTOM_HEADERS ?? "").split(/\r?\n/)) {
    const sep = line.indexOf(":");
    if (sep > 0 && line.slice(0, sep).trim().toLowerCase() === PROXY_TOKEN_HEADER) {
      const value = line.slice(sep + 1).trim();
      if (value) return value;
    }
  }
  return null;
}

/**
 * Headers for the /stats request. The token only ever goes to the proxy the
 * user configured in ANTHROPIC_BASE_URL — never to the localhost fallback,
 * which may be some other process listening on that port.
 */
function statsHeaders(): Record<string, string> {
  const token = process.env.ANTHROPIC_BASE_URL ? getProxyToken() : null;
  return token ? { [PROXY_TOKEN_HEADER]: token } : {};
}

export function isHeadroomActive(): boolean {
  const cache = readHeadroomCache();
  if (cache !== null) {
    if (typeof cache.isActive === "boolean") return cache.isActive;
    // Legacy cache format had no isActive flag; non-null stats indicate a successful fetch.
    return cache.data !== null;
  }
  return true; // no cache yet — optimistic; background fetch will write real status
}

export function readHeadroomCache(): HeadroomCache | null {
  try {
    const raw = readFileSync(getCacheFilePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isCacheStale(): boolean {
  const retryAfter = readHeadroomCache()?.retryAfter;
  if (typeof retryAfter === "number" && Date.now() < retryAfter) return false;
  try {
    return Date.now() - statSync(getCacheFilePath()).mtimeMs > STALE_THRESHOLD_MS;
  } catch {
    return true;
  }
}

export function triggerHeadroomFetch(): void {
  if (!isCacheStale()) return;
  const child = spawn(
    process.execPath,
    [join(__dirname, "index.js"), "--fetch-headroom"],
    { detached: true, stdio: "ignore" }
  );
  child.unref();
}

/**
 * Sanitise a numeric value received from the Headroom HTTP API.
 * Coerces to a finite number, defaulting to `fallback` (0) if the value is
 * missing, non-numeric, NaN, or Infinity (js/http-to-file-access mitigation:
 * untrusted HTTP response data is normalised before being written to disk).
 */
function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function writeCacheFile(cache: HeadroomCache): void {
  writeFileSync(getCacheFilePath(), JSON.stringify(cache), "utf-8");
}

export async function fetchAndCacheHeadroom(): Promise<void> {
  const baseUrl = getHeadroomBaseUrl();
  const inactive: HeadroomCache = { fetchedAt: Date.now(), isActive: false, data: null };
  try {
    const hCtrl = new AbortController();
    const hTimer = setTimeout(() => hCtrl.abort(), 2000);
    const healthRes = await fetch(`${baseUrl}/health`, { signal: hCtrl.signal });
    clearTimeout(hTimer);

    if (!healthRes.ok) {
      writeCacheFile(inactive);
      return;
    }
    const health: any = await healthRes.json();
    if (health.status !== "healthy") {
      writeCacheFile(inactive);
      return;
    }

    const sCtrl = new AbortController();
    const sTimer = setTimeout(() => sCtrl.abort(), 2000);
    const statsRes = await fetch(`${baseUrl}/stats`, {
      signal: sCtrl.signal,
      headers: statsHeaders(),
    });
    clearTimeout(sTimer);
    if (statsRes.status === 401) {
      writeCacheFile({ ...inactive, retryAfter: Date.now() + AUTH_BACKOFF_MS });
      return;
    }
    if (!statsRes.ok) {
      writeCacheFile(inactive);
      return;
    }

    // Validate and normalise all fields from the HTTP response before persisting
    // to disk (js/http-to-file-access: untrusted HTTP data must not flow
    // unchecked into file writes).
    const raw: any = await statsRes.json();
    const stats: HeadroomStats = {
      compressionPct: safeNum(raw?.tokens?.savings_percent),
      tokensSaved: safeNum(raw?.tokens?.saved) + safeNum(raw?.tokens?.cli_tokens_avoided),
      cliTokensSaved: safeNum(raw?.tokens?.cli_tokens_avoided),
      costSavedUsd: safeNum(raw?.cost?.savings_usd),
      requests: safeNum(raw?.requests?.total),
      cacheHitRate: safeNum(raw?.prefix_cache?.totals?.hit_rate) / 100,
    };
    writeCacheFile({ fetchedAt: Date.now(), isActive: true, data: stats });
  } catch {
    writeCacheFile(inactive);
  }
}
