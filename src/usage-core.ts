/**
 * Pure type definitions for OAuth usage data, free of Node-only imports.
 * Safe to import from the mod path.
 */

export interface RateLimit {
  utilization: number | null;
  resets_at: string | null;
}

export interface UsageData {
  five_hour?: RateLimit;
  seven_day?: RateLimit;
  seven_day_opus?: RateLimit;
  seven_day_sonnet?: RateLimit;
  extra_usage?: {
    is_enabled: boolean;
    monthly_limit: number | null;
    used_credits: number | null;
    utilization: number;
  };
}