import { readFileSync, writeFileSync, statSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
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

const CACHE_FILE = join(tmpdir(), "claude-statusline-headroom.json");
const STALE_THRESHOLD_MS = 30_000; // 30 seconds — local call, cheap
const HEADROOM_FALLBACK_BASE = "http://127.0.0.1:8787";

function getHeadroomBaseUrl(): string {
  const envBase = process.env.ANTHROPIC_BASE_URL;
  return envBase ? envBase.replace(/\/$/, "") : HEADROOM_FALLBACK_BASE;
}

export function isHeadroomActive(): boolean {
  const cache = readHeadroomCache();
  if (cache !== null) return cache.isActive;
  return true; // no cache yet — optimistic; background fetch will write real status
}

export function readHeadroomCache(): HeadroomCache | null {
  try {
    const raw = readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isCacheStale(): boolean {
  try {
    return Date.now() - statSync(CACHE_FILE).mtimeMs > STALE_THRESHOLD_MS;
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

export async function fetchAndCacheHeadroom(): Promise<void> {
  const baseUrl = getHeadroomBaseUrl();
  const inactive: HeadroomCache = { fetchedAt: Date.now(), isActive: false, data: null };
  try {
    const hCtrl = new AbortController();
    const hTimer = setTimeout(() => hCtrl.abort(), 2000);
    const healthRes = await fetch(`${baseUrl}/health`, { signal: hCtrl.signal });
    clearTimeout(hTimer);

    if (!healthRes.ok) {
      writeFileSync(CACHE_FILE, JSON.stringify(inactive), "utf-8");
      return;
    }
    const health: any = await healthRes.json();
    if (health.status !== "healthy") {
      writeFileSync(CACHE_FILE, JSON.stringify(inactive), "utf-8");
      return;
    }

    const sCtrl = new AbortController();
    const sTimer = setTimeout(() => sCtrl.abort(), 2000);
    const statsRes = await fetch(`${baseUrl}/stats`, { signal: sCtrl.signal });
    clearTimeout(sTimer);
    if (!statsRes.ok) {
      writeFileSync(CACHE_FILE, JSON.stringify(inactive), "utf-8");
      return;
    }

    const raw: any = await statsRes.json();
    const stats: HeadroomStats = {
      compressionPct: raw.tokens?.savings_percent ?? 0,
      tokensSaved: (raw.tokens?.saved ?? 0) + (raw.tokens?.cli_tokens_avoided ?? 0),
      cliTokensSaved: raw.tokens?.cli_tokens_avoided ?? 0,
      costSavedUsd: raw.cost?.savings_usd ?? 0,
      requests: raw.requests?.total ?? 0,
      cacheHitRate: (raw.prefix_cache?.totals?.hit_rate ?? 0) / 100,
    };
    writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), isActive: true, data: stats }), "utf-8");
  } catch {
    writeFileSync(CACHE_FILE, JSON.stringify(inactive), "utf-8");
  }
}
