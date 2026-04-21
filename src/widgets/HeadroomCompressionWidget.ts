import { formatHeadroomCompression } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class HeadroomCompressionWidget implements Widget {
  getDisplayName() { return "Compression"; }
  getDescription() { return "Headroom compression percentage"; }
  getCategory() { return "Headroom"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  getDataKey() { return "headroom-stats"; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "34% compressed";
    return formatHeadroomCompression(ctx.headroomStats);
  }
}
