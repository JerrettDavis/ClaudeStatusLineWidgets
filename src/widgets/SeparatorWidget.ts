import { dim } from "../colors.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class SeparatorWidget implements Widget {
  getDisplayName() { return "Separator"; }
  getDescription() { return "Visual separator between widgets"; }
  getCategory() { return "Layout"; }
  getDefaultColor() { return "dim"; }
  supportsColors() { return false; }
  render(_item: WidgetItem, _ctx: RenderContext): string | null {
    return dim(" | ");
  }
}
