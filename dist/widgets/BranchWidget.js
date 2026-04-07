import { formatBranch } from "../segments.js";
export class BranchWidget {
    getDisplayName() { return "Branch"; }
    getDescription() { return "Git branch name"; }
    getCategory() { return "Session"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return true; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "main";
        return formatBranch(ctx.payload.git_branch);
    }
}
