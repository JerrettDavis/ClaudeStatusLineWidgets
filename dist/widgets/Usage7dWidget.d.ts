import type { Widget, WidgetItem, RenderContext } from "./types.js";
export declare class Usage7dWidget implements Widget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    getDefaultColor(): string;
    supportsColors(): boolean;
    getVariants(): string[];
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
