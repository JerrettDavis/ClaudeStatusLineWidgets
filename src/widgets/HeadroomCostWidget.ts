import { formatHeadroomCost } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { DATA_KEY } from "./data-keys.js";

export class HeadroomCostWidget implements Widget {
  getDisplayName() { return "Cost Saved"; }
  getDescription() { return "Headroom cost savings"; }
  getCategory() { return "Headroom"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return DATA_KEY.HEADROOM_STATS; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "$0.12 saved";
    return formatHeadroomCost(ctx.headroomStats);
  }
}
