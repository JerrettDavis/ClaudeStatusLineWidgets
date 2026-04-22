export interface DataKeyInfo {
  key: string;
  displayName: string;
  description: string;
  category: string;
}

export const DATA_KEYS: DataKeyInfo[] = [
  { key: "context-usage", displayName: "Context Usage", description: "Context window utilization (bar, percent, remaining)", category: "Context" },
  { key: "context-size", displayName: "Context Size", description: "Raw context window size", category: "Context" },
  { key: "cache-health", displayName: "Cache Health", description: "Cache TTL, token counts, and warnings", category: "Cache" },
  { key: "usage-5h", displayName: "5h Rate Limit", description: "5-hour usage window (bar, percent, countdown, reset)", category: "Usage" },
  { key: "usage-7d", displayName: "7d Rate Limit", description: "7-day usage window (bar, percent, countdown, reset)", category: "Usage" },
  { key: "usage-runway", displayName: "Usage Runway", description: "Burn rate and estimated remaining active hours", category: "Usage" },
  { key: "usage-overage", displayName: "Usage Overage", description: "Extra usage / overage spend", category: "Usage" },
  { key: "headroom-stats", displayName: "Headroom Proxy", description: "Compression proxy stats (tokens, ratio, cost, cache hit)", category: "Headroom" },
  { key: "git-remote-origin", displayName: "Git Origin", description: "Origin remote info (owner, repo, owner/repo)", category: "Git" },
  { key: "git-remote-upstream", displayName: "Git Upstream", description: "Upstream remote info (owner, repo, owner/repo)", category: "Git" },
  { key: "git-working-tree", displayName: "Git Working Tree", description: "Staged, unstaged, untracked, conflicts", category: "Git" },
  { key: "git-worktree", displayName: "Git Worktree", description: "Worktree mode, name, branch", category: "Git" },
  { key: "token-counts", displayName: "Token Counts", description: "Input, output, total, and cached token counts", category: "Tokens" },
  { key: "token-speed", displayName: "Token Speed", description: "Input, output, and total throughput", category: "Tokens" },
];

export function getDataKeyInfo(key: string): DataKeyInfo | undefined {
  return DATA_KEYS.find((dk) => dk.key === key);
}
