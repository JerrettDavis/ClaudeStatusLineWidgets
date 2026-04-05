import { getCacheTTL } from "./cache.js";
import {
  formatCache, formatModel, formatCost, formatContext,
  formatPath, formatBranch, formatUsageSegments,
} from "./segments.js";
import { dim } from "./colors.js";
import { readUsageCache, triggerBackgroundFetch, fetchAndCacheUsage } from "./usage.js";

interface StatusLinePayload {
  cwd?: string;
  workspace?: {
    current_dir?: string;
    project_dir?: string;
  };
  model?: {
    id?: string;
    display_name?: string;
  };
  cost?: {
    total_cost_usd?: number;
  };
  context_window?: {
    used_percentage?: number | null;
    context_window_size?: number;
    current_usage?: {
      cache_read_input_tokens?: number;
    };
  };
  transcript_path?: string;
  git_branch?: string;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
    setTimeout(() => resolve(Buffer.concat(chunks).toString("utf-8")), 1000);
  });
}

async function main(): Promise<void> {
  // Background fetch mode: called by detached child to update usage cache
  if (process.argv.includes("--fetch-usage")) {
    await fetchAndCacheUsage();
    return;
  }

  const input = await readStdin();
  if (!input.trim()) {
    process.stdout.write("\n");
    return;
  }

  let payload: StatusLinePayload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.stdout.write("\n");
    return;
  }

  // Kick off background usage fetch if cache is stale (non-blocking)
  triggerBackgroundFetch();

  const cacheRead = payload.context_window?.current_usage?.cache_read_input_tokens ?? 0;
  const cache = getCacheTTL(payload.transcript_path, cacheRead);
  const cwd = payload.cwd ?? payload.workspace?.current_dir;
  const usageCache = readUsageCache();

  const sep = dim(" | ");

  // Line 1: path, branch, model, cost, context, cache
  const line1: string[] = [
    formatPath(cwd),
    formatBranch(payload.git_branch),
    formatModel(payload.model ?? {}),
    formatCost(payload.cost?.total_cost_usd),
    formatContext(payload.context_window?.used_percentage),
    formatCache(cache),
  ].filter((s): s is string => s !== null);

  // Line 2: API usage (only if data available)
  const line2 = formatUsageSegments(usageCache?.data ?? null);

  const output = [
    line1.join(sep),
    ...(line2.length > 0 ? [line2.join(sep)] : []),
  ].join("\n");

  process.stdout.write(output + "\n\n");
}

main().catch(() => {
  process.stdout.write("\n");
});
