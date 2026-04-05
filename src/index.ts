import { getCacheTTL } from "./cache.js";
import {
  formatCache, formatModel, formatCost, formatContext,
  formatPath, formatBranch, formatUsageSegments,
} from "./segments.js";
import { dim, visibleLength } from "./colors.js";
import { readUsageCache, triggerBackgroundFetch, fetchAndCacheUsage } from "./usage.js";
import { execSync } from "child_process";

// Claude Code's statusline area is narrower than the full terminal.
// Subtract padding to avoid false single-line renders that clip.
const CHROME_PADDING = 6;

function getTerminalWidth(): number {
  // 1. stdout columns (works when stdout is a TTY)
  if (process.stdout.columns) return process.stdout.columns - CHROME_PADDING;

  // 2. stderr columns (often still a TTY when stdout is piped)
  if (process.stderr.columns) return process.stderr.columns - CHROME_PADDING;

  // 3. COLUMNS env var
  const envCols = parseInt(process.env.COLUMNS ?? "", 10);
  if (envCols > 0) return envCols - CHROME_PADDING;

  // 4. Platform-specific detection
  try {
    if (process.platform !== "win32") {
      const out = execSync("tput cols 2>/dev/null", {
        encoding: "utf-8",
        timeout: 500,
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
      const cols = parseInt(out, 10);
      if (cols > 0) return cols - CHROME_PADDING;
    } else {
      const out = execSync("mode con", {
        encoding: "utf-8",
        timeout: 500,
        stdio: ["pipe", "pipe", "ignore"],
      });
      const match = out.match(/Columns:\s*(\d+)/i);
      if (match) {
        const cols = parseInt(match[1], 10);
        if (cols > 0) return cols - CHROME_PADDING;
      }
    }
  } catch {
    // Fall through
  }

  return 120;
}

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

  const segments: string[] = [
    formatPath(cwd),
    formatBranch(payload.git_branch),
    formatModel(payload.model ?? {}),
    formatCost(payload.cost?.total_cost_usd),
    formatContext(payload.context_window?.used_percentage),
    ...formatUsageSegments(usageCache?.data ?? null),
    formatCache(cache),
  ].filter((s): s is string => s !== null);

  const sep = dim(" | ");
  const sepWidth = visibleLength(sep);
  const termWidth = getTerminalWidth();

  // Greedily pack segments into lines that fit the terminal width
  const lines: string[][] = [[]];
  let lineWidth = 0;

  for (const seg of segments) {
    const segWidth = visibleLength(seg);
    const needed = lineWidth === 0 ? segWidth : sepWidth + segWidth;

    if (lineWidth > 0 && lineWidth + needed > termWidth) {
      // Overflow — start a new line
      lines.push([seg]);
      lineWidth = segWidth;
    } else {
      lines[lines.length - 1].push(seg);
      lineWidth += needed;
    }
  }

  const output = lines.map((l) => l.join(sep)).join("\n");
  // Extra trailing blank line to cover Claude Code's UI chrome
  process.stdout.write(output + "\n\n");
}

main().catch(() => {
  process.stdout.write("\n");
});
