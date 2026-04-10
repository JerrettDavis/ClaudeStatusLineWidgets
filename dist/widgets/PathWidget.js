import { formatPath } from "../segments.js";
export class PathWidget {
    getDisplayName() { return "Path"; }
    getDescription() { return "Working directory"; }
    getCategory() { return "Session"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return true; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "~/projects/my-app";
        const cwd = ctx.runtime.git.cwd ??
            ctx.payload.cwd ??
            ctx.payload.workspace?.current_dir ??
            ctx.payload.workspace?.project_dir;
        return formatPath(cwd);
    }
}
