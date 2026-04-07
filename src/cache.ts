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

export interface CacheSessionStats {
  /** Cumulative cache_read_input_tokens across the session */
  totalReads: number;
  /** Cumulative cache_creation_input_tokens across the session */
  totalWrites: number;
  /** Number of distinct cache breaks (write after expiry, or first write) */
  breakCount: number;
  /** ISO timestamp of the most recent break */
  lastBreakTime: string | null;
  /** Token count of the most recent break (for large-rewrite detection) */
  lastBreakTokens: number;
  /** Average token count per break (for comparison) */
  avgBreakTokens: number;
}

const TTL_5M = 5 * 60;
const TTL_1H = 60 * 60;

/**
 * Read all lines from a file, up to maxBytes from the start.
 */
function readFromStart(filePath: string, maxBytes: number = 2 * 1024 * 1024): string[] {
  let content: string;
  try {
    const stats = statSync(filePath);
    const readSize = Math.min(stats.size, maxBytes);
    const buffer = Buffer.alloc(readSize);
    const fd = openSync(filePath, "r");
    readSync(fd, buffer, 0, readSize, 0);
    closeSync(fd);
    content = buffer.toString("utf-8");
  } catch {
    return [];
  }
  return content.split("\n").filter((l) => l.trim().length > 0);
}

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

/**
 * Compute session-wide cache token stats from the full transcript.
 *
 * A "break" is a cache write that occurred after the previous cache had expired
 * (or the very first cache write in the session). Reads the entire transcript
 * from the start (up to 2 MB) to accumulate totals.
 */
export function getCacheSessionStats(
  transcriptPath: string | undefined
): CacheSessionStats {
  const empty: CacheSessionStats = {
    totalReads: 0,
    totalWrites: 0,
    breakCount: 0,
    lastBreakTime: null,
    lastBreakTokens: 0,
    avgBreakTokens: 0,
  };

  if (!transcriptPath) return empty;

  const lines = readFromStart(transcriptPath);
  if (lines.length === 0) return empty;

  let totalReads = 0;
  let totalWrites = 0;

  // Track each distinct cache-break event
  const breaks: { tokens: number; time: string }[] = [];

  // Track the expiry time of the last write to detect new breaks
  let lastExpiresAt: number | null = null;

  for (const line of lines) {
    let entry: JournalEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const usage = entry.message?.usage;
    if (!usage) continue;

    if (usage.cache_read_input_tokens) {
      totalReads += usage.cache_read_input_tokens;
    }

    const written = usage.cache_creation_input_tokens ?? 0;
    if (written > 0 && entry.timestamp) {
      totalWrites += written;

      const writeMs = new Date(entry.timestamp).getTime();
      const isBreak = lastExpiresAt === null || writeMs > lastExpiresAt;

      if (isBreak) {
        breaks.push({ tokens: written, time: entry.timestamp });
      }

      // Determine TTL for this write to project its expiry
      const creation = usage.cache_creation;
      const ttlSeconds =
        (creation?.ephemeral_1h_input_tokens ?? 0) > 0 ? TTL_1H : TTL_5M;
      lastExpiresAt = writeMs + ttlSeconds * 1000;
    }
  }

  if (breaks.length === 0) return { ...empty, totalReads, totalWrites };

  const lastBreak = breaks[breaks.length - 1];
  const avgBreakTokens = Math.round(
    breaks.reduce((s, b) => s + b.tokens, 0) / breaks.length
  );

  return {
    totalReads,
    totalWrites,
    breakCount: breaks.length,
    lastBreakTime: lastBreak.time,
    lastBreakTokens: lastBreak.tokens,
    avgBreakTokens,
  };
}
