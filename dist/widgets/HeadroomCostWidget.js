import { formatHeadroomCost } from "../segments.js";
export class HeadroomCostWidget {
    getDisplayName() { return "Cost Saved"; }
    getDescription() { return "Headroom cost savings"; }
    getCategory() { return "Headroom"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return false; }
    render(_item, ctx) {
        if (ctx.isPreview)
            return "$0.12 saved";
        return formatHeadroomCost(ctx.headroomStats);
    }
}
