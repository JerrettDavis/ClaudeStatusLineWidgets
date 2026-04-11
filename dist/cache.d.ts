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
/**
 * Compute cache TTL status from the session JSONL transcript.
 *
 * Strategy:
 * 1. Read last ~100 lines of the JSONL
 * 2. Scan backwards for the most recent entry with cache_creation_input_tokens > 0
 * 3. Determine TTL tier from cache_creation.ephemeral_5m vs ephemeral_1h
 * 4. Compute remaining = (write_timestamp + TTL) - now
 */
export declare function getCacheTTL(transcriptPath: string | undefined, currentCacheRead: number): CacheTTLResult;
/**
 * Compute session-wide cache token stats from the full transcript.
 *
 * A "break" is a cache write that occurred after the previous cache had expired
 * (or the very first cache write in the session). Reads the entire transcript
 * from the start (up to 2 MB) to accumulate totals.
 */
export declare function getCacheSessionStats(transcriptPath: string | undefined): CacheSessionStats;
