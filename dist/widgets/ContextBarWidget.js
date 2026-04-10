import { formatContext } from "../segments.js";
import { formatPercent, getVariant, renderLabel } from "./helpers.js";
export class ContextBarWidget {
    getDisplayName() { return "Context Bar"; }
    getDescription() { return "Context window usage bar"; }
    getCategory() { return "Context"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    getVariants() { return ["bar", "percent", "remaining"]; }
    render(item, ctx) {
        const rawPercent = ctx.isPreview ? 45 : ctx.payload.context_window?.used_percentage ?? null;
        if (rawPercent === null)
            return null;
        const percent = Math.max(0, Math.min(100, rawPercent));
        const variant = getVariant(item, "bar");
        if (variant === "percent") {
            return renderLabel("Ctx", formatPercent(percent), item, ctx);
        }
        if (variant === "remaining") {
            return renderLabel("Ctx Left", formatPercent(100 - percent), item, ctx);
        }
        return formatContext(percent);
    }
}
