import type { UsageData } from "./usage.js";
import type { StatusLinePayload } from "./widgets/types.js";
export interface RemoteInfo {
    rawUrl: string;
    owner: string | null;
    repo: string | null;
}
export interface GitInfo {
    available: boolean;
    cwd: string | null;
    branch: string | null;
    rootPath: string | null;
    rootName: string | null;
    sha: string | null;
    staged: number;
    unstaged: number;
    untracked: number;
    conflicts: number;
    changes: number;
    insertions: number;
    deletions: number;
    ahead: number;
    behind: number;
    origin: RemoteInfo | null;
    upstream: RemoteInfo | null;
    isFork: boolean;
    worktreeMode: string | null;
    worktreeName: string | null;
    worktreeBranch: string | null;
    worktreeOriginalBranch: string | null;
}
export interface SessionInfo {
    sessionId: string | null;
    version: string | null;
    outputStyle: string | null;
    vimMode: string | null;
    thinkingEffort: string | null;
    skills: string[];
    accountEmail: string | null;
    startedAt: string | null;
    elapsedSeconds: number | null;
}
export interface SystemInfo {
    terminalWidth: number | null;
    memoryUsedBytes: number;
    memoryTotalBytes: number;
}
export interface TokenInfo {
    input: number | null;
    output: number | null;
    cached: number | null;
    total: number | null;
    inputSpeed: number | null;
    outputSpeed: number | null;
    totalSpeed: number | null;
}
export interface UsageWindowInfo {
    fiveHourResetSeconds: number | null;
    sevenDayResetSeconds: number | null;
}
export interface RuntimeData {
    git: GitInfo;
    session: SessionInfo;
    system: SystemInfo;
    tokens: TokenInfo;
    usage: UsageWindowInfo;
}
export declare function buildRuntimeData(payload: StatusLinePayload, usageData: UsageData | null): RuntimeData;
export declare function runCustomCommand(command: string, payload: StatusLinePayload, cwd: string | null, timeoutMs: number): string | null;
