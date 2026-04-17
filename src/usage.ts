import { readFileSync, writeFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir, homedir, platform } from "os";
import { execSync, spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Types ---

interface RateLimit {
  utilization: number | null;
  resets_at: string | null;
}

interface ExtraUsage {
  is_enabled: boolean;
  monthly_limit: number | null; // cents
  used_credits: number | null;  // cents
  utilization: number | null;
}

export interface UsageData {
  five_hour?: RateLimit | null;
  seven_day?: RateLimit | null;
  seven_day_opus?: RateLimit | null;
  seven_day_sonnet?: RateLimit | null;
  extra_usage?: ExtraUsage | null;
}

interface UsageCache {
  fetchedAt: number;
  data: UsageData;
  /** Unix timestamp (ms) — skip all fetches until after this time (rate-limited). */
  rateLimitedUntil?: number;
}

interface LockData {
  pid: number;
  lockedAt: number;
}

interface OAuthCredentials {
  claudeAiOauth?: {
    accessToken?: string;
    expiresAt?: number;
  };
}

// --- Constants ---

const CACHE_FILE = join(tmpdir(), "claude-statusline-usage.json");
const LOCK_FILE = join(tmpdir(), "claude-statusline-usage.lock");
const STALE_THRESHOLD_MS = 60_000; // 60 seconds
/** A lock older than this is considered stale/abandoned and will be overwritten. */
const LOCK_STALE_MS = 2 * 60_000; // 2 minutes
const API_URL = "https://api.anthropic.com/api/oauth/usage";

// --- Credential reading (cross-platform) ---

function getCredentialsPath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(configDir, ".credentials.json");
}

function readCredentials(): OAuthCredentials | null {
  // Try environment variable first (managed sessions)
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return {
      claudeAiOauth: {
        accessToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
        expiresAt: Date.now() + 3600_000, // assume valid
      },
    };
  }

  const plat = platform();

  if (plat === "darwin") {
    // macOS: try keychain first, fall back to file
    try {
      const hex = execSync(
        'security find-generic-password -a "$(whoami)" -w -s "Claude Code-credentials"',
        { timeout: 2000, stdio: ["pipe", "pipe", "pipe"] }
      ).toString().trim();
      if (hex) {
        const json = Buffer.from(hex, "hex").toString("utf-8");
        return JSON.parse(json);
      }
    } catch {
      // Fall through to file-based
    }
  }

  // Windows / Linux / macOS fallback: read plaintext file
  const credPath = getCredentialsPath();
  try {
    const raw = readFileSync(credPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAccessToken(): string | null {
  const creds = readCredentials();
  if (!creds?.claudeAiOauth?.accessToken) return null;

  // Check expiry — skip if token expired (can't refresh it ourselves)
  const expiresAt = creds.claudeAiOauth.expiresAt ?? 0;
  if (expiresAt < Date.now() - 60_000) return null; // expired >1min ago

  return creds.claudeAiOauth.accessToken;
}

// --- Cache file operations ---

export function readUsageCache(): UsageCache | null {
  try {
    const raw = readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeUsageCache(data: UsageData, rateLimitedUntil?: number): void {
  const cache: UsageCache = { fetchedAt: Date.now(), data };
  if (rateLimitedUntil !== undefined) cache.rateLimitedUntil = rateLimitedUntil;
  writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
}

function isCacheStale(): boolean {
  try {
    const stat = statSync(CACHE_FILE);
    if (Date.now() - stat.mtimeMs <= STALE_THRESHOLD_MS) return false;

    // Even if the mtime is old, respect any active rate-limit backoff.
    const cached = readUsageCache();
    if (cached?.rateLimitedUntil && Date.now() < cached.rateLimitedUntil) return false;

    return true;
  } catch {
    return true; // no cache file = stale
  }
}

// --- Lock helpers ---

/**
 * Acquire a PID-based lock file.  Returns true when the lock was taken,
 * false when another live process already holds it.  Stale locks (older
 * than LOCK_STALE_MS) are silently overwritten.
 */
function acquireLock(): boolean {
  try {
    const raw = readFileSync(LOCK_FILE, "utf-8");
    const lock: LockData = JSON.parse(raw);
    if (Date.now() - lock.lockedAt < LOCK_STALE_MS) {
      return false; // another process holds a fresh lock
    }
  } catch {
    // No lock file or parse error — proceed to acquire
  }
  try {
    writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, lockedAt: Date.now() }), "utf-8");
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  try {
    const raw = readFileSync(LOCK_FILE, "utf-8");
    const lock: LockData = JSON.parse(raw);
    if (lock.pid === process.pid) {
      // Zero out the lock rather than deleting the file so that the file
      // system entry is immediately visible to other processes checking
      // isLocked(), matching the approach used in session-tracking.ts.
      writeFileSync(LOCK_FILE, JSON.stringify({ pid: 0, lockedAt: 0 }), "utf-8");
    }
  } catch {
    // Non-fatal
  }
}

/** Returns true when a live (non-stale) lock is already held. */
function isLocked(): boolean {
  try {
    const raw = readFileSync(LOCK_FILE, "utf-8");
    const lock: LockData = JSON.parse(raw);
    return lock.pid !== 0 && Date.now() - lock.lockedAt < LOCK_STALE_MS;
  } catch {
    return false;
  }
}

// --- Background fetch ---

/**
 * Spawn a detached background process to fetch usage data.
 * The main render path never waits for this.
 * Skipped when the cache is still fresh, when a rate-limit backoff is active,
 * or when another process already holds the fetch lock.
 */
export function triggerBackgroundFetch(): void {
  if (!isCacheStale()) return;
  if (isLocked()) return; // another session already spawned a fetcher

  // Spawn ourselves with --fetch-usage flag, fully detached
  const child = spawn(
    process.execPath,
    [join(__dirname, "index.js"), "--fetch-usage"],
    {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, _STATUSLINE_BG: "1" },
    }
  );
  child.unref();
}

/**
 * Actually fetch usage data from the API and write to cache.
 * Called by the background process (--fetch-usage flag).
 * Uses a lock file to ensure only one fetch runs globally at a time.
 */
export async function fetchAndCacheUsage(): Promise<void> {
  const token = getAccessToken();
  if (!token) return;

  if (!acquireLock()) return; // another background process beat us to it

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 429) {
      // Rate limited — compute backoff from Retry-After header or fall back
      // to a 5-minute default so we don't hammer the API.
      //
      // The Retry-After header can be an integer (delay in seconds) or an
      // HTTP-date string per RFC 7231.  We handle both formats here.
      const retryAfterHeader = res.headers.get("retry-after");
      let backoffMs = 5 * 60_000; // 5-minute default
      if (retryAfterHeader) {
        const delaySec = parseInt(retryAfterHeader, 10);
        if (!isNaN(delaySec) && delaySec > 0) {
          backoffMs = delaySec * 1000;
        } else {
          // Try parsing as an HTTP-date string
          const retryDate = new Date(retryAfterHeader).getTime();
          if (!isNaN(retryDate) && retryDate > Date.now()) {
            backoffMs = retryDate - Date.now();
          }
        }
      }
      const existing = readUsageCache();
      // Preserve existing data (may be null/empty) and only update the backoff.
      writeUsageCache(existing?.data ?? {}, Date.now() + backoffMs);
      return;
    }

    if (!res.ok) return;

    const data: UsageData = await res.json();
    writeUsageCache(data);
  } catch {
    // Network error, timeout, etc. — silently ignore
  } finally {
    releaseLock();
  }
}
