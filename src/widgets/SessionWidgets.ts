import { runCustomCommand } from "../runtime.js";
import type { Widget, WidgetItem, RenderContext } from "./types.js";
import {
  formatBytes,
  formatDurationCompact,
  getOptionNumber,
  getOptionString,
  getVariant,
  renderBadge,
  renderLabel,
} from "./helpers.js";

function formatClock(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "p" : "a";
  hours = hours % 12 || 12;
  return `${hours}:${minutes}${ampm}`;
}

function sanitizeTerminalText(value: string): string {
  return value.replace(/[\u0007\u001b\u009c]/g, "");
}

function hyperlink(text: string, url: string): string {
  const safeText = sanitizeTerminalText(text);
  const safeUrl = sanitizeTerminalText(url);
  if (!/^https?:\/\//i.test(safeUrl)) {
    return safeText;
  }
  return `\u001B]8;;${safeUrl}\u0007${safeText}\u001B]8;;\u0007`;
}

abstract class BaseWidget implements Widget {
  abstract getDisplayName(): string;
  abstract getDescription(): string;
  abstract getCategory(): string;
  abstract render(item: WidgetItem, ctx: RenderContext): string | null;
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
}

export class SessionIdWidget extends BaseWidget {
  getDisplayName() { return "Session ID"; }
  getDescription() { return "Current Claude Code session identifier"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return renderLabel("Session", "abc123", item, ctx);
    const value = ctx.runtime.session.sessionId;
    return value ? renderLabel("Session", value, item, ctx) : null;
  }
}

export class VersionWidget extends BaseWidget {
  getDisplayName() { return "Version"; }
  getDescription() { return "Claude Code version"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return renderLabel("Version", "1.0.22", item, ctx);
    const value = ctx.runtime.session.version;
    return value ? renderLabel("Version", value, item, ctx) : null;
  }
}

export class OutputStyleWidget extends BaseWidget {
  getDisplayName() { return "Output Style"; }
  getDescription() { return "Current Claude output style"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return renderLabel("Style", "default", item, ctx);
    const value = ctx.runtime.session.outputStyle;
    return value ? renderLabel("Style", value, item, ctx) : null;
  }
}

export class SessionClockWidget extends BaseWidget {
  getDisplayName() { return "Session Clock"; }
  getDescription() { return "Current local time"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? "9:32p" : formatClock();
    return renderLabel("Time", value, item, ctx);
  }
}

export class SessionElapsedWidget extends BaseWidget {
  getDisplayName() { return "Session Elapsed"; }
  getDescription() { return "Elapsed time since the transcript began"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return renderLabel("Session", "42m 12s", item, ctx);
    const seconds = ctx.runtime.session.elapsedSeconds;
    return seconds !== null ? renderLabel("Session", formatDurationCompact(seconds), item, ctx) : null;
  }
}

export class AccountEmailWidget extends BaseWidget {
  getDisplayName() { return "Account Email"; }
  getDescription() { return "Signed-in Claude account email"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return renderLabel("Account", "me@example.com", item, ctx);
    const value = ctx.runtime.session.accountEmail;
    return value ? renderLabel("Account", value, item, ctx) : null;
  }
}

export class ThinkingEffortWidget extends BaseWidget {
  getDisplayName() { return "Thinking Effort"; }
  getDescription() { return "Current effort or thinking mode if available"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return renderLabel("Effort", "high", item, ctx);
    const value = ctx.runtime.session.thinkingEffort;
    return value ? renderLabel("Effort", value, item, ctx) : null;
  }
}

export class VimModeWidget extends BaseWidget {
  getDisplayName() { return "Vim Mode"; }
  getDescription() { return "Current vim editing mode if available"; }
  getCategory() { return "Session"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return renderLabel("Vim", "insert", item, ctx);
    const value = ctx.runtime.session.vimMode;
    return value ? renderLabel("Vim", value, item, ctx) : null;
  }
}

export class SkillsWidget extends BaseWidget {
  getDisplayName() { return "Skills"; }
  getDescription() { return "Active skill names or skill count"; }
  getCategory() { return "Session"; }
  getVariants() { return ["count", "list"]; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const variant = getVariant(item, "count");
    const skills = ctx.isPreview ? ["brainstorming", "frontend-design"] : ctx.runtime.session.skills;
    if (skills.length === 0) return null;
    if (variant === "list") {
      return renderLabel("Skills", skills.join(", "), item, ctx);
    }
    return renderLabel("Skills", renderBadge(String(skills.length)), item, ctx);
  }
}

export class TerminalWidthWidget extends BaseWidget {
  getDisplayName() { return "Terminal Width"; }
  getDescription() { return "Detected terminal width in columns"; }
  getCategory() { return "Environment"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const width = ctx.isPreview ? 132 : ctx.runtime.system.terminalWidth;
    return width !== null ? renderLabel("Cols", String(width), item, ctx) : null;
  }
}

export class MemoryUsageWidget extends BaseWidget {
  getDisplayName() { return "Memory Usage"; }
  getDescription() { return "System memory usage"; }
  getCategory() { return "Environment"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const used = ctx.isPreview ? 8.2 * 1024 ** 3 : ctx.runtime.system.memoryUsedBytes;
    const total = ctx.isPreview ? 32 * 1024 ** 3 : ctx.runtime.system.memoryTotalBytes;
    return renderLabel("Mem", `${formatBytes(used)}/${formatBytes(total)}`, item, ctx);
  }
}

export class CustomSymbolWidget extends BaseWidget {
  getDisplayName() { return "Custom Symbol"; }
  getDescription() { return "Static symbol or emoji marker"; }
  getCategory() { return "Layout"; }
  render(item: WidgetItem): string | null {
    return item.customText ?? getOptionString(item, "symbol", "•");
  }
}

export class LinkWidget extends BaseWidget {
  getDisplayName() { return "Link"; }
  getDescription() { return "Clickable hyperlink for OSC 8 terminals"; }
  getCategory() { return "Layout"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const url = getOptionString(item, "url", "");
    const text = item.customText ?? getOptionString(item, "text", url || "link");
    if (ctx.isPreview) return hyperlink("docs", "https://example.com");
    if (!url) return text || null;
    return hyperlink(text || url, url);
  }
}

export class CustomCommandWidget extends BaseWidget {
  getDisplayName() { return "Custom Command"; }
  getDescription() { return "Runs a shell command and renders its output"; }
  getCategory() { return "Layout"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "command output";
    const command = getOptionString(item, "command", "");
    if (!command) return null;
    const timeoutMs = getOptionNumber(item, "timeoutMs", 1000);
    return runCustomCommand(command, ctx.payload, ctx.runtime.git.cwd, timeoutMs);
  }
}
