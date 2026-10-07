import type { Widget, WidgetCatalogEntry, StyledToken } from "./types.js";
import type { WidgetExtension } from "../extensions/types.js";
import { tokensToAnsi } from "../colors.js";
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
  ReplayCostWidget,
  RunwayWidget,
  LargeCacheWarningWidget,
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
  { type: "replay-cost", create: () => new ReplayCostWidget() },
  { type: "runway", create: () => new RunwayWidget() },
  { type: "large-cache-warning", create: () => new LargeCacheWarningWidget() },
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
      dataKey: w.getDataKey?.(),
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
 * (loadExtensions lives in src/extensions/register-cli.ts, not here — the
 * dynamic import would otherwise reach the mod's import chain via this
 * file's re-export. CLI code imports it directly.)
 */

// ─────────────────────────────────────────────────────────────────────
// Token rendering: the data layer emits StyledToken[]. The legacy ANSI
// renderer (renderer.ts) joins tokens via tokensToAnsi; the mod renderer
// (renderer-mod.ts) walks tokens into native <Text>/<Link> elements.
// Widgets that can emit tokens natively should override `renderTokens`.
// ─────────────────────────────────────────────────────────────────────

/** Match SGR escape sequences (color/bold/dim/reset). */
const SGR_RE = /\x1b\[[0-9;]*m/g;
/** Match OSC-8 hyperlink sequences (link…END). */
const OSC8_RE = /\x1b\]8;;[^\x07\x1b]*\x07([^\x1b]*)\x1b\]8;;\x07/g;

/**
 * Default splitter for widgets that don't override `renderTokens`. Walks the
 * SGR-codes in the widget's ANSI output and emits one token per span. OSC-8
 * hyperlinks are passed through as plain text (LinkWidget overrides directly).
 */
function defaultRenderTokensFor(
  widget: Widget,
  item: WidgetItem,
  ctx: RenderContext,
): StyledToken[] | null {
  const out = widget.render(item, ctx);
  if (out === null) return null;
  const stripped = out.replace(OSC8_RE, "$1");
  const tokens: StyledToken[] = [];
  let lastIndex = 0;
  let activeStyle: { color?: string; dim?: boolean; bold?: boolean } = {};
  SGR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SGR_RE.exec(stripped)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ text: stripped.slice(lastIndex, m.index), style: { ...activeStyle } });
    }
    lastIndex = m.index + m[0].length;
    const code = m[0].slice(2, -1);
    if (code === "0") {
      activeStyle = {};
    } else if (code === "1") {
      activeStyle = { ...activeStyle, bold: true };
    } else if (code === "2") {
      activeStyle = { ...activeStyle, dim: true };
    } else {
      const named = Object.entries({
        "31": "red", "32": "green", "33": "yellow", "34": "blue", "35": "magenta",
        "36": "cyan", "37": "white", "90": "gray",
        "91": "redBright", "92": "greenBright", "93": "yellowBright",
        "94": "blueBright", "95": "magentaBright", "96": "cyanBright",
      }).find(([c]) => c === code)?.[1];
      if (named) activeStyle = { ...activeStyle, color: named };
    }
  }
  if (lastIndex < stripped.length) {
    tokens.push({ text: stripped.slice(lastIndex), style: { ...activeStyle } });
  }
  // Merge consecutive same-style tokens.
  const merged: StyledToken[] = [];
  for (const tok of tokens) {
    const prev = merged[merged.length - 1];
    const same = prev && JSON.stringify(prev.style ?? {}) === JSON.stringify(tok.style ?? {});
    if (same && prev) {
      prev.text += tok.text;
    } else {
      merged.push({ ...tok, style: tok.style ? { ...tok.style } : undefined });
    }
  }
  return merged.length > 0 ? merged : [{ text: out, style: {} }];
}

import type { WidgetItem, RenderContext } from "./types.js";

/**
 * Get tokens for a widget, applying any user-set color override. Returns
 * null when the widget has nothing to render for this item.
 */
export function renderTokensFor(
  widget: Widget,
  item: WidgetItem,
  ctx: RenderContext,
): StyledToken[] | null {
  if (widget.renderTokens) {
    return widget.renderTokens(item, ctx);
  }
  return defaultRenderTokensFor(widget, item, ctx);
}

export function getWidgetsByDataKey(dataKey: string, catalog?: WidgetCatalogEntry[]): WidgetCatalogEntry[] {
  return (catalog ?? getWidgetCatalog()).filter((e) => e.dataKey === dataKey);
}

export function getDataKeyGroups(catalog?: WidgetCatalogEntry[]): Map<string, WidgetCatalogEntry[]> {
  const entries = catalog ?? getWidgetCatalog();
  const groups = new Map<string, WidgetCatalogEntry[]>();
  for (const entry of entries) {
    if (!entry.dataKey) continue;
    const list = groups.get(entry.dataKey) ?? [];
    list.push(entry);
    groups.set(entry.dataKey, list);
  }
  return groups;
}
