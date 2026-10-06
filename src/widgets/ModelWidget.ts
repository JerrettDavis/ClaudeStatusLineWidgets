import { formatModel } from "../segments.js";
import { tokensToAnsi } from "../colors.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class ModelWidget implements Widget {
  getDisplayName() { return "Model"; }
  getDescription() { return "Claude model name"; }
  getCategory() { return "Session"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "Opus";
    const tokens = formatModel(ctx.payload.model ?? {});
    return tokens ? tokensToAnsi(tokens) : null;
  }
}
