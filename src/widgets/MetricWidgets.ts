import type { Widget, WidgetItem, RenderContext } from "./types.js";
import {
  formatDurationCompact,
  formatPercent,
  formatSpeed,
  formatTokenCount,
  getVariant,
  renderBar,
  renderLabel,
} from "./helpers.js";

abstract class BaseWidget implements Widget {
  abstract getDisplayName(): string;
  abstract getDescription(): string;
  abstract getCategory(): string;
  abstract render(item: WidgetItem, ctx: RenderContext): string | null;
  getDefaultColor() { return "default"; }
  supportsColors() { return true; }
}

export class InputTokensWidget extends BaseWidget {
  getDisplayName() { return "Tokens Input"; }
  getDescription() { return "Total input tokens in the current session"; }
  getCategory() { return "Tokens"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 18200 : ctx.runtime.tokens.input;
    return value !== null ? renderLabel("Input", formatTokenCount(value), item, ctx) : null;
  }
}

export class OutputTokensWidget extends BaseWidget {
  getDisplayName() { return "Tokens Output"; }
  getDescription() { return "Total output tokens in the current session"; }
  getCategory() { return "Tokens"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 2400 : ctx.runtime.tokens.output;
    return value !== null ? renderLabel("Output", formatTokenCount(value), item, ctx) : null;
  }
}

export class TotalTokensWidget extends BaseWidget {
  getDisplayName() { return "Tokens Total"; }
  getDescription() { return "Combined input, output, and cached token counts"; }
  getCategory() { return "Tokens"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 21600 : ctx.runtime.tokens.total;
    return value !== null ? renderLabel("Tokens", formatTokenCount(value), item, ctx) : null;
  }
}

export class InputSpeedWidget extends BaseWidget {
  getDisplayName() { return "Input Speed"; }
  getDescription() { return "Average input token throughput per second"; }
  getCategory() { return "Tokens"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 1200 : ctx.runtime.tokens.inputSpeed;
    return value !== null ? renderLabel("Input/s", formatSpeed(value), item, ctx) : null;
  }
}

export class OutputSpeedWidget extends BaseWidget {
  getDisplayName() { return "Output Speed"; }
  getDescription() { return "Average output token throughput per second"; }
  getCategory() { return "Tokens"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 180 : ctx.runtime.tokens.outputSpeed;
    return value !== null ? renderLabel("Output/s", formatSpeed(value), item, ctx) : null;
  }
}

export class TotalSpeedWidget extends BaseWidget {
  getDisplayName() { return "Total Speed"; }
  getDescription() { return "Average total token throughput per second"; }
  getCategory() { return "Tokens"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 1380 : ctx.runtime.tokens.totalSpeed;
    return value !== null ? renderLabel("Tokens/s", formatSpeed(value), item, ctx) : null;
  }
}

export class ContextPercentageWidget extends BaseWidget {
  getDisplayName() { return "Context %"; }
  getDescription() { return "Context window used percentage"; }
  getCategory() { return "Context"; }
  getVariants() { return ["percent", "bar", "remaining"]; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const variant = getVariant(item, "percent");
    const rawPercent = ctx.isPreview ? 45 : ctx.payload.context_window?.used_percentage ?? null;
    if (rawPercent === null) return null;
    const clampedPercent = Math.max(0, Math.min(100, rawPercent));

    if (variant === "bar") {
      return renderBar(clampedPercent, 8, ctx.displayMode === "minimal" || item.rawValue ? undefined : "Ctx");
    }

    const percent = variant === "remaining" ? 100 - clampedPercent : clampedPercent;
    const label = variant === "remaining" ? "Ctx Left" : "Ctx";
    return renderLabel(label, formatPercent(percent), item, ctx);
  }
}

export class ContextLengthWidget extends BaseWidget {
  getDisplayName() { return "Context Length"; }
  getDescription() { return "Maximum context window size"; }
  getCategory() { return "Context"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 200000 : ctx.payload.context_window?.context_window_size ?? null;
    return value !== null ? renderLabel("Context", formatTokenCount(value), item, ctx) : null;
  }
}

export class UsageReset5hWidget extends BaseWidget {
  getDisplayName() { return "Block Reset Timer"; }
  getDescription() { return "Time until the 5-hour usage window resets"; }
  getCategory() { return "Usage"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 67 * 60 : ctx.runtime.usage.fiveHourResetSeconds;
    return value !== null ? renderLabel("5h Reset", formatDurationCompact(value), item, ctx) : null;
  }
}

export class UsageReset7dWidget extends BaseWidget {
  getDisplayName() { return "Weekly Reset Timer"; }
  getDescription() { return "Time until the 7-day usage window resets"; }
  getCategory() { return "Usage"; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 3 * 24 * 3600 : ctx.runtime.usage.sevenDayResetSeconds;
    return value !== null ? renderLabel("7d Reset", formatDurationCompact(value), item, ctx) : null;
  }
}
