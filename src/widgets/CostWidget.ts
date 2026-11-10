import { formatCost } from "../segments.js";
import { tokensToAnsi } from "../colors.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class CostWidget implements Widget {
  getDisplayName() { return "Cost"; }
  getDescription() { return "Session cost in USD"; }
  getCategory() { return "Session"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "$0.45";
    // Codex is subscription-billed and usually reports no cost; don't show a fake $0.00.
    if (ctx.provider === "codex" && !ctx.payload.cost?.total_cost_usd) return null;
    const tokens = formatCost(ctx.payload.cost?.total_cost_usd);
    return tokens ? tokensToAnsi(tokens) : null;
  }
}
