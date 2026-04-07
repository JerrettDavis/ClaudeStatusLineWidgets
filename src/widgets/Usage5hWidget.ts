import { formatUsage5h } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class Usage5hWidget implements Widget {
  getDisplayName() { return "5h Usage"; }
  getDescription() { return "5-hour rate limit utilization"; }
  getCategory() { return "Usage"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "5h \u2588\u2588\u2591\u2591\u2591 35%";
    return formatUsage5h(ctx.usageData);
  }
}
