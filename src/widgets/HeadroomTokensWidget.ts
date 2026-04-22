import { formatHeadroomTokens } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { DATA_KEY } from "./data-keys.js";

export class HeadroomTokensWidget implements Widget {
  getDisplayName() { return "Tokens Saved"; }
  getDescription() { return "Headroom tokens saved count"; }
  getCategory() { return "Headroom"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return DATA_KEY.HEADROOM_STATS; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "\u2696\uFE0F 491k tokens saved";
    return formatHeadroomTokens(ctx.headroomStats);
  }
}
