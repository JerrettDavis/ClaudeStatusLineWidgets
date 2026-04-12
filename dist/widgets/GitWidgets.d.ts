import type { Widget, WidgetItem, RenderContext } from "./types.js";
declare abstract class BaseGitWidget implements Widget {
    abstract getDisplayName(): string;
    abstract getDescription(): string;
    abstract render(item: WidgetItem, ctx: RenderContext): string | null;
    getCategory(): string;
    getDefaultColor(): string;
    supportsColors(): boolean;
}
export declare class GitStatusWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitChangesWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitStagedWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitUnstagedWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitUntrackedWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitAheadBehindWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitConflictsWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitShaWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitRootDirWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitInsertionsWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitDeletionsWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
declare class RemoteFieldWidget extends BaseGitWidget {
    private readonly displayName;
    private readonly description;
    private readonly remote;
    private readonly field;
    constructor(displayName: string, description: string, remote: "origin" | "upstream", field: "owner" | "repo" | "ownerRepo");
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitOriginOwnerWidget extends RemoteFieldWidget {
    constructor();
}
export declare class GitOriginRepoWidget extends RemoteFieldWidget {
    constructor();
}
export declare class GitOriginOwnerRepoWidget extends RemoteFieldWidget {
    constructor();
}
export declare class GitUpstreamOwnerWidget extends RemoteFieldWidget {
    constructor();
}
export declare class GitUpstreamRepoWidget extends RemoteFieldWidget {
    constructor();
}
export declare class GitUpstreamOwnerRepoWidget extends RemoteFieldWidget {
    constructor();
}
export declare class GitIsForkWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitWorktreeModeWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitWorktreeNameWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitWorktreeBranchWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export declare class GitWorktreeOriginalBranchWidget extends BaseGitWidget {
    getDisplayName(): string;
    getDescription(): string;
    render(item: WidgetItem, ctx: RenderContext): string | null;
}
export {};
