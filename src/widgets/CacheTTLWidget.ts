import { formatCache } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class CacheTTLWidget implements Widget {
  getDisplayName() { return "Cache TTL"; }
  getDescription() { return "Cache expiry countdown"; }
  getCategory() { return "Context"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) {
      return formatCache({
        remainingSeconds: 180,
        tier: "5m",
        lastWriteTime: null,
        expiresAt: Date.now() + 180_000,
        cacheReadActive: true,
      });
    }
    return formatCache(ctx.cacheTTL);
  }
}
