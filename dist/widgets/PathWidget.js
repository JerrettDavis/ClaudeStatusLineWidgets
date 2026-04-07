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
        const cwd = ctx.payload.cwd ?? ctx.payload.workspace?.current_dir;
        return formatPath(cwd);
    }
}
