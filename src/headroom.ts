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
  data: HeadroomStats;
}

const CACHE_FILE = join(tmpdir(), "claude-statusline-headroom.json");
const STALE_THRESHOLD_MS = 30_000; // 30 seconds — local call, cheap
const HEADROOM_URL = "http://127.0.0.1:8787/stats";

export function isHeadroomActive(): boolean {
  const base = process.env.ANTHROPIC_BASE_URL ?? "";
  return base.includes("127.0.0.1:8787") || base.includes("localhost:8787");
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(HEADROOM_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return;

    const raw: any = await res.json();
    const stats: HeadroomStats = {
      compressionPct: raw.tokens?.savings_percent ?? 0,
      tokensSaved: (raw.tokens?.saved ?? 0) + (raw.tokens?.cli_tokens_avoided ?? 0),
      cliTokensSaved: raw.tokens?.cli_tokens_avoided ?? 0,
      costSavedUsd: raw.cost?.savings_usd ?? 0,
      requests: raw.requests?.total ?? 0,
      cacheHitRate: raw.prefix_cache?.totals?.hit_rate ?? 0,
    };
    const cache: HeadroomCache = { fetchedAt: Date.now(), data: stats };
    writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch {
    // Headroom not running or unreachable — silently ignore
  }
}
