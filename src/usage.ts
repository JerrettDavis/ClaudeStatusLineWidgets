import { readFileSync, writeFileSync, statSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir, platform } from "os";
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

/**
 * Cache directory for usage data: stored inside the Claude config directory
 * (~/.claude/.cache/ or $CLAUDE_CONFIG_DIR/.cache/) rather than in the
 * world-writable system tmpdir.  This avoids insecure-temporary-file
 * findings (js/insecure-temporary-file) while still allowing all processes
 * belonging to the same user to share a single cache location.
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

// Lazily initialised so mkdirSync runs after process start, not at import time.
let _cacheDir: string | null = null;
function cacheDir(): string {
  if (!_cacheDir) _cacheDir = getCacheDir();
  return _cacheDir;
}

/** Resolved absolute path to the usage cache file. */
export function getCacheFilePath(): string {
  return resolve(cacheDir(), "usage.json");
}

function getLockFilePath(): string {
  return resolve(cacheDir(), "usage.lock");
}

const STALE_THRESHOLD_MS = 60_000; // 60 seconds
/** A lock older than this is considered stale/abandoned and will be overwritten. */
const LOCK_STALE_MS = 2 * 60_000; // 2 minutes
const API_URL = "https://api.anthropic.com/api/oauth/usage";

// --- Credential reading (cross-platform) ---

function getCredentialsPath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(configDir, ".credentials.json");
}

/**
 * Decode a raw credential payload read from the macOS keychain.
 *
 * The keychain item may hold either plain JSON or a hex-encoded payload
 * depending on which Claude Code version wrote it.  `Buffer.from(x, "hex")`
 * stops at the first invalid pair and silently returns an empty buffer for
 * non-hex input, so the encoding must be detected rather than assumed —
 * otherwise a plain-JSON payload decodes to "" and JSON.parse throws.
 */
export function decodeCredentialPayload(raw: string): string {
  const isHex = raw.length > 0 && raw.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(raw);
  return isHex ? Buffer.from(raw, "hex").toString("utf-8") : raw;
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
      const raw = execSync(
        'security find-generic-password -a "$(whoami)" -w -s "Claude Code-credentials"',
        { timeout: 2000, stdio: ["pipe", "pipe", "pipe"] }
      ).toString().trim();
      if (raw) {
        return JSON.parse(decodeCredentialPayload(raw));
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

/**
 * Validate that a string looks like a well-formed OAuth bearer token before
 * it is sent in an Authorization header (js/file-access-to-http mitigation).
 * Accepts only non-empty strings composed of printable ASCII characters
 * (Base64url, dots, hyphens, underscores, tildes) — no whitespace or control
 * characters — which covers all JWT and opaque-token formats used by Anthropic.
 */
function isValidBearerToken(value: string): boolean {
  // Must be non-empty and contain only safe printable characters (no whitespace/control chars)
  return value.length > 0 && /^[\x21-\x7E]+$/.test(value);
}

function getAccessToken(): string | null {
  const creds = readCredentials();
  const token = creds?.claudeAiOauth?.accessToken;
  if (!token) return null;

  // Check expiry — skip if token expired (can't refresh it ourselves)
  const expiresAt = creds.claudeAiOauth?.expiresAt ?? 0;
  if (expiresAt < Date.now() - 60_000) return null; // expired >1min ago

  // Validate token format before it flows into an HTTP Authorization header
  // (prevents malformed/injected data from credentials file reaching the network)
  if (!isValidBearerToken(token)) return null;

  return token;
}

// --- Cache file operations ---

export function readUsageCache(): UsageCache | null {
  try {
    const raw = readFileSync(getCacheFilePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeUsageCache(data: UsageData, rateLimitedUntil?: number): void {
  const cache: UsageCache = { fetchedAt: Date.now(), data };
  if (rateLimitedUntil !== undefined) cache.rateLimitedUntil = rateLimitedUntil;
  writeFileSync(getCacheFilePath(), JSON.stringify(cache), "utf-8");
}

function isCacheStale(): boolean {
  try {
    const stat = statSync(getCacheFilePath());
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
    const raw = readFileSync(getLockFilePath(), "utf-8");
    const lock: LockData = JSON.parse(raw);
    if (Date.now() - lock.lockedAt < LOCK_STALE_MS) {
      return false; // another process holds a fresh lock
    }
  } catch {
    // No lock file or parse error — proceed to acquire
  }
  try {
    writeFileSync(getLockFilePath(), JSON.stringify({ pid: process.pid, lockedAt: Date.now() }), "utf-8");
    return true;
  } catch {
    return false;
  }
}

function releaseLock(): void {
  try {
    const raw = readFileSync(getLockFilePath(), "utf-8");
    const lock: LockData = JSON.parse(raw);
    if (lock.pid === process.pid) {
      // Zero out the lock rather than deleting the file so that the file
      // system entry is immediately visible to other processes checking
      // isLocked(), matching the approach used in session-tracking.ts.
      writeFileSync(getLockFilePath(), JSON.stringify({ pid: 0, lockedAt: 0 }), "utf-8");
    }
  } catch {
    // Non-fatal
  }
}

/** Returns true when a live (non-stale) lock is already held. */
function isLocked(): boolean {
  try {
    const raw = readFileSync(getLockFilePath(), "utf-8");
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
 * Normalise a rate-limit window object from the API response.
 * Returns null if the input is not a plain object.
 */
function sanitiseRateLimit(v: unknown): RateLimit | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  return {
    utilization: typeof r.utilization === "number" && Number.isFinite(r.utilization)
      ? r.utilization : null,
    resets_at: typeof r.resets_at === "string" ? r.resets_at : null,
  };
}

/**
 * Normalise the raw HTTP response body into a safe UsageData shape.
 * Only known fields with expected types are propagated; all other fields
 * are discarded (js/http-to-file-access mitigation: untrusted network data
 * must not flow unchecked into a file write).
 */
function sanitiseUsageData(raw: unknown): UsageData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const result: UsageData = {};
  if (r.five_hour !== undefined) result.five_hour = sanitiseRateLimit(r.five_hour);
  if (r.seven_day !== undefined) result.seven_day = sanitiseRateLimit(r.seven_day);
  if (r.seven_day_opus !== undefined) result.seven_day_opus = sanitiseRateLimit(r.seven_day_opus);
  if (r.seven_day_sonnet !== undefined) result.seven_day_sonnet = sanitiseRateLimit(r.seven_day_sonnet);
  if (r.extra_usage && typeof r.extra_usage === "object" && !Array.isArray(r.extra_usage)) {
    const eu = r.extra_usage as Record<string, unknown>;
    result.extra_usage = {
      is_enabled: typeof eu.is_enabled === "boolean" ? eu.is_enabled : false,
      monthly_limit: typeof eu.monthly_limit === "number" ? eu.monthly_limit : null,
      used_credits: typeof eu.used_credits === "number" ? eu.used_credits : null,
      utilization: typeof eu.utilization === "number" && Number.isFinite(eu.utilization)
        ? eu.utilization : null,
    };
  }
  return result;
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

    // Sanitise the HTTP response before writing to disk (js/http-to-file-access
    // mitigation: untrusted network data is normalised to a known-safe shape
    // rather than written verbatim).
    const raw: any = await res.json();
    const data: UsageData = sanitiseUsageData(raw);
    writeUsageCache(data);
  } catch {
    // Network error, timeout, etc. — silently ignore
  } finally {
    releaseLock();
  }
}
