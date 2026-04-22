import { formatCacheStats, compactTokens } from "../segments.js";
import { dim, yellow } from "../colors.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { DATA_KEY } from "./data-keys.js";

export class CacheTokensWidget implements Widget {
  getDisplayName() { return "Cache Tokens"; }
  getDescription() { return "Session cache reads, writes, break count, and last break time"; }
  getCategory() { return "Cache"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return DATA_KEY.CACHE_HEALTH; }

  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) {
      // Show a representative preview including a large-rewrite indicator
      const reads = dim(`↓${compactTokens(1_230_000)}`);
      const writes = dim(`↑${compactTokens(456_000)}`);
      const breaks = yellow("3↺ 2:34p");
      return `${reads} ${writes} ${breaks}`;
    }
    return formatCacheStats(ctx.cacheStats);
  }
}
