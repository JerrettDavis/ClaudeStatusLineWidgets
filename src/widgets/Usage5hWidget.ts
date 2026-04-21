import { formatUsage5h } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { formatDurationCompact, getVariant, renderLabel } from "./helpers.js";

export class Usage5hWidget implements Widget {
  getDisplayName() { return "5h Usage"; }
  getDescription() { return "5-hour rate limit utilization"; }
  getCategory() { return "Usage"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getVariants() { return ["bar", "percent", "countdown"]; }
  getDataKey() { return "usage-5h"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const variant = getVariant(item, "bar");
    if (variant === "countdown") {
      const seconds = ctx.isPreview ? 67 * 60 : ctx.runtime.usage.fiveHourResetSeconds;
      return seconds !== null ? renderLabel("5h Reset", formatDurationCompact(seconds), item, ctx) : null;
    }
    if (variant === "percent") {
      const pct = ctx.isPreview ? 35 : ctx.usageData?.five_hour?.utilization ?? null;
      return pct !== null ? renderLabel("5h", `${Math.round(pct)}%`, item, ctx) : null;
    }
    if (ctx.isPreview) return "5h \u2588\u2588\u2591\u2591\u2591 35%";
    return formatUsage5h(ctx.usageData);
  }
}
