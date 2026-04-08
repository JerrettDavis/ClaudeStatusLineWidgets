import { formatHeadroomCompression } from "../segments.js";
export class HeadroomCompressionWidget {
    getDisplayName() { return "Compression"; }
    getDescription() { return "Headroom compression percentage"; }
    getCategory() { return "Headroom"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "34% compressed";
        return formatHeadroomCompression(ctx.headroomStats);
    }
}
