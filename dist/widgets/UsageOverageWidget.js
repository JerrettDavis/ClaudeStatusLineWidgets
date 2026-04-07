import { formatUsageOverage } from "../segments.js";
export class UsageOverageWidget {
    getDisplayName() { return "Overage"; }
    getDescription() { return "Extra usage / overage spend"; }
    getCategory() { return "Usage"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "+$5/$20 \u2588\u2591\u2591\u2591\u2591 25%";
        return formatUsageOverage(ctx.usageData);
    }
}
