import { readFileSync, writeFileSync, statSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface HeadroomStats {
  compressionPct: number;
  tokensSaved: number;
  cliTokensSaved: number;
  costSavedUsd: number;
  requests: number;
  cacheHitRate: number;
}

interface HeadroomCache {
  fetchedAt: number;
  isActive: boolean;
  data: HeadroomStats | null;
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
const HEADROOM_FALLBACK_BASE = "http://127.0.0.1:8787";

function getHeadroomBaseUrl(): string {
  const envBase = process.env.ANTHROPIC_BASE_URL;
  return envBase ? envBase.replace(/\/$/, "") : HEADROOM_FALLBACK_BASE;
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

function isCacheStale(): boolean {
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
    const statsRes = await fetch(`${baseUrl}/stats`, { signal: sCtrl.signal });
    clearTimeout(sTimer);
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
