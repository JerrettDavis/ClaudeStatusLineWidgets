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
export declare function isHeadroomActive(): boolean;
export declare function readHeadroomCache(): HeadroomCache | null;
export declare function triggerHeadroomFetch(): void;
export declare function fetchAndCacheHeadroom(): Promise<void>;
export {};
