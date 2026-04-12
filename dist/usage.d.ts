interface RateLimit {
    utilization: number | null;
    resets_at: string | null;
}
interface ExtraUsage {
    is_enabled: boolean;
    monthly_limit: number | null;
    used_credits: number | null;
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
export declare function readUsageCache(): UsageCache | null;
/**
 * Spawn a detached background process to fetch usage data.
 * The main render path never waits for this.
 */
export declare function triggerBackgroundFetch(): void;
/**
 * Actually fetch usage data from the API and write to cache.
 * Called by the background process (--fetch-usage flag).
 */
export declare function fetchAndCacheUsage(): Promise<void>;
export {};
