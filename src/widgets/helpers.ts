import { green, red, yellow } from "../colors.js";
import { compactTokens } from "../segments.js";
import type { RenderContext, WidgetItem } from "./types.js";

export function getVariant(item: WidgetItem, fallback: string): string {
  return item.variant ?? fallback;
}

export function getOptionString(item: WidgetItem, key: string, fallback = ""): string {
  const value = item.options?.[key];
  return typeof value === "string" ? value : fallback;
}

export function getOptionNumber(item: WidgetItem, key: string, fallback: number): number {
  const value = item.options?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getOptionBoolean(item: WidgetItem, key: string, fallback = false): boolean {
  const value = item.options?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export function renderLabel(label: string, value: string, item: WidgetItem, ctx: RenderContext): string {
  if (ctx.displayMode === "minimal" || item.rawValue) {
    return value;
  }
  return `${label}: ${value}`;
}

export function formatDurationCompact(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function formatTokenCount(value: number): string {
  return compactTokens(value);
}

export function formatSpeed(value: number): string {
  return `${compactTokens(Math.round(value))}/s`;
}

export function renderBadge(text: string): string {
  return `[${text}]`;
}

export function renderBar(
  percent: number,
  width: number,
  label?: string
): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);
  const bar = `${"█".repeat(filled)}${"░".repeat(empty)}`;
  const color = clamped > 80 ? red : clamped > 60 ? yellow : green;
  const prefix = label ? `${label} ` : "";
  return `${prefix}${color(bar)} ${formatPercent(clamped)}`;
}
