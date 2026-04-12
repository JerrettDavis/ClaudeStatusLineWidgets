export interface WindowTokens {
    /** Regular (non-cached) input tokens */
    input: number;
    /** Output tokens */
    output: number;
    /** Cache-read input tokens */
    cacheReads: number;
    /** Cache-creation tokens for the 5-minute tier */
    cacheWrites5m: number;
    /** Cache-creation tokens for the 1-hour tier */
    cacheWrites1h: number;
    /** Total cache-creation tokens (sum of both tiers) */
    cacheWritesTotal: number;
}
export interface WindowRecord {
    /** ISO timestamp of the window start */
    start: string;
    /** ISO timestamp of the window end */
    end: string;
    tokens: WindowTokens;
    /** Per-model token breakdown within this window */
    byModel: Record<string, WindowTokens>;
    /**
     * Proportionally-weighted token equivalent (Sonnet-normalised).
     *
     * Each model's total tokens (input + output + cache reads + cache writes) are
     * multiplied by a family weight, then summed.  Unattributed tokens (entries
     * without a model field) are included at the default weight (1.0).
     *
     * This value lets you correlate transcript token spend against the API
     * utilisation percentage to back-calculate the effective window capacity.
     */
    weightedTokenEquivalent: number;
    /**
     * The weight applied per model ID when computing `weightedTokenEquivalent`.
     * Stored so historical records can be re-analysed with revised weights.
     */
    modelWeights: Record<string, number>;
}
/** Snapshot of API-reported utilisation percentages and overage at poll time */
export interface ApiStats {
    /** 5-hour rate-limit utilisation (0–100), or null if unavailable */
    five_hour_pct: number | null;
    /** 7-day rate-limit utilisation (0–100), or null if unavailable */
    seven_day_pct: number | null;
    /** Overage credits consumed in USD, or null if overage is disabled */
    overage_used_usd: number | null;
    /** Overage monthly cap in USD, or null if no cap is set */
    overage_limit_usd: number | null;
    /** Overage utilisation (0–100), or null if unavailable */
    overage_pct: number | null;
}
export interface TrackingRecord {
    /** ISO timestamp when this record was produced */
    polledAt: string;
    /** API-reported utilisation and overage stats at poll time */
    apiStats: ApiStats;
    windows: {
        five_hour?: WindowRecord;
        seven_day?: WindowRecord;
        seven_day_opus?: WindowRecord;
        seven_day_sonnet?: WindowRecord;
    };
}
export declare function getTrackingDir(): string;
/**
 * Find all Claude session transcript .jsonl files under ~/.claude/projects.
 */
export declare function findTranscriptFiles(): string[];
/** Default (Sonnet-normalised) weights for known Claude model families. */
export declare const MODEL_FAMILY_WEIGHTS: Record<string, number>;
/** Weight to apply when the model ID is absent or unrecognised. */
export declare const DEFAULT_MODEL_WEIGHT = 1;
/**
 * Derive a Sonnet-normalised weight from a model ID string by matching against
 * known family names using word-boundary patterns (e.g. "claude-opus-4-5"
 * matches "opus" but "super-haiku-opus-variant" correctly resolves to "opus").
 * Falls back to the default weight when no family is recognised.
 */
export declare function getModelWeight(modelId: string): number;
export interface WindowData {
    tokens: WindowTokens;
    byModel: Record<string, WindowTokens>;
    /** Sonnet-normalised weighted token equivalent (see WindowRecord docs). */
    weightedTokenEquivalent: number;
    /** Per-model weights used when computing weightedTokenEquivalent. */
    modelWeights: Record<string, number>;
}
/**
 * Scan all transcript files and sum token usage for entries whose timestamp
 * falls within [startMs, endMs). Returns aggregate totals, a per-model
 * breakdown, and a Sonnet-normalised weighted token equivalent.
 */
export declare function computeWindowData(startMs: number, endMs: number): WindowData;
/**
 * @deprecated Use computeWindowData instead.
 * Retained for any external consumers; delegates to computeWindowData.
 */
export declare function computeWindowTokens(startMs: number, endMs: number): WindowTokens;
/**
 * Perform session tracking: compute window tokens from all transcripts and
 * persist the result. Called by the background child process.
 */
export declare function performSessionTracking(): Promise<void>;
/**
 * Spawn a fully-detached background process to perform session tracking.
 * Returns immediately; the main render path is never blocked.
 */
export declare function triggerSessionTracking(): void;
