import type { Widget, WidgetItem, RenderContext } from "./types.js";
export declare class SeparatorWidget implements Widget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    getDefaultColor(): string;
    supportsColors(): boolean;
    render(_item: WidgetItem, _ctx: RenderContext): string | null;
}
