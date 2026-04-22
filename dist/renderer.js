import { createRequire } from "module";
const require = createRequire(import.meta.url);

// src/colors.ts
var ESC = "\x1B[";
var RESET = `${ESC}0m`;
var COLOR_CODE_MAP = {
  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  magenta: "35",
  cyan: "36",
  white: "37",
  gray: "90",
  redBright: "91",
  greenBright: "92",
  yellowBright: "93",
  blueBright: "94",
  magentaBright: "95",
  cyanBright: "96"
};
function applyColor(text, color) {
  if (!color || color === "default") return text;
  const code = COLOR_CODE_MAP[color];
  if (!code) return text;
  return `${ESC}${code}m${text}${RESET}`;
}
function green(text) {
  return `${ESC}32m${text}${RESET}`;
}
function yellow(text) {
  return `${ESC}33m${text}${RESET}`;
}
function red(text) {
  return `${ESC}31m${text}${RESET}`;
}
function cyan(text) {
  return `${ESC}36m${text}${RESET}`;
}
function dim(text) {
  return `${ESC}2m${text}${RESET}`;
}

// src/segments.ts
function formatTime(epochMs) {
  const d = new Date(epochMs);
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "p" : "a";
  hours = hours % 12 || 12;
  return `${hours}:${mins}${ampm}`;
}
function formatCache(cache) {
  if (cache.tier === "none" && !cache.cacheReadActive) {
    return dim("\u26D3\uFE0F\u200D\u{1F4A5}");
  }
  if (cache.remainingSeconds <= 0 || !cache.expiresAt) {
    return dim("\u26D3\uFE0F\u200D\u{1F4A5}");
  }
  const timeStr = formatTime(cache.expiresAt);
  const label = `\u26D3\uFE0F @ ${timeStr}`;
  if (cache.tier === "1h") {
    return cyan(label);
  }
  if (cache.remainingSeconds > 120) {
    return green(label);
  }
  if (cache.remainingSeconds > 60) {
    return yellow(label);
  }
  return red(label);
}
function formatModel(model) {
  return model.display_name ?? model.id ?? "unknown";
}
function formatCost(totalCostUsd) {
  if (totalCostUsd === void 0 || totalCostUsd === null) return "$0.00";
  return `$${totalCostUsd.toFixed(2)}`;
}
function formatContext(usedPercentage) {
  const pct = Math.max(0, Math.min(100, usedPercentage ?? 0));
  const barWidth = 8;
  const filled = Math.round(pct / 100 * barWidth);
  const empty = barWidth - filled;
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
  let colorFn = green;
  if (pct > 80) colorFn = red;
  else if (pct > 60) colorFn = yellow;
  return `${colorFn(bar)} ${Math.round(pct)}%`;
}
function formatPath(cwd) {
  return cwd ?? null;
}
function formatBranch(branch) {
  return branch || null;
}
function miniBar(label, pct, barWidth = 5) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round(clamped / 100 * barWidth);
  const empty = barWidth - filled;
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
  const colorFn = clamped > 80 ? red : clamped > 60 ? yellow : green;
  return `${label} ${colorFn(bar)} ${Math.round(clamped)}%`;
}
function formatUsage5h(data) {
  if (data?.five_hour?.utilization == null) return null;
  return miniBar("5h", data.five_hour.utilization);
}
function formatUsage7d(data) {
  if (data?.seven_day?.utilization == null) return null;
  return miniBar("7d", data.seven_day.utilization);
}
function formatUsageOverage(data) {
  if (!data?.extra_usage?.is_enabled || data.extra_usage.used_credits == null) return null;
  const used = `$${(data.extra_usage.used_credits / 100).toFixed(0)}`;
  const limit = data.extra_usage.monthly_limit != null ? `/$${(data.extra_usage.monthly_limit / 100).toFixed(0)}` : "";
  const pct = data.extra_usage.utilization ?? 0;
  return miniBar(`+${used}${limit}`, pct);
}
function compactTokens(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}
function formatHeadroomTokens(stats) {
  if (!stats || stats.tokensSaved <= 0) return null;
  return dim(`\u2696\uFE0F ${compactTokens(stats.tokensSaved)} tokens saved`);
}
function formatHeadroomCompression(stats) {
  if (!stats || stats.compressionPct <= 0) return null;
  return green(`${Math.round(stats.compressionPct)}% compressed`);
}
function formatHeadroomCost(stats) {
  if (!stats || stats.costSavedUsd <= 0) return null;
  return green(`$${stats.costSavedUsd.toFixed(2)} saved`);
}
function formatHeadroomCacheHit(stats) {
  if (!stats || stats.cacheHitRate <= 0) return null;
  return dim(`${Math.round(stats.cacheHitRate * 100)}% cache hit`);
}
function formatTimeFromISO(iso) {
  return formatTime(new Date(iso).getTime());
}
function formatCacheStats(stats) {
  if (stats.breakCount === 0 && stats.totalReads === 0) return null;
  const reads = stats.totalReads > 0 ? dim(`\u2193${compactTokens(stats.totalReads)}`) : null;
  const writes = stats.totalWrites > 0 ? dim(`\u2191${compactTokens(stats.totalWrites)}`) : null;
  let breakLabel = null;
  if (stats.breakCount > 0) {
    const timeStr = stats.lastBreakTime ? ` ${formatTimeFromISO(stats.lastBreakTime)}` : "";
    const isLargeRewrite = stats.breakCount > 1 && stats.lastBreakTokens >= stats.avgBreakTokens * 2;
    const countStr = `${stats.breakCount}\u21BA`;
    breakLabel = isLargeRewrite ? yellow(`${countStr}${timeStr}`) : dim(`${countStr}${timeStr}`);
  }
  return [reads, writes, breakLabel].filter(Boolean).join(" ");
}

// src/widgets/PathWidget.ts
var PathWidget = class {
  getDisplayName() {
    return "Path";
  }
  getDescription() {
    return "Working directory";
  }
  getCategory() {
    return "Session";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "~/projects/my-app";
    const cwd = ctx.runtime.git.cwd ?? ctx.payload.cwd ?? ctx.payload.workspace?.current_dir ?? ctx.payload.workspace?.project_dir;
    return formatPath(cwd);
  }
};

// src/widgets/BranchWidget.ts
var BranchWidget = class {
  getDisplayName() {
    return "Branch";
  }
  getDescription() {
    return "Git branch name";
  }
  getCategory() {
    return "Session";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "main";
    return formatBranch(ctx.runtime.git.branch ?? ctx.payload.git_branch) || null;
  }
};

// src/widgets/ModelWidget.ts
var ModelWidget = class {
  getDisplayName() {
    return "Model";
  }
  getDescription() {
    return "Claude model name";
  }
  getCategory() {
    return "Session";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "Opus";
    return formatModel(ctx.payload.model ?? {});
  }
};

// src/widgets/CostWidget.ts
var CostWidget = class {
  getDisplayName() {
    return "Cost";
  }
  getDescription() {
    return "Session cost in USD";
  }
  getCategory() {
    return "Session";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "$0.45";
    return formatCost(ctx.payload.cost?.total_cost_usd);
  }
};

// src/widgets/data-keys.ts
var DATA_KEY = {
  CONTEXT_USAGE: "context-usage",
  CONTEXT_SIZE: "context-size",
  CACHE_HEALTH: "cache-health",
  USAGE_5H: "usage-5h",
  USAGE_7D: "usage-7d",
  USAGE_RUNWAY: "usage-runway",
  USAGE_OVERAGE: "usage-overage",
  HEADROOM_STATS: "headroom-stats",
  GIT_REMOTE_ORIGIN: "git-remote-origin",
  GIT_REMOTE_UPSTREAM: "git-remote-upstream",
  GIT_WORKING_TREE: "git-working-tree",
  GIT_WORKTREE: "git-worktree",
  TOKEN_COUNTS: "token-counts",
  TOKEN_SPEED: "token-speed"
};
var DATA_KEYS = [
  { key: DATA_KEY.CONTEXT_USAGE, displayName: "Context Usage", description: "Context window utilization (bar, percent, remaining)", category: "Context" },
  { key: DATA_KEY.CONTEXT_SIZE, displayName: "Context Size", description: "Raw context window size", category: "Context" },
  { key: DATA_KEY.CACHE_HEALTH, displayName: "Cache Health", description: "Cache TTL, token counts, and warnings", category: "Cache" },
  { key: DATA_KEY.USAGE_5H, displayName: "5h Rate Limit", description: "5-hour usage window (bar, percent, countdown, reset)", category: "Usage" },
  { key: DATA_KEY.USAGE_7D, displayName: "7d Rate Limit", description: "7-day usage window (bar, percent, countdown, reset)", category: "Usage" },
  { key: DATA_KEY.USAGE_RUNWAY, displayName: "Usage Runway", description: "Burn rate and estimated remaining active hours", category: "Usage" },
  { key: DATA_KEY.USAGE_OVERAGE, displayName: "Usage Overage", description: "Extra usage / overage spend", category: "Usage" },
  { key: DATA_KEY.HEADROOM_STATS, displayName: "Headroom Proxy", description: "Compression proxy stats (tokens, ratio, cost, cache hit)", category: "Headroom" },
  { key: DATA_KEY.GIT_REMOTE_ORIGIN, displayName: "Git Origin", description: "Origin remote info (owner, repo, owner/repo)", category: "Git" },
  { key: DATA_KEY.GIT_REMOTE_UPSTREAM, displayName: "Git Upstream", description: "Upstream remote info (owner, repo, owner/repo)", category: "Git" },
  { key: DATA_KEY.GIT_WORKING_TREE, displayName: "Git Working Tree", description: "Staged, unstaged, untracked, conflicts", category: "Git" },
  { key: DATA_KEY.GIT_WORKTREE, displayName: "Git Worktree", description: "Worktree mode, name, branch", category: "Git" },
  { key: DATA_KEY.TOKEN_COUNTS, displayName: "Token Counts", description: "Input, output, total, and cached token counts", category: "Tokens" },
  { key: DATA_KEY.TOKEN_SPEED, displayName: "Token Speed", description: "Input, output, and total throughput", category: "Tokens" }
];

// src/widgets/helpers.ts
function getVariant(item, fallback) {
  return item.variant ?? fallback;
}
function getOptionString(item, key, fallback = "") {
  const value = item.options?.[key];
  return typeof value === "string" ? value : fallback;
}
function getOptionNumber(item, key, fallback) {
  const value = item.options?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function renderLabel(label, value, item, ctx) {
  if (ctx.displayMode === "minimal" || item.rawValue) {
    return value;
  }
  return `${label}: ${value}`;
}
function formatDurationCompact(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
function formatPercent(value) {
  return `${Math.round(value)}%`;
}
function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
function formatTokenCount(value) {
  return compactTokens(value);
}
function formatSpeed(value) {
  return `${compactTokens(Math.round(value))}/s`;
}
function renderBadge(text) {
  return `[${text}]`;
}
function renderBar(percent, width, label) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round(clamped / 100 * width);
  const empty = Math.max(0, width - filled);
  const bar = `${"\u2588".repeat(filled)}${"\u2591".repeat(empty)}`;
  const color = clamped > 80 ? red : clamped > 60 ? yellow : green;
  const prefix = label ? `${label} ` : "";
  return `${prefix}${color(bar)} ${formatPercent(clamped)}`;
}

// src/widgets/ContextBarWidget.ts
var ContextBarWidget = class {
  getDisplayName() {
    return "Context Bar";
  }
  getDescription() {
    return "Context window usage bar";
  }
  getCategory() {
    return "Context";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getVariants() {
    return ["bar", "percent", "remaining"];
  }
  getDataKey() {
    return DATA_KEY.CONTEXT_USAGE;
  }
  render(item, ctx) {
    const rawPercent = ctx.isPreview ? 45 : ctx.payload.context_window?.used_percentage ?? null;
    if (rawPercent === null) return null;
    const percent = Math.max(0, Math.min(100, rawPercent));
    const variant = getVariant(item, "bar");
    if (variant === "percent") {
      return renderLabel("Ctx", formatPercent(percent), item, ctx);
    }
    if (variant === "remaining") {
      return renderLabel("Ctx Left", formatPercent(100 - percent), item, ctx);
    }
    return formatContext(percent);
  }
};

// src/widgets/CacheTTLWidget.ts
var CacheTTLWidget = class {
  getDisplayName() {
    return "Cache TTL";
  }
  getDescription() {
    return "Cache expiry countdown";
  }
  getCategory() {
    return "Cache";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getVariants() {
    return ["time", "countdown", "badge"];
  }
  getDataKey() {
    return DATA_KEY.CACHE_HEALTH;
  }
  render(item, ctx) {
    const variant = getVariant(item, "time");
    const cache = ctx.isPreview ? {
      remainingSeconds: 180,
      tier: "5m",
      lastWriteTime: null,
      expiresAt: Date.now() + 18e4,
      cacheReadActive: true
    } : ctx.cacheTTL;
    if (variant === "countdown") {
      if (cache.remainingSeconds <= 0) return renderLabel("Cache", "expired", item, ctx);
      return renderLabel("Cache", formatDurationCompact(cache.remainingSeconds), item, ctx);
    }
    if (variant === "badge") {
      if (cache.remainingSeconds <= 0) return renderBadge("cache expired");
      return renderBadge(`${cache.tier} ${formatDurationCompact(cache.remainingSeconds)}`);
    }
    if (ctx.isPreview) {
      return formatCache(cache);
    }
    return formatCache(ctx.cacheTTL);
  }
};

// src/widgets/CacheTokensWidget.ts
var CacheTokensWidget = class {
  getDisplayName() {
    return "Cache Tokens";
  }
  getDescription() {
    return "Session cache reads, writes, break count, and last break time";
  }
  getCategory() {
    return "Cache";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getDataKey() {
    return DATA_KEY.CACHE_HEALTH;
  }
  render(_item, ctx) {
    if (ctx.isPreview) {
      const reads = dim(`\u2193${compactTokens(123e4)}`);
      const writes = dim(`\u2191${compactTokens(456e3)}`);
      const breaks = yellow("3\u21BA 2:34p");
      return `${reads} ${writes} ${breaks}`;
    }
    return formatCacheStats(ctx.cacheStats);
  }
};

// src/widgets/Usage5hWidget.ts
var Usage5hWidget = class {
  getDisplayName() {
    return "5h Usage";
  }
  getDescription() {
    return "5-hour rate limit utilization";
  }
  getCategory() {
    return "Usage";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getVariants() {
    return ["bar", "percent", "countdown"];
  }
  getDataKey() {
    return DATA_KEY.USAGE_5H;
  }
  render(item, ctx) {
    const variant = getVariant(item, "bar");
    if (variant === "countdown") {
      const seconds = ctx.isPreview ? 67 * 60 : ctx.runtime.usage.fiveHourResetSeconds;
      return seconds !== null ? renderLabel("5h Reset", formatDurationCompact(seconds), item, ctx) : null;
    }
    if (variant === "percent") {
      const pct = ctx.isPreview ? 35 : ctx.usageData?.five_hour?.utilization ?? null;
      return pct !== null ? renderLabel("5h", `${Math.round(pct)}%`, item, ctx) : null;
    }
    if (ctx.isPreview) return "5h \u2588\u2588\u2591\u2591\u2591 35%";
    return formatUsage5h(ctx.usageData);
  }
};

// src/widgets/Usage7dWidget.ts
var Usage7dWidget = class {
  getDisplayName() {
    return "7d Usage";
  }
  getDescription() {
    return "7-day rate limit utilization";
  }
  getCategory() {
    return "Usage";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getVariants() {
    return ["bar", "percent", "countdown"];
  }
  getDataKey() {
    return DATA_KEY.USAGE_7D;
  }
  render(item, ctx) {
    const variant = getVariant(item, "bar");
    if (variant === "countdown") {
      const seconds = ctx.isPreview ? 3 * 24 * 3600 : ctx.runtime.usage.sevenDayResetSeconds;
      return seconds !== null ? renderLabel("7d Reset", formatDurationCompact(seconds), item, ctx) : null;
    }
    if (variant === "percent") {
      const pct = ctx.isPreview ? 20 : ctx.usageData?.seven_day?.utilization ?? null;
      return pct !== null ? renderLabel("7d", `${Math.round(pct)}%`, item, ctx) : null;
    }
    if (ctx.isPreview) return "7d \u2588\u2591\u2591\u2591\u2591 20%";
    return formatUsage7d(ctx.usageData);
  }
};

// src/widgets/UsageOverageWidget.ts
var UsageOverageWidget = class {
  getDisplayName() {
    return "Overage";
  }
  getDescription() {
    return "Extra usage / overage spend";
  }
  getCategory() {
    return "Usage";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getVariants() {
    return ["bar", "percent"];
  }
  getDataKey() {
    return DATA_KEY.USAGE_OVERAGE;
  }
  render(item, ctx) {
    const variant = getVariant(item, "bar");
    if (variant === "percent") {
      const pct = ctx.isPreview ? 25 : ctx.usageData?.extra_usage?.utilization ?? null;
      return pct !== null ? renderLabel("Overage", `${Math.round(pct)}%`, item, ctx) : null;
    }
    if (ctx.isPreview) return "+$5/$20 \u2588\u2591\u2591\u2591\u2591 25%";
    return formatUsageOverage(ctx.usageData);
  }
};

// src/widgets/HeadroomTokensWidget.ts
var HeadroomTokensWidget = class {
  getDisplayName() {
    return "Tokens Saved";
  }
  getDescription() {
    return "Headroom tokens saved count";
  }
  getCategory() {
    return "Headroom";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getDataKey() {
    return DATA_KEY.HEADROOM_STATS;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "\u2696\uFE0F 491k tokens saved";
    return formatHeadroomTokens(ctx.headroomStats);
  }
};

// src/widgets/HeadroomCompressionWidget.ts
var HeadroomCompressionWidget = class {
  getDisplayName() {
    return "Compression";
  }
  getDescription() {
    return "Headroom compression percentage";
  }
  getCategory() {
    return "Headroom";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getDataKey() {
    return DATA_KEY.HEADROOM_STATS;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "34% compressed";
    return formatHeadroomCompression(ctx.headroomStats);
  }
};

// src/widgets/HeadroomCostWidget.ts
var HeadroomCostWidget = class {
  getDisplayName() {
    return "Cost Saved";
  }
  getDescription() {
    return "Headroom cost savings";
  }
  getCategory() {
    return "Headroom";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getDataKey() {
    return DATA_KEY.HEADROOM_STATS;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "$0.12 saved";
    return formatHeadroomCost(ctx.headroomStats);
  }
};

// src/widgets/HeadroomCacheHitWidget.ts
var HeadroomCacheHitWidget = class {
  getDisplayName() {
    return "Cache Hit Rate";
  }
  getDescription() {
    return "Headroom prefix cache hit rate";
  }
  getCategory() {
    return "Headroom";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return false;
  }
  getDataKey() {
    return DATA_KEY.HEADROOM_STATS;
  }
  render(_item, ctx) {
    if (ctx.isPreview) return "78% cache hit";
    return formatHeadroomCacheHit(ctx.headroomStats);
  }
};

// src/widgets/SeparatorWidget.ts
var SeparatorWidget = class {
  getDisplayName() {
    return "Separator";
  }
  getDescription() {
    return "Visual separator between widgets";
  }
  getCategory() {
    return "Layout";
  }
  getDefaultColor() {
    return "dim";
  }
  supportsColors() {
    return false;
  }
  render(_item, _ctx) {
    return dim(" | ");
  }
};

// src/widgets/CustomTextWidget.ts
var CustomTextWidget = class {
  getDisplayName() {
    return "Custom Text";
  }
  getDescription() {
    return "Static custom text";
  }
  getCategory() {
    return "Layout";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
  render(item, _ctx) {
    return item.customText ?? null;
  }
};

// src/runtime.ts
import { execFileSync, execSync } from "child_process";
function runCustomCommand(command, payload, cwd, timeoutMs) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      timeout: timeoutMs > 0 ? timeoutMs : void 0,
      shell: process.env.ComSpec ?? "/bin/sh",
      ...cwd ? { cwd } : {},
      input: JSON.stringify(payload)
    }).trim() || null;
  } catch {
    return null;
  }
}

// src/widgets/SessionWidgets.ts
function formatClock() {
  const now = /* @__PURE__ */ new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "p" : "a";
  hours = hours % 12 || 12;
  return `${hours}:${minutes}${ampm}`;
}
function sanitizeTerminalText(value) {
  return value.replace(/[\u0007\u001b\u009c]/g, "");
}
function hyperlink(text, url) {
  const safeText = sanitizeTerminalText(text);
  const safeUrl = sanitizeTerminalText(url);
  if (!/^https?:\/\//i.test(safeUrl)) {
    return safeText;
  }
  return `\x1B]8;;${safeUrl}\x07${safeText}\x1B]8;;\x07`;
}
var BaseWidget = class {
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
};
var SessionIdWidget = class extends BaseWidget {
  getDisplayName() {
    return "Session ID";
  }
  getDescription() {
    return "Current Claude Code session identifier";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    if (ctx.isPreview) return renderLabel("Session", "abc123", item, ctx);
    const value = ctx.runtime.session.sessionId;
    return value ? renderLabel("Session", value, item, ctx) : null;
  }
};
var VersionWidget = class extends BaseWidget {
  getDisplayName() {
    return "Version";
  }
  getDescription() {
    return "Claude Code version";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    if (ctx.isPreview) return renderLabel("Version", "1.0.22", item, ctx);
    const value = ctx.runtime.session.version;
    return value ? renderLabel("Version", value, item, ctx) : null;
  }
};
var OutputStyleWidget = class extends BaseWidget {
  getDisplayName() {
    return "Output Style";
  }
  getDescription() {
    return "Current Claude output style";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    if (ctx.isPreview) return renderLabel("Style", "default", item, ctx);
    const value = ctx.runtime.session.outputStyle;
    return value ? renderLabel("Style", value, item, ctx) : null;
  }
};
var SessionClockWidget = class extends BaseWidget {
  getDisplayName() {
    return "Session Clock";
  }
  getDescription() {
    return "Current local time";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    const value = ctx.isPreview ? "9:32p" : formatClock();
    return renderLabel("Time", value, item, ctx);
  }
};
var SessionElapsedWidget = class extends BaseWidget {
  getDisplayName() {
    return "Session Elapsed";
  }
  getDescription() {
    return "Elapsed time since the transcript began";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    if (ctx.isPreview) return renderLabel("Session", "42m 12s", item, ctx);
    const seconds = ctx.runtime.session.elapsedSeconds;
    return seconds !== null ? renderLabel("Session", formatDurationCompact(seconds), item, ctx) : null;
  }
};
var AccountEmailWidget = class extends BaseWidget {
  getDisplayName() {
    return "Account Email";
  }
  getDescription() {
    return "Signed-in Claude account email";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    if (ctx.isPreview) return renderLabel("Account", "me@example.com", item, ctx);
    const value = ctx.runtime.session.accountEmail;
    return value ? renderLabel("Account", value, item, ctx) : null;
  }
};
var ThinkingEffortWidget = class extends BaseWidget {
  getDisplayName() {
    return "Thinking Effort";
  }
  getDescription() {
    return "Current effort or thinking mode if available";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    if (ctx.isPreview) return renderLabel("Effort", "high", item, ctx);
    const value = ctx.runtime.session.thinkingEffort;
    return value ? renderLabel("Effort", value, item, ctx) : null;
  }
};
var VimModeWidget = class extends BaseWidget {
  getDisplayName() {
    return "Vim Mode";
  }
  getDescription() {
    return "Current vim editing mode if available";
  }
  getCategory() {
    return "Session";
  }
  render(item, ctx) {
    if (ctx.isPreview) return renderLabel("Vim", "insert", item, ctx);
    const value = ctx.runtime.session.vimMode;
    return value ? renderLabel("Vim", value, item, ctx) : null;
  }
};
var SkillsWidget = class extends BaseWidget {
  getDisplayName() {
    return "Skills";
  }
  getDescription() {
    return "Active skill names or skill count";
  }
  getCategory() {
    return "Session";
  }
  getVariants() {
    return ["count", "list"];
  }
  render(item, ctx) {
    const variant = getVariant(item, "count");
    const skills = ctx.isPreview ? ["brainstorming", "frontend-design"] : ctx.runtime.session.skills;
    if (skills.length === 0) return null;
    if (variant === "list") {
      return renderLabel("Skills", skills.join(", "), item, ctx);
    }
    return renderLabel("Skills", renderBadge(String(skills.length)), item, ctx);
  }
};
var TerminalWidthWidget = class extends BaseWidget {
  getDisplayName() {
    return "Terminal Width";
  }
  getDescription() {
    return "Detected terminal width in columns";
  }
  getCategory() {
    return "Environment";
  }
  render(item, ctx) {
    const width = ctx.isPreview ? 132 : ctx.runtime.system.terminalWidth;
    return width !== null ? renderLabel("Cols", String(width), item, ctx) : null;
  }
};
var MemoryUsageWidget = class extends BaseWidget {
  getDisplayName() {
    return "Memory Usage";
  }
  getDescription() {
    return "System memory usage";
  }
  getCategory() {
    return "Environment";
  }
  render(item, ctx) {
    const used = ctx.isPreview ? 8.2 * 1024 ** 3 : ctx.runtime.system.memoryUsedBytes;
    const total = ctx.isPreview ? 32 * 1024 ** 3 : ctx.runtime.system.memoryTotalBytes;
    return renderLabel("Mem", `${formatBytes(used)}/${formatBytes(total)}`, item, ctx);
  }
};
var CustomSymbolWidget = class extends BaseWidget {
  getDisplayName() {
    return "Custom Symbol";
  }
  getDescription() {
    return "Static symbol or emoji marker";
  }
  getCategory() {
    return "Layout";
  }
  render(item) {
    return item.customText ?? getOptionString(item, "symbol", "\u2022");
  }
};
var LinkWidget = class extends BaseWidget {
  getDisplayName() {
    return "Link";
  }
  getDescription() {
    return "Clickable hyperlink for OSC 8 terminals";
  }
  getCategory() {
    return "Layout";
  }
  render(item, ctx) {
    const url = getOptionString(item, "url", "");
    const text = item.customText ?? getOptionString(item, "text", url || "link");
    if (ctx.isPreview) return hyperlink("docs", "https://example.com");
    if (!url) return text || null;
    return hyperlink(text || url, url);
  }
};
var CustomCommandWidget = class extends BaseWidget {
  getDisplayName() {
    return "Custom Command";
  }
  getDescription() {
    return "Runs a shell command and renders its output";
  }
  getCategory() {
    return "Layout";
  }
  render(item, ctx) {
    if (ctx.isPreview) return "command output";
    const command = getOptionString(item, "command", "");
    if (!command) return null;
    const timeoutMs = getOptionNumber(item, "timeoutMs", 1e3);
    return runCustomCommand(command, ctx.payload, ctx.runtime.git.cwd, timeoutMs);
  }
};

// src/widgets/GitWidgets.ts
var BaseGitWidget = class {
  getCategory() {
    return "Git";
  }
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
};
var GitStatusWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Status";
  }
  getDescription() {
    return "Compact summary of staged, unstaged, untracked, and conflict counts";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKING_TREE;
  }
  render(item, ctx) {
    const git = ctx.runtime.git;
    if (ctx.isPreview) return renderLabel("Git", "+2 ~1 ?3", item, ctx);
    if (!git.available) return null;
    const parts = [
      git.staged > 0 ? `+${git.staged}` : null,
      git.unstaged > 0 ? `~${git.unstaged}` : null,
      git.untracked > 0 ? `?${git.untracked}` : null,
      git.conflicts > 0 ? `!${git.conflicts}` : null
    ].filter(Boolean);
    return parts.length > 0 ? renderLabel("Git", parts.join(" "), item, ctx) : null;
  }
};
var GitChangesWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Changes";
  }
  getDescription() {
    return "Total changed paths in the working tree";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKING_TREE;
  }
  render(item, ctx) {
    const count = ctx.isPreview ? 6 : ctx.runtime.git.changes;
    return count > 0 ? renderLabel("Changes", String(count), item, ctx) : null;
  }
};
var GitStagedWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Staged";
  }
  getDescription() {
    return "Count of staged files";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKING_TREE;
  }
  render(item, ctx) {
    const count = ctx.isPreview ? 2 : ctx.runtime.git.staged;
    return count > 0 ? renderLabel("Staged", String(count), item, ctx) : null;
  }
};
var GitUnstagedWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Unstaged";
  }
  getDescription() {
    return "Count of unstaged files";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKING_TREE;
  }
  render(item, ctx) {
    const count = ctx.isPreview ? 1 : ctx.runtime.git.unstaged;
    return count > 0 ? renderLabel("Unstaged", String(count), item, ctx) : null;
  }
};
var GitUntrackedWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Untracked";
  }
  getDescription() {
    return "Count of untracked files";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKING_TREE;
  }
  render(item, ctx) {
    const count = ctx.isPreview ? 3 : ctx.runtime.git.untracked;
    return count > 0 ? renderLabel("Untracked", String(count), item, ctx) : null;
  }
};
var GitAheadBehindWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Ahead/Behind";
  }
  getDescription() {
    return "Commit divergence from the tracked branch";
  }
  render(item, ctx) {
    const ahead = ctx.isPreview ? 1 : ctx.runtime.git.ahead;
    const behind = ctx.isPreview ? 2 : ctx.runtime.git.behind;
    const parts = [
      ahead > 0 ? `\u2191${ahead}` : null,
      behind > 0 ? `\u2193${behind}` : null
    ].filter(Boolean);
    return parts.length > 0 ? renderLabel("Sync", parts.join(" "), item, ctx) : null;
  }
};
var GitConflictsWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Conflicts";
  }
  getDescription() {
    return "Count of conflicted paths";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKING_TREE;
  }
  render(item, ctx) {
    const count = ctx.isPreview ? 1 : ctx.runtime.git.conflicts;
    return count > 0 ? renderLabel("Conflicts", String(count), item, ctx) : null;
  }
};
var GitShaWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git SHA";
  }
  getDescription() {
    return "Short commit SHA";
  }
  render(item, ctx) {
    const value = ctx.isPreview ? "a1b2c3d" : ctx.runtime.git.sha;
    return value ? renderLabel("SHA", value, item, ctx) : null;
  }
};
var GitRootDirWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Root Dir";
  }
  getDescription() {
    return "Repository root directory name";
  }
  render(item, ctx) {
    const value = ctx.isPreview ? "my-repo" : ctx.runtime.git.rootName;
    return value ? renderLabel("Repo", value, item, ctx) : null;
  }
};
var GitInsertionsWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Insertions";
  }
  getDescription() {
    return "Uncommitted inserted lines";
  }
  render(item, ctx) {
    const count = ctx.isPreview ? 42 : ctx.runtime.git.insertions;
    return count > 0 ? renderLabel("Insertions", `+${count}`, item, ctx) : null;
  }
};
var GitDeletionsWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Deletions";
  }
  getDescription() {
    return "Uncommitted deleted lines";
  }
  render(item, ctx) {
    const count = ctx.isPreview ? 10 : ctx.runtime.git.deletions;
    return count > 0 ? renderLabel("Deletions", `-${count}`, item, ctx) : null;
  }
};
var RemoteFieldWidget = class extends BaseGitWidget {
  constructor(displayName, description, remote, field) {
    super();
    this.displayName = displayName;
    this.description = description;
    this.remote = remote;
    this.field = field;
  }
  getDisplayName() {
    return this.displayName;
  }
  getDescription() {
    return this.description;
  }
  getDataKey() {
    return this.remote === "origin" ? DATA_KEY.GIT_REMOTE_ORIGIN : DATA_KEY.GIT_REMOTE_UPSTREAM;
  }
  render(item, ctx) {
    const remote = this.remote === "origin" ? ctx.runtime.git.origin : ctx.runtime.git.upstream;
    const preview = this.remote === "origin" ? { owner: "octocat", repo: "app" } : { owner: "upstream", repo: "app" };
    const owner = ctx.isPreview ? preview.owner : remote?.owner;
    const repo = ctx.isPreview ? preview.repo : remote?.repo;
    const value = this.field === "owner" ? owner : this.field === "repo" ? repo : owner && repo ? `${owner}/${repo}` : null;
    return value ? renderLabel(this.displayName, value, item, ctx) : null;
  }
};
var GitOriginOwnerWidget = class extends RemoteFieldWidget {
  constructor() {
    super("Origin Owner", "Git origin owner", "origin", "owner");
  }
};
var GitOriginRepoWidget = class extends RemoteFieldWidget {
  constructor() {
    super("Origin Repo", "Git origin repository", "origin", "repo");
  }
};
var GitOriginOwnerRepoWidget = class extends RemoteFieldWidget {
  constructor() {
    super("Origin", "Git origin owner/repository", "origin", "ownerRepo");
  }
};
var GitUpstreamOwnerWidget = class extends RemoteFieldWidget {
  constructor() {
    super("Upstream Owner", "Git upstream owner", "upstream", "owner");
  }
};
var GitUpstreamRepoWidget = class extends RemoteFieldWidget {
  constructor() {
    super("Upstream Repo", "Git upstream repository", "upstream", "repo");
  }
};
var GitUpstreamOwnerRepoWidget = class extends RemoteFieldWidget {
  constructor() {
    super("Upstream", "Git upstream owner/repository", "upstream", "ownerRepo");
  }
};
var GitIsForkWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Is Fork";
  }
  getDescription() {
    return "Whether origin and upstream differ";
  }
  render(item, ctx) {
    const value = ctx.isPreview ? true : ctx.runtime.git.isFork;
    return value ? renderLabel("Fork", renderBadge("yes"), item, ctx) : null;
  }
};
var GitWorktreeModeWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Worktree Mode";
  }
  getDescription() {
    return "Primary, linked, or detached worktree mode";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKTREE;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? "linked" : ctx.runtime.git.worktreeMode;
    return value ? renderLabel("Worktree", value, item, ctx) : null;
  }
};
var GitWorktreeNameWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Worktree Name";
  }
  getDescription() {
    return "Current worktree name";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKTREE;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? "my-repo" : ctx.runtime.git.worktreeName;
    return value ? renderLabel("Worktree", value, item, ctx) : null;
  }
};
var GitWorktreeBranchWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Worktree Branch";
  }
  getDescription() {
    return "Branch associated with the current worktree";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKTREE;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? "feat/widgets" : ctx.runtime.git.worktreeBranch;
    return value ? renderLabel("Worktree Branch", value, item, ctx) : null;
  }
};
var GitWorktreeOriginalBranchWidget = class extends BaseGitWidget {
  getDisplayName() {
    return "Git Worktree Original Branch";
  }
  getDescription() {
    return "Original branch for the current worktree";
  }
  getDataKey() {
    return DATA_KEY.GIT_WORKTREE;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? "main" : ctx.runtime.git.worktreeOriginalBranch;
    return value ? renderLabel("Origin Branch", value, item, ctx) : null;
  }
};

// src/widgets/MetricWidgets.ts
var BaseWidget2 = class {
  getDefaultColor() {
    return "default";
  }
  supportsColors() {
    return true;
  }
};
var InputTokensWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Tokens Input";
  }
  getDescription() {
    return "Total input tokens in the current session";
  }
  getCategory() {
    return "Tokens";
  }
  getDataKey() {
    return DATA_KEY.TOKEN_COUNTS;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 18200 : ctx.runtime.tokens.input;
    return value !== null ? renderLabel("Input", formatTokenCount(value), item, ctx) : null;
  }
};
var OutputTokensWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Tokens Output";
  }
  getDescription() {
    return "Total output tokens in the current session";
  }
  getCategory() {
    return "Tokens";
  }
  getDataKey() {
    return DATA_KEY.TOKEN_COUNTS;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 2400 : ctx.runtime.tokens.output;
    return value !== null ? renderLabel("Output", formatTokenCount(value), item, ctx) : null;
  }
};
var TotalTokensWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Tokens Total";
  }
  getDescription() {
    return "Combined input, output, and cached token counts";
  }
  getCategory() {
    return "Tokens";
  }
  getDataKey() {
    return DATA_KEY.TOKEN_COUNTS;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 21600 : ctx.runtime.tokens.total;
    return value !== null ? renderLabel("Tokens", formatTokenCount(value), item, ctx) : null;
  }
};
var InputSpeedWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Input Speed";
  }
  getDescription() {
    return "Average input token throughput per second";
  }
  getCategory() {
    return "Tokens";
  }
  getDataKey() {
    return DATA_KEY.TOKEN_SPEED;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 1200 : ctx.runtime.tokens.inputSpeed;
    return value !== null ? renderLabel("Input/s", formatSpeed(value), item, ctx) : null;
  }
};
var OutputSpeedWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Output Speed";
  }
  getDescription() {
    return "Average output token throughput per second";
  }
  getCategory() {
    return "Tokens";
  }
  getDataKey() {
    return DATA_KEY.TOKEN_SPEED;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 180 : ctx.runtime.tokens.outputSpeed;
    return value !== null ? renderLabel("Output/s", formatSpeed(value), item, ctx) : null;
  }
};
var TotalSpeedWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Total Speed";
  }
  getDescription() {
    return "Average total token throughput per second";
  }
  getCategory() {
    return "Tokens";
  }
  getDataKey() {
    return DATA_KEY.TOKEN_SPEED;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 1380 : ctx.runtime.tokens.totalSpeed;
    return value !== null ? renderLabel("Tokens/s", formatSpeed(value), item, ctx) : null;
  }
};
var ContextPercentageWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Context %";
  }
  getDescription() {
    return "Context window used percentage";
  }
  getCategory() {
    return "Context";
  }
  getVariants() {
    return ["percent", "bar", "remaining"];
  }
  getDataKey() {
    return DATA_KEY.CONTEXT_USAGE;
  }
  render(item, ctx) {
    const variant = getVariant(item, "percent");
    const rawPercent = ctx.isPreview ? 45 : ctx.payload.context_window?.used_percentage ?? null;
    if (rawPercent === null) return null;
    const clampedPercent = Math.max(0, Math.min(100, rawPercent));
    if (variant === "bar") {
      return renderBar(clampedPercent, 8, ctx.displayMode === "minimal" || item.rawValue ? void 0 : "Ctx");
    }
    const percent = variant === "remaining" ? 100 - clampedPercent : clampedPercent;
    const label = variant === "remaining" ? "Ctx Left" : "Ctx";
    return renderLabel(label, formatPercent(percent), item, ctx);
  }
};
var ContextLengthWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Context Length";
  }
  getDescription() {
    return "Maximum context window size";
  }
  getCategory() {
    return "Context";
  }
  getDataKey() {
    return DATA_KEY.CONTEXT_SIZE;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 2e5 : ctx.payload.context_window?.context_window_size ?? null;
    return value !== null ? renderLabel("Context", formatTokenCount(value), item, ctx) : null;
  }
};
var UsageReset5hWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Block Reset Timer";
  }
  getDescription() {
    return "Time until the 5-hour usage window resets";
  }
  getCategory() {
    return "Usage";
  }
  getDataKey() {
    return DATA_KEY.USAGE_5H;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 67 * 60 : ctx.runtime.usage.fiveHourResetSeconds;
    return value !== null ? renderLabel("5h Reset", formatDurationCompact(value), item, ctx) : null;
  }
};
var UsageReset7dWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Weekly Reset Timer";
  }
  getDescription() {
    return "Time until the 7-day usage window resets";
  }
  getCategory() {
    return "Usage";
  }
  getDataKey() {
    return DATA_KEY.USAGE_7D;
  }
  render(item, ctx) {
    const value = ctx.isPreview ? 3 * 24 * 3600 : ctx.runtime.usage.sevenDayResetSeconds;
    return value !== null ? renderLabel("7d Reset", formatDurationCompact(value), item, ctx) : null;
  }
};
var ReplayCostWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Replay Cost";
  }
  getDescription() {
    return "Tokens that will be re-sent on the next turn (cache_read + input)";
  }
  getCategory() {
    return "Cache";
  }
  getDataKey() {
    return DATA_KEY.CACHE_HEALTH;
  }
  render(item, ctx) {
    const current = ctx.payload.context_window?.current_usage;
    if (!current) return null;
    const cacheRead = current.cache_read_input_tokens ?? 0;
    const input = current.input_tokens ?? 0;
    const replayCost = ctx.isPreview ? 142e3 : cacheRead + input;
    if (replayCost === 0) return null;
    let coloredValue;
    const compact = formatTokenCount(replayCost);
    if (replayCost < 2e5) {
      coloredValue = compact;
    } else if (replayCost < 5e5) {
      coloredValue = `${compact} \u26A0`;
    } else {
      coloredValue = `${compact} \u26A0`;
    }
    return renderLabel("R", coloredValue, item, ctx);
  }
};
var RunwayWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Usage Runway";
  }
  getDescription() {
    return "Estimated remaining active hours at current burn rate (7-day window)";
  }
  getCategory() {
    return "Usage";
  }
  getDataKey() {
    return DATA_KEY.USAGE_RUNWAY;
  }
  render(item, ctx) {
    const sevenDayResetSeconds = ctx.runtime.usage.sevenDayResetSeconds;
    const elapsedSeconds = ctx.runtime.session.elapsedSeconds;
    if (sevenDayResetSeconds === null || elapsedSeconds === null || elapsedSeconds === 0) {
      return null;
    }
    const totalWindow = 7 * 24 * 3600;
    const utilizationPercent = (totalWindow - sevenDayResetSeconds) / totalWindow * 100;
    if (ctx.isPreview) {
      return renderLabel("Runway", "12h", item, ctx);
    }
    if (utilizationPercent === 0) return null;
    const elapsedHours = elapsedSeconds / 3600;
    const burnRate = utilizationPercent / elapsedHours;
    const remaining = burnRate > 0 ? (100 - utilizationPercent) / burnRate : Infinity;
    if (!Number.isFinite(remaining) || remaining < 0) return null;
    let formatted;
    if (remaining >= 10) {
      formatted = `${Math.round(remaining)}h`;
    } else if (remaining >= 3) {
      formatted = `${remaining.toFixed(1)}h \u26A0`;
    } else {
      formatted = `${remaining.toFixed(1)}h \u26A0`;
    }
    return renderLabel("Runway", formatted, item, ctx);
  }
};
var LargeCacheWarningWidget = class extends BaseWidget2 {
  getDisplayName() {
    return "Large Cache Warning";
  }
  getDescription() {
    return "Warning indicator when cached tool results exceed threshold";
  }
  getCategory() {
    return "Cache";
  }
  getDataKey() {
    return DATA_KEY.CACHE_HEALTH;
  }
  render(item, ctx) {
    const threshold = ctx.isPreview ? 1e6 : 2e6;
    const lastBreakTokens = ctx.cacheStats.lastBreakTokens;
    if (ctx.isPreview) {
      return "\u26A0 large cache";
    }
    if (lastBreakTokens > threshold) {
      return "\u26A0 large cache";
    }
    return null;
  }
};

// src/widgets/registry.ts
var WIDGET_MANIFEST = [
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
  { type: "large-cache-warning", create: () => new LargeCacheWarningWidget() }
];
var widgetRegistry = new Map(
  WIDGET_MANIFEST.map((entry) => [entry.type, entry.create()])
);
function getWidget(type) {
  return widgetRegistry.get(type) ?? null;
}

// src/renderer.ts
function renderStatusLine(settings, context) {
  const lines = [];
  for (const lineItems of settings.lines) {
    const rendered = [];
    for (const item of lineItems) {
      const widget = getWidget(item.type);
      if (!widget) continue;
      const rawValue = widget.render(item, context);
      const value = rawValue !== null && item.color && item.color !== "default" ? applyColor(rawValue, item.color) : rawValue;
      rendered.push({ value, isSep: item.type === "separator" });
    }
    const segments = [];
    let lastWasSep = false;
    for (let i = 0; i < rendered.length; i++) {
      const { value, isSep } = rendered[i];
      if (value === null) continue;
      if (isSep) {
        if (lastWasSep) continue;
        const hasAfter = rendered.slice(i + 1).some((r) => !r.isSep && r.value !== null);
        if (segments.length > 0 && hasAfter) {
          segments.push(value);
          lastWasSep = true;
        }
      } else {
        segments.push(value);
        lastWasSep = false;
      }
    }
    if (segments.length > 0) {
      lines.push(segments.join(""));
    }
  }
  return lines.join("\n");
}
export {
  renderStatusLine
};
