/**
 * Pure type definitions for Headroom stats, free of Node-only imports.
 * Safe to import from the mod path.
 */

export interface HeadroomStats {
  /** Tokens savings percentage, as reported by /tokens, 0-100. */
  compressionPct: number;
  /** Total tokens saved (sum of cli + server side). */
  tokensSaved: number;
  /** Tokens saved by CLI cache hits alone. */
  cliTokensSaved: number;
  /** USD savings as reported by /cost. */
  costSavedUsd: number;
  /** Total number of requests processed by Headroom. */
  requests: number;
  /** Prefix cache hit rate, 0-1. */
  cacheHitRate: number;
}