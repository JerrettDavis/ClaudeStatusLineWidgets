/**
 * Pure type definitions for cache data, free of any Node-only imports.
 * Safe to import from the mod path. The Node-using implementation lives
 * in `cache.ts`; the mod implementation lives in `cache-mod.ts`.
 */

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