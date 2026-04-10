import { formatUsage7d } from "../segments.js";
import { formatDurationCompact, getVariant, renderLabel } from "./helpers.js";
export class Usage7dWidget {
    getDisplayName() { return "7d Usage"; }
    getDescription() { return "7-day rate limit utilization"; }
    getCategory() { return "Usage"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    getVariants() { return ["bar", "percent", "countdown"]; }
    render(item, ctx) {
        const variant = getVariant(item, "bar");
        if (variant === "countdown") {
            const seconds = ctx.isPreview ? 3 * 24 * 3600 : ctx.runtime.usage.sevenDayResetSeconds;
            return seconds !== null ? renderLabel("7d Reset", formatDurationCompact(seconds), item, ctx) : null;
        }
        if (variant === "percent") {
            const pct = ctx.isPreview ? 20 : ctx.usageData?.seven_day?.utilization ?? null;
            return pct !== null ? renderLabel("7d", `${Math.round(pct)}%`, item, ctx) : null;
        }
        if (ctx.isPreview)
            return "7d \u2588\u2591\u2591\u2591\u2591 20%";
        return formatUsage7d(ctx.usageData);
    }
}
