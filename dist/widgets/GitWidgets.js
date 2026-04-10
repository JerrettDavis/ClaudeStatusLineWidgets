import { renderBadge, renderLabel } from "./helpers.js";
class BaseGitWidget {
    getCategory() { return "Git"; }
    getDefaultColor() { return "default"; }
    supportsColors() { return true; }
}
export class GitStatusWidget extends BaseGitWidget {
    getDisplayName() { return "Git Status"; }
    getDescription() { return "Compact summary of staged, unstaged, untracked, and conflict counts"; }
    render(item, ctx) {
        const git = ctx.runtime.git;
        if (ctx.isPreview)
            return renderLabel("Git", "+2 ~1 ?3", item, ctx);
        if (!git.available)
            return null;
        const parts = [
            git.staged > 0 ? `+${git.staged}` : null,
            git.unstaged > 0 ? `~${git.unstaged}` : null,
            git.untracked > 0 ? `?${git.untracked}` : null,
            git.conflicts > 0 ? `!${git.conflicts}` : null,
        ].filter(Boolean);
        return parts.length > 0 ? renderLabel("Git", parts.join(" "), item, ctx) : null;
    }
}
export class GitChangesWidget extends BaseGitWidget {
    getDisplayName() { return "Git Changes"; }
    getDescription() { return "Total changed paths in the working tree"; }
    render(item, ctx) {
        const count = ctx.isPreview ? 6 : ctx.runtime.git.changes;
        return count > 0 ? renderLabel("Changes", String(count), item, ctx) : null;
    }
}
export class GitStagedWidget extends BaseGitWidget {
    getDisplayName() { return "Git Staged"; }
    getDescription() { return "Count of staged files"; }
    render(item, ctx) {
        const count = ctx.isPreview ? 2 : ctx.runtime.git.staged;
        return count > 0 ? renderLabel("Staged", String(count), item, ctx) : null;
    }
}
export class GitUnstagedWidget extends BaseGitWidget {
    getDisplayName() { return "Git Unstaged"; }
    getDescription() { return "Count of unstaged files"; }
    render(item, ctx) {
        const count = ctx.isPreview ? 1 : ctx.runtime.git.unstaged;
        return count > 0 ? renderLabel("Unstaged", String(count), item, ctx) : null;
    }
}
export class GitUntrackedWidget extends BaseGitWidget {
    getDisplayName() { return "Git Untracked"; }
    getDescription() { return "Count of untracked files"; }
    render(item, ctx) {
        const count = ctx.isPreview ? 3 : ctx.runtime.git.untracked;
        return count > 0 ? renderLabel("Untracked", String(count), item, ctx) : null;
    }
}
export class GitAheadBehindWidget extends BaseGitWidget {
    getDisplayName() { return "Git Ahead/Behind"; }
    getDescription() { return "Commit divergence from the tracked branch"; }
    render(item, ctx) {
        const ahead = ctx.isPreview ? 1 : ctx.runtime.git.ahead;
        const behind = ctx.isPreview ? 2 : ctx.runtime.git.behind;
        const parts = [
            ahead > 0 ? `↑${ahead}` : null,
            behind > 0 ? `↓${behind}` : null,
        ].filter(Boolean);
        return parts.length > 0 ? renderLabel("Sync", parts.join(" "), item, ctx) : null;
    }
}
export class GitConflictsWidget extends BaseGitWidget {
    getDisplayName() { return "Git Conflicts"; }
    getDescription() { return "Count of conflicted paths"; }
    render(item, ctx) {
        const count = ctx.isPreview ? 1 : ctx.runtime.git.conflicts;
        return count > 0 ? renderLabel("Conflicts", String(count), item, ctx) : null;
    }
}
export class GitShaWidget extends BaseGitWidget {
    getDisplayName() { return "Git SHA"; }
    getDescription() { return "Short commit SHA"; }
    render(item, ctx) {
        const value = ctx.isPreview ? "a1b2c3d" : ctx.runtime.git.sha;
        return value ? renderLabel("SHA", value, item, ctx) : null;
    }
}
export class GitRootDirWidget extends BaseGitWidget {
    getDisplayName() { return "Git Root Dir"; }
    getDescription() { return "Repository root directory name"; }
    render(item, ctx) {
        const value = ctx.isPreview ? "my-repo" : ctx.runtime.git.rootName;
        return value ? renderLabel("Repo", value, item, ctx) : null;
    }
}
export class GitInsertionsWidget extends BaseGitWidget {
    getDisplayName() { return "Git Insertions"; }
    getDescription() { return "Uncommitted inserted lines"; }
    render(item, ctx) {
        const count = ctx.isPreview ? 42 : ctx.runtime.git.insertions;
        return count > 0 ? renderLabel("Insertions", `+${count}`, item, ctx) : null;
    }
}
export class GitDeletionsWidget extends BaseGitWidget {
    getDisplayName() { return "Git Deletions"; }
    getDescription() { return "Uncommitted deleted lines"; }
    render(item, ctx) {
        const count = ctx.isPreview ? 10 : ctx.runtime.git.deletions;
        return count > 0 ? renderLabel("Deletions", `-${count}`, item, ctx) : null;
    }
}
class RemoteFieldWidget extends BaseGitWidget {
    displayName;
    description;
    remote;
    field;
    constructor(displayName, description, remote, field) {
        super();
        this.displayName = displayName;
        this.description = description;
        this.remote = remote;
        this.field = field;
    }
    getDisplayName() { return this.displayName; }
    getDescription() { return this.description; }
    render(item, ctx) {
        const remote = this.remote === "origin" ? ctx.runtime.git.origin : ctx.runtime.git.upstream;
        const preview = this.remote === "origin" ? { owner: "octocat", repo: "app" } : { owner: "upstream", repo: "app" };
        const owner = ctx.isPreview ? preview.owner : remote?.owner;
        const repo = ctx.isPreview ? preview.repo : remote?.repo;
        const value = this.field === "owner"
            ? owner
            : this.field === "repo"
                ? repo
                : owner && repo
                    ? `${owner}/${repo}`
                    : null;
        return value ? renderLabel(this.displayName, value, item, ctx) : null;
    }
}
export class GitOriginOwnerWidget extends RemoteFieldWidget {
    constructor() { super("Origin Owner", "Git origin owner", "origin", "owner"); }
}
export class GitOriginRepoWidget extends RemoteFieldWidget {
    constructor() { super("Origin Repo", "Git origin repository", "origin", "repo"); }
}
export class GitOriginOwnerRepoWidget extends RemoteFieldWidget {
    constructor() { super("Origin", "Git origin owner/repository", "origin", "ownerRepo"); }
}
export class GitUpstreamOwnerWidget extends RemoteFieldWidget {
    constructor() { super("Upstream Owner", "Git upstream owner", "upstream", "owner"); }
}
export class GitUpstreamRepoWidget extends RemoteFieldWidget {
    constructor() { super("Upstream Repo", "Git upstream repository", "upstream", "repo"); }
}
export class GitUpstreamOwnerRepoWidget extends RemoteFieldWidget {
    constructor() { super("Upstream", "Git upstream owner/repository", "upstream", "ownerRepo"); }
}
export class GitIsForkWidget extends BaseGitWidget {
    getDisplayName() { return "Git Is Fork"; }
    getDescription() { return "Whether origin and upstream differ"; }
    render(item, ctx) {
        const value = ctx.isPreview ? true : ctx.runtime.git.isFork;
        return value ? renderLabel("Fork", renderBadge("yes"), item, ctx) : null;
    }
}
export class GitWorktreeModeWidget extends BaseGitWidget {
    getDisplayName() { return "Git Worktree Mode"; }
    getDescription() { return "Primary, linked, or detached worktree mode"; }
    render(item, ctx) {
        const value = ctx.isPreview ? "linked" : ctx.runtime.git.worktreeMode;
        return value ? renderLabel("Worktree", value, item, ctx) : null;
    }
}
export class GitWorktreeNameWidget extends BaseGitWidget {
    getDisplayName() { return "Git Worktree Name"; }
    getDescription() { return "Current worktree name"; }
    render(item, ctx) {
        const value = ctx.isPreview ? "my-repo" : ctx.runtime.git.worktreeName;
        return value ? renderLabel("Worktree", value, item, ctx) : null;
    }
}
export class GitWorktreeBranchWidget extends BaseGitWidget {
    getDisplayName() { return "Git Worktree Branch"; }
    getDescription() { return "Branch associated with the current worktree"; }
    render(item, ctx) {
        const value = ctx.isPreview ? "feat/widgets" : ctx.runtime.git.worktreeBranch;
        return value ? renderLabel("Worktree Branch", value, item, ctx) : null;
    }
}
export class GitWorktreeOriginalBranchWidget extends BaseGitWidget {
    getDisplayName() { return "Git Worktree Original Branch"; }
    getDescription() { return "Original branch for the current worktree"; }
    render(item, ctx) {
        const value = ctx.isPreview ? "main" : ctx.runtime.git.worktreeOriginalBranch;
        return value ? renderLabel("Origin Branch", value, item, ctx) : null;
    }
}
