export const DATA_KEY = {
  CONTEXT_USAGE: "context-usage",
  CONTEXT_SIZE: "context-size",
  CACHE_HEALTH: "cache-health",
  USAGE_5H: "usage-5h",
  USAGE_7D: "usage-7d",
  USAGE_RUNWAY: "usage-runway",
  USAGE_OVERAGE: "usage-overage",
  HEADROOM_STATS: "headroom-stats",
  GIT_REMOTE_ORIGIN: "git-remote-origin",
  GIT_REMOTE_UPSTREAM: "git-remote-upstream",
  GIT_WORKING_TREE: "git-working-tree",
  GIT_WORKTREE: "git-worktree",
  TOKEN_COUNTS: "token-counts",
  TOKEN_SPEED: "token-speed",
} as const;

export type BuiltInDataKey = typeof DATA_KEY[keyof typeof DATA_KEY];

export interface DataKeyInfo {
  key: BuiltInDataKey;
  displayName: string;
  description: string;
  category: string;
}

export const DATA_KEYS: DataKeyInfo[] = [
  { key: DATA_KEY.CONTEXT_USAGE, displayName: "Context Usage", description: "Context window utilization (bar, percent, remaining)", category: "Context" },
  { key: DATA_KEY.CONTEXT_SIZE, displayName: "Context Size", description: "Raw context window size", category: "Context" },
  { key: DATA_KEY.CACHE_HEALTH, displayName: "Cache Health", description: "Cache TTL, token counts, and warnings", category: "Cache" },
  { key: DATA_KEY.USAGE_5H, displayName: "5h Rate Limit", description: "5-hour usage window (bar, percent, countdown, reset)", category: "Usage" },
  { key: DATA_KEY.USAGE_7D, displayName: "7d Rate Limit", description: "7-day usage window (bar, percent, countdown, reset)", category: "Usage" },
  { key: DATA_KEY.USAGE_RUNWAY, displayName: "Usage Runway", description: "Burn rate and estimated remaining active hours", category: "Usage" },
  { key: DATA_KEY.USAGE_OVERAGE, displayName: "Usage Overage", description: "Extra usage / overage spend", category: "Usage" },
  { key: DATA_KEY.HEADROOM_STATS, displayName: "Headroom Proxy", description: "Compression proxy stats (tokens, ratio, cost, cache hit)", category: "Headroom" },
  { key: DATA_KEY.GIT_REMOTE_ORIGIN, displayName: "Git Origin", description: "Origin remote info (owner, repo, owner/repo)", category: "Git" },
  { key: DATA_KEY.GIT_REMOTE_UPSTREAM, displayName: "Git Upstream", description: "Upstream remote info (owner, repo, owner/repo)", category: "Git" },
  { key: DATA_KEY.GIT_WORKING_TREE, displayName: "Git Working Tree", description: "Staged, unstaged, untracked, conflicts", category: "Git" },
  { key: DATA_KEY.GIT_WORKTREE, displayName: "Git Worktree", description: "Worktree mode, name, branch", category: "Git" },
  { key: DATA_KEY.TOKEN_COUNTS, displayName: "Token Counts", description: "Input, output, total, and cached token counts", category: "Tokens" },
  { key: DATA_KEY.TOKEN_SPEED, displayName: "Token Speed", description: "Input, output, and total throughput", category: "Tokens" },
];

export function getDataKeyInfo(key: string): DataKeyInfo | undefined {
  return DATA_KEYS.find((dk) => dk.key === key);
}
