import type { Widget, WidgetItem, RenderContext } from "./types.js";
export declare class CustomTextWidget implements Widget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    getDefaultColor(): string;
    supportsColors(): boolean;
    render(item: WidgetItem, _ctx: RenderContext): string | null;
}
