import { formatModel } from "../segments.js";
export class ModelWidget {
    getDisplayName() { return "Model"; }
    getDescription() { return "Claude model name"; }
    getCategory() { return "Session"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return true; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "Opus";
        return formatModel(ctx.payload.model ?? {});
    }
}
