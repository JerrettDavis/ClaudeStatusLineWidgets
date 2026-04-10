import { formatCache } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { formatDurationCompact, getVariant, renderBadge, renderLabel } from "./helpers.js";

export class CacheTTLWidget implements Widget {
  getDisplayName() { return "Cache TTL"; }
  getDescription() { return "Cache expiry countdown"; }
  getCategory() { return "Context"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getVariants() { return ["time", "countdown", "badge"]; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const variant = getVariant(item, "time");
    const cache = ctx.isPreview
      ? {
          remainingSeconds: 180,
          tier: "5m" as const,
          lastWriteTime: null,
          expiresAt: Date.now() + 180_000,
          cacheReadActive: true,
        }
      : ctx.cacheTTL;

    if (variant === "countdown") {
      if (cache.remainingSeconds <= 0) return renderLabel("Cache", "expired", item, ctx);
      return renderLabel("Cache", formatDurationCompact(cache.remainingSeconds), item, ctx);
    }

    if (variant === "badge") {
      if (cache.remainingSeconds <= 0) return renderBadge("cache expired");
      return renderBadge(`${cache.tier} ${formatDurationCompact(cache.remainingSeconds)}`);
    }

    if (ctx.isPreview) {
      return formatCache(cache);
    }
    return formatCache(ctx.cacheTTL);
  }
}
