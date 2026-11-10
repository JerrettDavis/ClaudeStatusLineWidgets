export const CURRENT_VERSION = 2;

export interface WidgetItemConfig {
  id: string;
  type: string;
  color?: string;
  bold?: boolean;
  variant?: string;
  rawValue?: boolean;
  customText?: string;
  options?: Record<string, string | number | boolean | null>;
}

export type Provider = "claude" | "codex";
export const PROVIDERS: readonly Provider[] = ["claude", "codex"];

/** Layout fields a provider may override; anything unset falls back to the global value. */
export interface ProviderLayout {
  lines?: WidgetItemConfig[][];
  defaultSeparator?: string;
  minimalistMode?: boolean;
}

export interface Settings {
  version: number;
  lines: WidgetItemConfig[][];
  defaultSeparator?: string;
  minimalistMode?: boolean;
  /** Optional per-provider layouts. Absent means the global layout applies to every provider. */
  providers?: Partial<Record<Provider, ProviderLayout>>;
}

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

/** The effective settings for a provider: global layout with that provider's overrides applied. */
export function resolveSettings(settings: Settings, provider: Provider): Settings {
  const override = settings.providers?.[provider];
  if (!override) return settings;
  return {
    ...settings,
    lines: override.lines ?? settings.lines,
    defaultSeparator: override.defaultSeparator ?? settings.defaultSeparator,
    minimalistMode: override.minimalistMode ?? settings.minimalistMode,
  };
}

/** Replace (or, with null, clear) a provider's override. Null/empty removes the `providers` key. */
export function withProviderLayout(
  settings: Settings,
  provider: Provider,
  layout: ProviderLayout | null,
): Settings {
  const providers = { ...settings.providers };
  if (layout) providers[provider] = layout;
  else delete providers[provider];
  const next: Settings = { ...settings, providers };
  if (Object.keys(providers).length === 0) delete next.providers;
  return next;
}

let _nextId = 1;
function wid(type: string, extra?: Partial<WidgetItemConfig>): WidgetItemConfig {
  return { id: String(_nextId++), type, ...extra };
}

function sep(): WidgetItemConfig {
  return wid("separator");
}

export function createDefaultSettings(): Settings {
  _nextId = 1;
  return {
    version: CURRENT_VERSION,
    lines: [
      // Line 1: session info
      [wid("path"), sep(), wid("branch"), sep(), wid("model"), sep(), wid("cost"), sep(), wid("context-bar"), sep(), wid("cache-ttl")],
      // Line 2: usage
      [wid("usage-5h"), sep(), wid("usage-7d"), sep(), wid("usage-overage")],
      // Line 3: headroom
      [wid("headroom-tokens"), sep(), wid("headroom-compression"), sep(), wid("headroom-cost"), sep(), wid("headroom-cache-hit")],
    ],
  };
}

export const DEFAULT_SETTINGS: Settings = createDefaultSettings();

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseLines(rawLines: unknown[]): WidgetItemConfig[][] {
  const lines: WidgetItemConfig[][] = [];
  for (const line of rawLines) {
    if (!Array.isArray(line)) continue;
    const items: WidgetItemConfig[] = [];
    for (const item of line) {
      if (!item || typeof item !== "object") continue;
      const it = item as Record<string, unknown>;
      if (typeof it.id !== "string" || typeof it.type !== "string") continue;
      items.push({
        id: it.id,
        type: it.type,
        color: typeof it.color === "string" ? it.color : undefined,
        bold: typeof it.bold === "boolean" ? it.bold : undefined,
        variant: typeof it.variant === "string" ? it.variant : undefined,
        rawValue: typeof it.rawValue === "boolean" ? it.rawValue : undefined,
        customText: typeof it.customText === "string" ? it.customText : undefined,
        options: isRecord(it.options) ? sanitizeOptions(it.options) : undefined,
      });
    }
    lines.push(items);
  }
  return lines;
}

function parseProviders(raw: unknown): Settings["providers"] {
  if (!isRecord(raw)) return undefined;
  const providers: Partial<Record<Provider, ProviderLayout>> = {};
  for (const provider of PROVIDERS) {
    const entry = raw[provider];
    if (!isRecord(entry)) continue;
    providers[provider] = {
      lines: Array.isArray(entry.lines) ? parseLines(entry.lines) : undefined,
      defaultSeparator: typeof entry.defaultSeparator === "string" ? entry.defaultSeparator : undefined,
      minimalistMode: typeof entry.minimalistMode === "boolean" ? entry.minimalistMode : undefined,
    };
  }
  return Object.keys(providers).length > 0 ? providers : undefined;
}

export function validateSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") return createDefaultSettings();
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.lines)) return createDefaultSettings();

  const settings: Settings = {
    version: typeof obj.version === "number" ? obj.version : CURRENT_VERSION,
    lines: parseLines(obj.lines),
    defaultSeparator: typeof obj.defaultSeparator === "string" ? obj.defaultSeparator : undefined,
    minimalistMode: typeof obj.minimalistMode === "boolean" ? obj.minimalistMode : undefined,
  };
  const providers = parseProviders(obj.providers);
  if (providers) settings.providers = providers;
  return settings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeOptions(
  value: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  const options: Record<string, string | number | boolean | null> = {};
  for (const [key, option] of Object.entries(value)) {
    if (
      option === null ||
      typeof option === "string" ||
      typeof option === "number" ||
      typeof option === "boolean"
    ) {
      options[key] = option;
    }
  }
  return options;
}
