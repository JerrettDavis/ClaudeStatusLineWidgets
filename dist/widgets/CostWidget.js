import { formatCost } from "../segments.js";
export class CostWidget {
    getDisplayName() { return "Cost"; }
    getDescription() { return "Session cost in USD"; }
    getCategory() { return "Session"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return true; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "$0.45";
        return formatCost(ctx.payload.cost?.total_cost_usd);
    }
}
