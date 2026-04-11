import type { Widget, WidgetItem, RenderContext } from "./types.js";
declare abstract class BaseWidget implements Widget {
    abstract getDisplayName(): string;
    abstract getDescription(): string;
    abstract getCategory(): string;
    abstract render(item: WidgetItem, ctx: RenderContext): string | null;
    getDefaultColor(): string;
    supportsColors(): boolean;
}
export declare class InputTokensWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class OutputTokensWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class TotalTokensWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class InputSpeedWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class OutputSpeedWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class TotalSpeedWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class ContextPercentageWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    getVariants(): string[];
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class ContextLengthWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class UsageReset5hWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class UsageReset7dWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export {};
