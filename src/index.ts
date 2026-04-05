import { getCacheTTL } from "./cache.js";
import {
  formatCache, formatModel, formatCost, formatContext,
  formatPath, formatBranch,
} from "./segments.js";
import { dim } from "./colors.js";

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

  const cacheRead = payload.context_window?.current_usage?.cache_read_input_tokens ?? 0;
  const cache = getCacheTTL(payload.transcript_path, cacheRead);
  const cwd = payload.cwd ?? payload.workspace?.current_dir;

  const segments: string[] = [
    formatPath(cwd),
    formatBranch(payload.git_branch),
    formatModel(payload.model ?? {}, payload.context_window?.context_window_size),
    formatCost(payload.cost?.total_cost_usd),
    formatContext(payload.context_window?.used_percentage),
    formatCache(cache),
  ].filter((s): s is string => s !== null);

  process.stdout.write(segments.join(dim(" | ")) + "\n");
}

main().catch(() => {
  process.stdout.write("\n");
});
