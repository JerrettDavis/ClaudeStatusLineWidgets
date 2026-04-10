import { formatUsageOverage } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { getVariant, renderLabel } from "./helpers.js";

export class UsageOverageWidget implements Widget {
  getDisplayName() { return "Overage"; }
  getDescription() { return "Extra usage / overage spend"; }
  getCategory() { return "Usage"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getVariants() { return ["bar", "percent"]; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const variant = getVariant(item, "bar");
    if (variant === "percent") {
      const pct = ctx.isPreview ? 25 : ctx.usageData?.extra_usage?.utilization ?? null;
      return pct !== null ? renderLabel("Overage", `${Math.round(pct)}%`, item, ctx) : null;
    }
    if (ctx.isPreview) return "+$5/$20 \u2588\u2591\u2591\u2591\u2591 25%";
    return formatUsageOverage(ctx.usageData);
  }
}
