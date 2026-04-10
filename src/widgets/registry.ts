import type { Widget, WidgetCatalogEntry } from "./types.js";
import type { WidgetExtension } from "../extensions/types.js";
import { PathWidget } from "./PathWidget.js";
import { BranchWidget } from "./BranchWidget.js";
import { ModelWidget } from "./ModelWidget.js";
import { CostWidget } from "./CostWidget.js";
import { ContextBarWidget } from "./ContextBarWidget.js";
import { CacheTTLWidget } from "./CacheTTLWidget.js";
import { CacheTokensWidget } from "./CacheTokensWidget.js";
import { Usage5hWidget } from "./Usage5hWidget.js";
import { Usage7dWidget } from "./Usage7dWidget.js";
import { UsageOverageWidget } from "./UsageOverageWidget.js";
import { HeadroomTokensWidget } from "./HeadroomTokensWidget.js";
import { HeadroomCompressionWidget } from "./HeadroomCompressionWidget.js";
import { HeadroomCostWidget } from "./HeadroomCostWidget.js";
import { HeadroomCacheHitWidget } from "./HeadroomCacheHitWidget.js";
import { SeparatorWidget } from "./SeparatorWidget.js";
import { CustomTextWidget } from "./CustomTextWidget.js";
import {
  AccountEmailWidget,
  CustomCommandWidget,
  CustomSymbolWidget,
  LinkWidget,
  OutputStyleWidget,
  SessionClockWidget,
  SessionElapsedWidget,
  SessionIdWidget,
  SkillsWidget,
  TerminalWidthWidget,
  ThinkingEffortWidget,
  VersionWidget,
  VimModeWidget,
  MemoryUsageWidget,
} from "./SessionWidgets.js";
import {
  GitAheadBehindWidget,
  GitChangesWidget,
  GitConflictsWidget,
  GitDeletionsWidget,
  GitInsertionsWidget,
  GitIsForkWidget,
  GitOriginOwnerRepoWidget,
  GitOriginOwnerWidget,
  GitOriginRepoWidget,
  GitRootDirWidget,
  GitShaWidget,
  GitStagedWidget,
  GitStatusWidget,
  GitUnstagedWidget,
  GitUntrackedWidget,
  GitUpstreamOwnerRepoWidget,
  GitUpstreamOwnerWidget,
  GitUpstreamRepoWidget,
  GitWorktreeBranchWidget,
  GitWorktreeModeWidget,
  GitWorktreeNameWidget,
  GitWorktreeOriginalBranchWidget,
} from "./GitWidgets.js";
import {
  ContextLengthWidget,
  ContextPercentageWidget,
  InputSpeedWidget,
  InputTokensWidget,
  OutputSpeedWidget,
  OutputTokensWidget,
  TotalSpeedWidget,
  TotalTokensWidget,
  UsageReset5hWidget,
  UsageReset7dWidget,
} from "./MetricWidgets.js";

interface ManifestEntry {
  type: string;
  create: () => Widget;
}

const WIDGET_MANIFEST: ManifestEntry[] = [
  { type: "path", create: () => new PathWidget() },
  { type: "branch", create: () => new BranchWidget() },
  { type: "model", create: () => new ModelWidget() },
  { type: "cost", create: () => new CostWidget() },
  { type: "context-bar", create: () => new ContextBarWidget() },
  { type: "cache-ttl", create: () => new CacheTTLWidget() },
  { type: "cache-tokens", create: () => new CacheTokensWidget() },
  { type: "usage-5h", create: () => new Usage5hWidget() },
  { type: "usage-7d", create: () => new Usage7dWidget() },
  { type: "usage-overage", create: () => new UsageOverageWidget() },
  { type: "headroom-tokens", create: () => new HeadroomTokensWidget() },
  { type: "headroom-compression", create: () => new HeadroomCompressionWidget() },
  { type: "headroom-cost", create: () => new HeadroomCostWidget() },
  { type: "headroom-cache-hit", create: () => new HeadroomCacheHitWidget() },
  { type: "separator", create: () => new SeparatorWidget() },
  { type: "custom-text", create: () => new CustomTextWidget() },
  { type: "session-id", create: () => new SessionIdWidget() },
  { type: "version", create: () => new VersionWidget() },
  { type: "output-style", create: () => new OutputStyleWidget() },
  { type: "session-clock", create: () => new SessionClockWidget() },
  { type: "session-elapsed", create: () => new SessionElapsedWidget() },
  { type: "account-email", create: () => new AccountEmailWidget() },
  { type: "thinking-effort", create: () => new ThinkingEffortWidget() },
  { type: "vim-mode", create: () => new VimModeWidget() },
  { type: "skills", create: () => new SkillsWidget() },
  { type: "terminal-width", create: () => new TerminalWidthWidget() },
  { type: "memory-usage", create: () => new MemoryUsageWidget() },
  { type: "custom-symbol", create: () => new CustomSymbolWidget() },
  { type: "link", create: () => new LinkWidget() },
  { type: "custom-command", create: () => new CustomCommandWidget() },
  { type: "git-status", create: () => new GitStatusWidget() },
  { type: "git-changes", create: () => new GitChangesWidget() },
  { type: "git-staged", create: () => new GitStagedWidget() },
  { type: "git-unstaged", create: () => new GitUnstagedWidget() },
  { type: "git-untracked", create: () => new GitUntrackedWidget() },
  { type: "git-ahead-behind", create: () => new GitAheadBehindWidget() },
  { type: "git-conflicts", create: () => new GitConflictsWidget() },
  { type: "git-sha", create: () => new GitShaWidget() },
  { type: "git-root", create: () => new GitRootDirWidget() },
  { type: "git-insertions", create: () => new GitInsertionsWidget() },
  { type: "git-deletions", create: () => new GitDeletionsWidget() },
  { type: "git-origin-owner", create: () => new GitOriginOwnerWidget() },
  { type: "git-origin-repo", create: () => new GitOriginRepoWidget() },
  { type: "git-origin-owner-repo", create: () => new GitOriginOwnerRepoWidget() },
  { type: "git-upstream-owner", create: () => new GitUpstreamOwnerWidget() },
  { type: "git-upstream-repo", create: () => new GitUpstreamRepoWidget() },
  { type: "git-upstream-owner-repo", create: () => new GitUpstreamOwnerRepoWidget() },
  { type: "git-is-fork", create: () => new GitIsForkWidget() },
  { type: "git-worktree-mode", create: () => new GitWorktreeModeWidget() },
  { type: "git-worktree-name", create: () => new GitWorktreeNameWidget() },
  { type: "git-worktree-branch", create: () => new GitWorktreeBranchWidget() },
  { type: "git-worktree-original-branch", create: () => new GitWorktreeOriginalBranchWidget() },
  { type: "tokens-input", create: () => new InputTokensWidget() },
  { type: "tokens-output", create: () => new OutputTokensWidget() },
  { type: "tokens-total", create: () => new TotalTokensWidget() },
  { type: "input-speed", create: () => new InputSpeedWidget() },
  { type: "output-speed", create: () => new OutputSpeedWidget() },
  { type: "total-speed", create: () => new TotalSpeedWidget() },
  { type: "context-percent", create: () => new ContextPercentageWidget() },
  { type: "context-length", create: () => new ContextLengthWidget() },
  { type: "usage-reset-5h", create: () => new UsageReset5hWidget() },
  { type: "usage-reset-7d", create: () => new UsageReset7dWidget() },
];

const widgetRegistry = new Map<string, Widget>(
  WIDGET_MANIFEST.map((entry) => [entry.type, entry.create()])
);

// Tracks extension-contributed entries separately so the catalog can
// include them alongside built-in widgets.
const extensionManifest: ManifestEntry[] = [];

export function getWidget(type: string): Widget | null {
  return widgetRegistry.get(type) ?? null;
}

export function getAllWidgetTypes(): string[] {
  return [
    ...WIDGET_MANIFEST.map((e) => e.type),
    ...extensionManifest.map((e) => e.type),
  ];
}

export function getWidgetCatalog(): WidgetCatalogEntry[] {
  const allEntries = [...WIDGET_MANIFEST, ...extensionManifest];
  return allEntries.map((entry) => {
    const w = widgetRegistry.get(entry.type)!;
      return {
        type: entry.type,
        displayName: w.getDisplayName(),
        description: w.getDescription(),
        category: w.getCategory(),
        variants: w.getVariants?.(),
      };
    });
}

export function getWidgetCategories(): string[] {
  const cats = new Set(getWidgetCatalog().map((e) => e.category));
  return [...cats];
}

/**
 * Registers all widgets contributed by a single extension.
 * Built-in widget types cannot be overridden — duplicate types are silently skipped.
 */
export function registerExtension(extension: WidgetExtension): void {
  for (const reg of extension.widgets) {
    if (widgetRegistry.has(reg.type)) continue; // protect built-ins
    const widget = reg.create();
    widgetRegistry.set(reg.type, widget);
    extensionManifest.push({ type: reg.type, create: reg.create });
  }
}

/**
 * Discovers all globally-installed extension packages and registers their
 * widgets into the registry. Should be called once at startup, before any
 * rendering or TUI interaction.
 */
export async function loadExtensions(): Promise<void> {
  const { discoverExtensions } = await import("../extensions/loader.js");
  const extensions = await discoverExtensions();
  for (const ext of extensions) {
    registerExtension(ext);
  }
}
