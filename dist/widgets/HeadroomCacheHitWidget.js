import { formatHeadroomCacheHit } from "../segments.js";
export class HeadroomCacheHitWidget {
    getDisplayName() { return "Cache Hit Rate"; }
    getDescription() { return "Headroom prefix cache hit rate"; }
    getCategory() { return "Headroom"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "78% cache hit";
        return formatHeadroomCacheHit(ctx.headroomStats);
    }
}
