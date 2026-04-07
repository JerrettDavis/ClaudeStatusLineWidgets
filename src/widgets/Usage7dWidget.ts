import { formatUsage7d } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class Usage7dWidget implements Widget {
  getDisplayName() { return "7d Usage"; }
  getDescription() { return "7-day rate limit utilization"; }
  getCategory() { return "Usage"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "7d \u2588\u2591\u2591\u2591\u2591 20%";
    return formatUsage7d(ctx.usageData);
  }
}
