import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { tmpdir, homedir, platform } from "os";
import { execSync, spawn } from "child_process";

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
}

interface OAuthCredentials {
  claudeAiOauth?: {
    accessToken?: string;
    expiresAt?: number;
  };
}

// --- Constants ---

const CACHE_FILE = join(tmpdir(), "claude-statusline-usage.json");
const STALE_THRESHOLD_MS = 60_000; // 60 seconds
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

function writeUsageCache(data: UsageData): void {
  const cache: UsageCache = { fetchedAt: Date.now(), data };
  writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
}

function isCacheStale(): boolean {
  try {
    const stat = statSync(CACHE_FILE);
    return Date.now() - stat.mtimeMs > STALE_THRESHOLD_MS;
  } catch {
    return true; // no cache file = stale
  }
}

// --- Background fetch ---

/**
 * Spawn a detached background process to fetch usage data.
 * The main render path never waits for this.
 */
export function triggerBackgroundFetch(): void {
  if (!isCacheStale()) return;

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
 */
export async function fetchAndCacheUsage(): Promise<void> {
  const token = getAccessToken();
  if (!token) return;

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

    if (!res.ok) return;

    const data: UsageData = await res.json();
    writeUsageCache(data);
  } catch {
    // Network error, timeout, etc. — silently ignore
  }
}
