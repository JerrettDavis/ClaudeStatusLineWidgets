import { formatHeadroomCompression } from "../segments.js";
import { tokensToAnsi } from "../colors.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { DATA_KEY } from "./data-keys.js";

export class HeadroomCompressionWidget implements Widget {
  getDisplayName() { return "Compression"; }
  getDescription() { return "Headroom compression percentage"; }
  getCategory() { return "Headroom"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return DATA_KEY.HEADROOM_STATS; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "34% compressed";
    const tokens = formatHeadroomCompression(ctx.headroomStats);
    return tokens ? tokensToAnsi(tokens) : null;
  }
}
