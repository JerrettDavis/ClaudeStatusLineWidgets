import { formatHeadroomTokens } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class HeadroomTokensWidget implements Widget {
  getDisplayName() { return "Tokens Saved"; }
  getDescription() { return "Headroom tokens saved count"; }
  getCategory() { return "Headroom"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return "headroom-stats"; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "\u2696\uFE0F 491k tokens saved";
    return formatHeadroomTokens(ctx.headroomStats);
  }
}
