import { formatContext } from "../segments.js";
export class ContextBarWidget {
    getDisplayName() { return "Context Bar"; }
    getDescription() { return "Context window usage bar"; }
    getCategory() { return "Context"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return formatContext(45);
        return formatContext(ctx.payload.context_window?.used_percentage);
    }
}
