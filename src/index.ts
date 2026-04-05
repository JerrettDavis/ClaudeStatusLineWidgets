import { getCacheTTL } from "./cache.js";
import { formatCache, formatModel, formatCost, formatContext } from "./segments.js";
import { dim } from "./colors.js";

interface StatusLinePayload {
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
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
    // Timeout after 1 second if no data
    setTimeout(() => resolve(Buffer.concat(chunks).toString("utf-8")), 1000);
  });
}

async function main(): Promise<void> {
  const input = await readStdin();
  if (!input.trim()) {
    process.stdout.write("○ No data\n");
    return;
  }

  let payload: StatusLinePayload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.stdout.write("○ Parse error\n");
    return;
  }

  const cacheRead = payload.context_window?.current_usage?.cache_read_input_tokens ?? 0;
  const cache = getCacheTTL(payload.transcript_path, cacheRead);

  const segments = [
    formatCache(cache),
    formatModel(payload.model ?? {}),
    formatCost(payload.cost?.total_cost_usd),
    formatContext(
      payload.context_window?.used_percentage,
      payload.context_window?.context_window_size
    ),
  ];

  process.stdout.write(segments.join(dim(" | ")) + "\n");
}

main().catch(() => {
  process.stdout.write("○ Error\n");
});
