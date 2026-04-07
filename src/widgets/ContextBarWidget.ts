import { formatContext } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class ContextBarWidget implements Widget {
  getDisplayName() { return "Context Bar"; }
  getDescription() { return "Context window usage bar"; }
  getCategory() { return "Context"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return false; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return formatContext(45);
    return formatContext(ctx.payload.context_window?.used_percentage);
  }
}
