import { formatHeadroomTokens } from "../segments.js";
export class HeadroomTokensWidget {
    getDisplayName() { return "Tokens Saved"; }
    getDescription() { return "Headroom tokens saved count"; }
    getCategory() { return "Headroom"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "\u2696\uFE0F 491k tokens saved";
        return formatHeadroomTokens(ctx.headroomStats);
    }
}
