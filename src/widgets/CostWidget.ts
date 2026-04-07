import { formatCost } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class CostWidget implements Widget {
  getDisplayName() { return "Cost"; }
  getDescription() { return "Session cost in USD"; }
  getCategory() { return "Session"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "$0.45";
    return formatCost(ctx.payload.cost?.total_cost_usd);
  }
}
