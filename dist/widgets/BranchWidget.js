import { execFileSync } from "child_process";
import { formatBranch } from "../segments.js";
function getBranchFromGit(cwd) {
    try {
        const result = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            ...(cwd ? { cwd } : {}),
        });
        return result.trim() || undefined;
    }
    catch {
        return undefined;
    }
}
export class BranchWidget {
    getDisplayName() { return "Branch"; }
    getDescription() { return "Git branch name"; }
    getCategory() { return "Session"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return true; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "main";
        return formatBranch(ctx.payload.git_branch || getBranchFromGit(ctx.payload.cwd)) || null;
    }
}
