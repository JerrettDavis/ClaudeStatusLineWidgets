import type { Widget, WidgetItem, RenderContext } from "./types.js";
export declare class Usage5hWidget implements Widget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    getDefaultColor(): string;
    supportsColors(): boolean;
    getVariants(): string[];
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
