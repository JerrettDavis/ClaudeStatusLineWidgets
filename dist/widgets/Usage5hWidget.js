import { formatUsage5h } from "../segments.js";
export class Usage5hWidget {
    getDisplayName() { return "5h Usage"; }
    getDescription() { return "5-hour rate limit utilization"; }
    getCategory() { return "Usage"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "5h \u2588\u2588\u2591\u2591\u2591 35%";
        return formatUsage5h(ctx.usageData);
    }
}
