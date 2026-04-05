import { statSync, openSync, readSync, closeSync } from "fs";

export interface CacheTTLResult {
  /** Seconds remaining on cache TTL. 0 = expired. -1 = no cache data found. */
  remainingSeconds: number;
  /** Which TTL tier: "5m", "1h", or "none" */
  tier: "5m" | "1h" | "none";
  /** Timestamp of the last cache write (ISO string) */
  lastWriteTime: string | null;
  /** Absolute expiration time (epoch ms). null if no cache data. */
  expiresAt: number | null;
  /** Whether this is from the current request's cache_read (still active) */
  cacheReadActive: boolean;
}

interface UsageData {
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

interface JournalEntry {
  timestamp?: string;
  message?: {
    usage?: UsageData;
  };
}

const TTL_5M = 5 * 60;
const TTL_1H = 60 * 60;

/**
 * Read the last N lines of a file efficiently.
 * Reads from end in chunks to avoid loading the entire file.
 */
function readLastLines(filePath: string, maxLines: number): string[] {
  let content: string;
  try {
    const stats = statSync(filePath);
    const fileSize = stats.size;
    // Read last 256KB or whole file if smaller
    const readSize = Math.min(fileSize, 256 * 1024);
    const buffer = Buffer.alloc(readSize);
    const fd = openSync(filePath, "r");
    readSync(fd, buffer, 0, readSize, fileSize - readSize);
    closeSync(fd);
    content = buffer.toString("utf-8");
  } catch {
    return [];
  }

  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(-maxLines);
}

/**
 * Compute cache TTL status from the session JSONL transcript.
 *
 * Strategy:
 * 1. Read last ~100 lines of the JSONL
 * 2. Scan backwards for the most recent entry with cache_creation_input_tokens > 0
 * 3. Determine TTL tier from cache_creation.ephemeral_5m vs ephemeral_1h
 * 4. Compute remaining = (write_timestamp + TTL) - now
 */
export function getCacheTTL(
  transcriptPath: string | undefined,
  currentCacheRead: number
): CacheTTLResult {
  const noData: CacheTTLResult = {
    remainingSeconds: -1,
    tier: "none",
    lastWriteTime: null,
    expiresAt: null,
    cacheReadActive: currentCacheRead > 0,
  };

  if (!transcriptPath) return noData;

  const lines = readLastLines(transcriptPath, 100);
  if (lines.length === 0) return noData;

  // Scan backwards for last cache write
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry: JournalEntry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }

    const usage = entry.message?.usage;
    if (!usage || !usage.cache_creation_input_tokens || usage.cache_creation_input_tokens <= 0) {
      continue;
    }

    const timestamp = entry.timestamp;
    if (!timestamp) continue;

    // Determine TTL tier
    const creation = usage.cache_creation;
    const is1h = (creation?.ephemeral_1h_input_tokens ?? 0) > 0;
    const is5m = (creation?.ephemeral_5m_input_tokens ?? 0) > 0;

    let ttlSeconds: number;
    let tier: "5m" | "1h";

    if (is1h) {
      ttlSeconds = TTL_1H;
      tier = "1h";
    } else if (is5m) {
      ttlSeconds = TTL_5M;
      tier = "5m";
    } else {
      // Has cache_creation tokens but no tier breakdown — assume 5m
      ttlSeconds = TTL_5M;
      tier = "5m";
    }

    const writeTime = new Date(timestamp).getTime();
    const expiresAt = writeTime + ttlSeconds * 1000;
    const now = Date.now();
    const remaining = Math.max(0, (expiresAt - now) / 1000);

    return {
      remainingSeconds: Math.round(remaining),
      tier,
      lastWriteTime: timestamp,
      expiresAt,
      cacheReadActive: currentCacheRead > 0,
    };
  }

  return noData;
}
