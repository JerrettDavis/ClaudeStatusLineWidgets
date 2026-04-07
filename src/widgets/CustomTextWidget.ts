import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class CustomTextWidget implements Widget {
  getDisplayName() { return "Custom Text"; }
  getDescription() { return "Static custom text"; }
  getCategory() { return "Layout"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
  render(item: WidgetItem, _ctx: RenderContext): string | null {
    return item.customText ?? null;
  }
}
