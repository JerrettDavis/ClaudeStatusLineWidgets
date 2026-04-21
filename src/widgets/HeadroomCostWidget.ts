import { formatHeadroomCost } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class HeadroomCostWidget implements Widget {
  getDisplayName() { return "Cost Saved"; }
  getDescription() { return "Headroom cost savings"; }
  getCategory() { return "Headroom"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return "headroom-stats"; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "$0.12 saved";
    return formatHeadroomCost(ctx.headroomStats);
  }
}
