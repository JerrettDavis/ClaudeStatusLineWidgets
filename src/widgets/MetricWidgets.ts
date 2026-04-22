import type { Widget, WidgetItem, RenderContext } from "./types.js";
import { DATA_KEY } from "./data-keys.js";
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
  getDataKey() { return DATA_KEY.TOKEN_COUNTS; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 18200 : ctx.runtime.tokens.input;
    return value !== null ? renderLabel("Input", formatTokenCount(value), item, ctx) : null;
  }
}

export class OutputTokensWidget extends BaseWidget {
  getDisplayName() { return "Tokens Output"; }
  getDescription() { return "Total output tokens in the current session"; }
  getCategory() { return "Tokens"; }
  getDataKey() { return DATA_KEY.TOKEN_COUNTS; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 2400 : ctx.runtime.tokens.output;
    return value !== null ? renderLabel("Output", formatTokenCount(value), item, ctx) : null;
  }
}

export class TotalTokensWidget extends BaseWidget {
  getDisplayName() { return "Tokens Total"; }
  getDescription() { return "Combined input, output, and cached token counts"; }
  getCategory() { return "Tokens"; }
  getDataKey() { return DATA_KEY.TOKEN_COUNTS; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 21600 : ctx.runtime.tokens.total;
    return value !== null ? renderLabel("Tokens", formatTokenCount(value), item, ctx) : null;
  }
}

export class InputSpeedWidget extends BaseWidget {
  getDisplayName() { return "Input Speed"; }
  getDescription() { return "Average input token throughput per second"; }
  getCategory() { return "Tokens"; }
  getDataKey() { return DATA_KEY.TOKEN_SPEED; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 1200 : ctx.runtime.tokens.inputSpeed;
    return value !== null ? renderLabel("Input/s", formatSpeed(value), item, ctx) : null;
  }
}

export class OutputSpeedWidget extends BaseWidget {
  getDisplayName() { return "Output Speed"; }
  getDescription() { return "Average output token throughput per second"; }
  getCategory() { return "Tokens"; }
  getDataKey() { return DATA_KEY.TOKEN_SPEED; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 180 : ctx.runtime.tokens.outputSpeed;
    return value !== null ? renderLabel("Output/s", formatSpeed(value), item, ctx) : null;
  }
}

export class TotalSpeedWidget extends BaseWidget {
  getDisplayName() { return "Total Speed"; }
  getDescription() { return "Average total token throughput per second"; }
  getCategory() { return "Tokens"; }
  getDataKey() { return DATA_KEY.TOKEN_SPEED; }
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
  getDataKey() { return DATA_KEY.CONTEXT_USAGE; }
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
  getDataKey() { return DATA_KEY.CONTEXT_SIZE; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 200000 : ctx.payload.context_window?.context_window_size ?? null;
    return value !== null ? renderLabel("Context", formatTokenCount(value), item, ctx) : null;
  }
}

export class UsageReset5hWidget extends BaseWidget {
  getDisplayName() { return "Block Reset Timer"; }
  getDescription() { return "Time until the 5-hour usage window resets"; }
  getCategory() { return "Usage"; }
  getDataKey() { return DATA_KEY.USAGE_5H; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 67 * 60 : ctx.runtime.usage.fiveHourResetSeconds;
    return value !== null ? renderLabel("5h Reset", formatDurationCompact(value), item, ctx) : null;
  }
}

export class UsageReset7dWidget extends BaseWidget {
  getDisplayName() { return "Weekly Reset Timer"; }
  getDescription() { return "Time until the 7-day usage window resets"; }
  getCategory() { return "Usage"; }
  getDataKey() { return DATA_KEY.USAGE_7D; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const value = ctx.isPreview ? 3 * 24 * 3600 : ctx.runtime.usage.sevenDayResetSeconds;
    return value !== null ? renderLabel("7d Reset", formatDurationCompact(value), item, ctx) : null;
  }
}

export class ReplayCostWidget extends BaseWidget {
  getDisplayName() { return "Replay Cost"; }
  getDescription() { return "Tokens that will be re-sent on the next turn (cache_read + input)"; }
  getCategory() { return "Cache"; }
  getDataKey() { return DATA_KEY.CACHE_HEALTH; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const current = ctx.payload.context_window?.current_usage;
    if (!current) return null;

    const cacheRead = current.cache_read_input_tokens ?? 0;
    const input = current.input_tokens ?? 0;
    const replayCost = ctx.isPreview ? 142000 : cacheRead + input;

    if (replayCost === 0) return null;

    // Color code: green (<200K), yellow (200-499K), red (500K+)
    let coloredValue: string;
    const compact = formatTokenCount(replayCost);
    if (replayCost < 200000) {
      coloredValue = compact;
    } else if (replayCost < 500000) {
      coloredValue = `${compact} ⚠`;
    } else {
      coloredValue = `${compact} ⚠`;
    }

    return renderLabel("R", coloredValue, item, ctx);
  }
}

export class RunwayWidget extends BaseWidget {
  getDisplayName() { return "Usage Runway"; }
  getDescription() { return "Estimated remaining active hours at current burn rate (7-day window)"; }
  getCategory() { return "Usage"; }
  getDataKey() { return DATA_KEY.USAGE_RUNWAY; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const sevenDayResetSeconds = ctx.runtime.usage.sevenDayResetSeconds;
    const elapsedSeconds = ctx.runtime.session.elapsedSeconds;

    if (sevenDayResetSeconds === null || elapsedSeconds === null || elapsedSeconds === 0) {
      return null;
    }

    // Estimate utilization from remaining reset seconds
    // If sevenDayResetSeconds is available, total 7-day window is 7*24*3600 = 604800 seconds
    const totalWindow = 7 * 24 * 3600;
    const utilizationPercent = ((totalWindow - sevenDayResetSeconds) / totalWindow) * 100;

    if (ctx.isPreview) {
      return renderLabel("Runway", "12h", item, ctx);
    }

    if (utilizationPercent === 0) return null;

    // Burn rate = utilization% / elapsed_hours
    const elapsedHours = elapsedSeconds / 3600;
    const burnRate = utilizationPercent / elapsedHours;

    // Remaining hours = (100 - utilization%) / burn_rate
    const remaining = burnRate > 0 ? (100 - utilizationPercent) / burnRate : Infinity;

    if (!Number.isFinite(remaining) || remaining < 0) return null;

    // Format: "Runway: 12h" or "Runway: 2.5h ⚠"
    let formatted: string;
    if (remaining >= 10) {
      formatted = `${Math.round(remaining)}h`;
    } else if (remaining >= 3) {
      formatted = `${remaining.toFixed(1)}h ⚠`;
    } else {
      formatted = `${remaining.toFixed(1)}h ⚠`;
    }

    return renderLabel("Runway", formatted, item, ctx);
  }
}

export class LargeCacheWarningWidget extends BaseWidget {
  getDisplayName() { return "Large Cache Warning"; }
  getDescription() { return "Warning indicator when cached tool results exceed threshold"; }
  getCategory() { return "Cache"; }
  getDataKey() { return DATA_KEY.CACHE_HEALTH; }
  render(item: WidgetItem, ctx: RenderContext): string | null {
    const threshold = ctx.isPreview ? 1000000 : 2000000; // 2M tokens threshold
    const lastBreakTokens = ctx.cacheStats.lastBreakTokens;

    if (ctx.isPreview) {
      return "⚠ large cache";
    }

    if (lastBreakTokens > threshold) {
      return "⚠ large cache";
    }

    return null;
  }
}
