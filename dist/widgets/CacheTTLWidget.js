import { formatCache } from "../segments.js";
export class CacheTTLWidget {
    getDisplayName() { return "Cache TTL"; }
    getDescription() { return "Cache expiry countdown"; }
    getCategory() { return "Context"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview) {
            return formatCache({
                remainingSeconds: 180,
                tier: "5m",
                lastWriteTime: null,
                expiresAt: Date.now() + 180_000,
                cacheReadActive: true,
            });
        }
        return formatCache(ctx.cacheTTL);
    }
}
