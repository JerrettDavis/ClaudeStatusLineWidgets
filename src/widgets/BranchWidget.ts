import { formatBranch } from "../segments.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";

export class BranchWidget implements Widget {
  getDisplayName() { return "Branch"; }
  getDescription() { return "Git branch name"; }
  getCategory() { return "Session"; }
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
  render(_item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "main";
    return formatBranch(ctx.runtime.git.branch ?? ctx.payload.git_branch) || null;
  }
}
