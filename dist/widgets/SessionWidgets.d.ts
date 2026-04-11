import type { Widget, WidgetItem, RenderContext } from "./types.js";
declare abstract class BaseWidget implements Widget {
    abstract getDisplayName(): string;
    abstract getDescription(): string;
    abstract getCategory(): string;
    abstract render(item: WidgetItem, ctx: RenderContext): string | null;
    getDefaultColor(): string;
    supportsColors(): boolean;
}
export declare class SessionIdWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class VersionWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class OutputStyleWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class SessionClockWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class SessionElapsedWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class AccountEmailWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class ThinkingEffortWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class VimModeWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class SkillsWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    getVariants(): string[];
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class TerminalWidthWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class MemoryUsageWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class CustomSymbolWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem): string | null;
}
export declare class LinkWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class CustomCommandWidget extends BaseWidget {
    getDisplayName(): string;
    getDescription(): string;
    getCategory(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export {};
