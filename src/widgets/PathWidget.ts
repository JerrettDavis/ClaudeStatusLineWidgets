import { formatPath } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class PathWidget implements Widget {
  getDisplayName() { return "Path"; }
  getDescription() { return "Working directory"; }
  getCategory() { return "Session"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "~/projects/my-app";
    const cwd = ctx.payload.cwd ?? ctx.payload.workspace?.current_dir;
    return formatPath(cwd);
  }
}
