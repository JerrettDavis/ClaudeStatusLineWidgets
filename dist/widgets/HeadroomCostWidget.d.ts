import type { Widget, WidgetItem, RenderContext } from "./types.js";
export declare class HeadroomCostWidget implements Widget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    getDefaultColor(): string;
    supportsColors(): boolean;
    render(_item: WidgetItem, ctx: RenderContext): string | null;
}
