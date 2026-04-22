import { formatHeadroomCacheHit } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { DATA_KEY } from "./data-keys.js";

export class HeadroomCacheHitWidget implements Widget {
  getDisplayName() { return "Cache Hit Rate"; }
  getDescription() { return "Headroom prefix cache hit rate"; }
  getCategory() { return "Headroom"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return DATA_KEY.HEADROOM_STATS; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "78% cache hit";
    return formatHeadroomCacheHit(ctx.headroomStats);
  }
}
