import { formatUsageOverage } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class UsageOverageWidget implements Widget {
  getDisplayName() { return "Overage"; }
  getDescription() { return "Extra usage / overage spend"; }
  getCategory() { return "Usage"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "+$5/$20 \u2588\u2591\u2591\u2591\u2591 25%";
    return formatUsageOverage(ctx.usageData);
  }
}
