import { existsSync, openSync, readFileSync, readSync, closeSync, statSync } from "fs";
import { basename, join } from "path";
import { execFileSync, execSync } from "child_process";
import { freemem, homedir, totalmem } from "os";
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

function safeExecFile(command: string, args: string[], cwd?: string): string | null {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 4000,
      ...(cwd ? { cwd } : {}),
    }).trim();
  } catch {
    return null;
  }
}

function parseRemote(rawUrl: string | null): RemoteInfo | null {
  if (!rawUrl) return null;

  const sshMatch = rawUrl.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  if (!sshMatch) {
    return { rawUrl, owner: null, repo: null };
  }

  return {
    rawUrl,
    owner: sshMatch[1] || null,
    repo: sshMatch[2] || null,
  };
}

function parseShortStat(text: string | null): { insertions: number; deletions: number } {
  if (!text) return { insertions: 0, deletions: 0 };
  const insertions = Number(text.match(/(\d+)\s+insertions?\(\+\)/)?.[1] ?? 0);
  const deletions = Number(text.match(/(\d+)\s+deletions?\(-\)/)?.[1] ?? 0);
  return { insertions, deletions };
}

function parseGitInfo(cwd: string | null): GitInfo {
  const empty: GitInfo = {
    available: false,
    cwd,
    branch: null,
    rootPath: null,
    rootName: null,
    sha: null,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicts: 0,
    changes: 0,
    insertions: 0,
    deletions: 0,
    ahead: 0,
    behind: 0,
    origin: null,
    upstream: null,
    isFork: false,
    worktreeMode: null,
    worktreeName: null,
    worktreeBranch: null,
    worktreeOriginalBranch: null,
  };

  if (!cwd) return empty;

  const status = safeExecFile("git", ["status", "--porcelain=v2", "--branch"], cwd);
  if (!status) return empty;

  const rootPath = safeExecFile("git", ["rev-parse", "--show-toplevel"], cwd);
  const sha = safeExecFile("git", ["rev-parse", "--short", "HEAD"], cwd);
  const origin = parseRemote(safeExecFile("git", ["config", "--get", "remote.origin.url"], cwd));
  const upstream = parseRemote(safeExecFile("git", ["config", "--get", "remote.upstream.url"], cwd));

  let branch: string | null = null;
  let ahead = 0;
  let behind = 0;
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  let conflicts = 0;
  let changedPaths = 0;

  for (const line of status.split(/\r?\n/)) {
    if (line.startsWith("# branch.head ")) {
      branch = line.slice("# branch.head ".length).trim();
      if (branch === "(detached)") branch = null;
      continue;
    }

    if (line.startsWith("# branch.ab ")) {
      const match = line.match(/\+(\d+)\s+-(\d+)/);
      ahead = Number(match?.[1] ?? 0);
      behind = Number(match?.[2] ?? 0);
      continue;
    }

    if (line.startsWith("? ")) {
      untracked += 1;
      continue;
    }

    if (line.startsWith("u ")) {
      conflicts += 1;
      continue;
    }

    if (line.startsWith("1 ") || line.startsWith("2 ")) {
      changedPaths += 1;
      const xy = line.split(" ")[1] ?? "..";
      const indexState = xy[0] ?? ".";
      const worktreeState = xy[1] ?? ".";
      if (indexState !== ".") staged += 1;
      if (worktreeState !== ".") unstaged += 1;
    }
  }

  const totalStat = parseShortStat(
    safeExecFile("git", ["diff", "--shortstat", "HEAD"], cwd) ??
    safeExecFile("git", ["diff", "--cached", "--shortstat"], cwd)
  );
  const worktreeList = safeExecFile("git", ["worktree", "list", "--porcelain"], cwd);

  let worktreeMode: string | null = null;
  let worktreeName: string | null = null;
  let worktreeBranch: string | null = null;
  let worktreeOriginalBranch: string | null = null;

  if (rootPath && worktreeList) {
    const normalizedRoot = rootPath.replace(/\\/g, "/");
    const blocks = worktreeList.split(/\n(?=worktree )/);
    const current = blocks.find((block) => {
      const worktreePath = block.match(/^worktree\s+(.+)$/m)?.[1]?.trim();
      return worktreePath?.replace(/\\/g, "/") === normalizedRoot;
    });

    if (current) {
      const isDetached = /^detached$/m.test(current);
      const branchRef = current.match(/^branch\s+refs\/heads\/(.+)$/m)?.[1] ?? null;
      const currentIndex = blocks.indexOf(current);
      worktreeMode = isDetached ? "detached" : currentIndex === 0 ? "primary" : "linked";
      worktreeBranch = branchRef;
      worktreeOriginalBranch = branchRef;
      worktreeName = basename(rootPath);
    }
  }

  if (!worktreeMode && rootPath) {
    worktreeMode = "primary";
    worktreeName = basename(rootPath);
    worktreeBranch = branch;
    worktreeOriginalBranch = branch;
  }

  const changes = changedPaths + untracked + conflicts;
  return {
    available: true,
    cwd,
    branch,
    rootPath,
    rootName: rootPath ? basename(rootPath) : null,
    sha,
    staged,
    unstaged,
    untracked,
    conflicts,
    changes,
    insertions: totalStat.insertions,
    deletions: totalStat.deletions,
    ahead,
    behind,
    origin,
    upstream,
    isFork: Boolean(
      origin?.owner &&
      origin.repo &&
      upstream?.owner &&
      upstream.repo &&
      (origin.owner !== upstream.owner || origin.repo !== upstream.repo)
    ),
    worktreeMode,
    worktreeName,
    worktreeBranch,
    worktreeOriginalBranch,
  };
}

function readInitialChunk(filePath: string, maxBytes: number = 256 * 1024): string[] {
  try {
    const stats = statSync(filePath);
    const readSize = Math.min(stats.size, maxBytes);
    const buffer = Buffer.alloc(readSize);
    const fd = openSync(filePath, "r");
    readSync(fd, buffer, 0, readSize, 0);
    closeSync(fd);
    return buffer.toString("utf8").split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function readFirstTimestamp(transcriptPath: string | undefined): string | null {
  if (!transcriptPath || !existsSync(transcriptPath)) return null;
  for (const line of readInitialChunk(transcriptPath)) {
    try {
      const parsed = JSON.parse(line) as { timestamp?: string };
      if (typeof parsed.timestamp === "string" && parsed.timestamp) {
        return parsed.timestamp;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function findEmailInValue(value: unknown): string | null {
  if (typeof value === "string") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findEmailInValue(item);
      if (match) return match;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      const match = findEmailInValue(entry);
      if (match) return match;
    }
  }
  return null;
}

function readAccountEmail(): string | null {
  const candidates = [
    join(homedir(), ".claude.json"),
    join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), ".credentials.json"),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
      const email = findEmailInValue(raw);
      if (email) return email;
    } catch {
      continue;
    }
  }

  return null;
}

function toResetSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.round((target - Date.now()) / 1000));
}

function normalizeVimMode(vim: StatusLinePayload["vim"], mode: string | undefined): string | null {
  if (typeof vim === "string" && vim) return vim;
  if (vim && typeof vim === "object" && typeof vim.mode === "string") return vim.mode;
  if (typeof mode === "string" && mode.toLowerCase().includes("vim")) return mode;
  if (vim === true) return "on";
  return null;
}

function normalizeThinkingEffort(payload: StatusLinePayload): string | null {
  if (payload.effort !== undefined && payload.effort !== null) {
    return String(payload.effort);
  }
  if (payload.thinking !== undefined && payload.thinking !== null) {
    return String(payload.thinking);
  }
  return null;
}

function normalizeSkills(skills: StatusLinePayload["skills"]): string[] {
  if (Array.isArray(skills)) {
    return skills.map((skill) => String(skill)).filter(Boolean);
  }
  if (skills && typeof skills === "object" && Array.isArray(skills.active)) {
    return skills.active.map((skill) => String(skill)).filter(Boolean);
  }
  return [];
}

function pickNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

export function buildRuntimeData(payload: StatusLinePayload, usageData: UsageData | null): RuntimeData {
  const cwd = payload.cwd ?? payload.workspace?.current_dir ?? payload.workspace?.project_dir ?? null;
  const startedAt = readFirstTimestamp(payload.transcript_path);
  const elapsedSeconds =
    startedAt ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)) : null;

  const cached = pickNumber(
    payload.context_window?.current_usage?.cache_read_input_tokens,
    payload.context_window?.cache_read_input_tokens
  );
  const input = pickNumber(
    payload.context_window?.total_input_tokens,
    payload.context_window?.current_usage?.total_input_tokens,
    payload.context_window?.current_usage?.input_tokens
  );
  const output = pickNumber(
    payload.context_window?.total_output_tokens,
    payload.context_window?.current_usage?.total_output_tokens,
    payload.context_window?.current_usage?.output_tokens
  );
  const total = input !== null || output !== null || cached !== null
    ? (input ?? 0) + (output ?? 0) + (cached ?? 0)
    : null;

  return {
    git: parseGitInfo(cwd),
    session: {
      sessionId: payload.session_id ?? null,
      version: payload.version ?? null,
      outputStyle: typeof payload.output_style === "string"
        ? payload.output_style
        : payload.output_style?.name ?? null,
      vimMode: normalizeVimMode(payload.vim, payload.mode),
      thinkingEffort: normalizeThinkingEffort(payload),
      skills: normalizeSkills(payload.skills),
      accountEmail: readAccountEmail(),
      startedAt,
      elapsedSeconds,
    },
    system: {
      terminalWidth: process.stdout.columns ?? null,
      memoryUsedBytes: totalmem() - freemem(),
      memoryTotalBytes: totalmem(),
    },
    tokens: {
      input,
      output,
      cached,
      total,
      inputSpeed: input !== null && elapsedSeconds && elapsedSeconds > 0 ? input / elapsedSeconds : null,
      outputSpeed: output !== null && elapsedSeconds && elapsedSeconds > 0 ? output / elapsedSeconds : null,
      totalSpeed: total !== null && elapsedSeconds && elapsedSeconds > 0
        ? total / elapsedSeconds
        : null,
    },
    usage: {
      fiveHourResetSeconds: toResetSeconds(usageData?.five_hour?.resets_at),
      sevenDayResetSeconds: toResetSeconds(usageData?.seven_day?.resets_at),
    },
  };
}

export function runCustomCommand(
  command: string,
  payload: StatusLinePayload,
  cwd: string | null,
  timeoutMs: number
): string | null {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      timeout: timeoutMs > 0 ? timeoutMs : undefined,
      shell: process.env.ComSpec ?? "/bin/sh",
      ...(cwd ? { cwd } : {}),
      input: JSON.stringify(payload),
    }).trim() || null;
  } catch {
    return null;
  }
}
