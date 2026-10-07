import type { CacheTTLResult, CacheSessionStats } from "../cache-core.js";
import type { UsageData } from "../usage-core.js";
import type { HeadroomStats } from "../headroom-core.js";
import type { RuntimeData } from "../runtime-core.js";

export interface StatusLinePayload {
  cwd?: string;
  session_id?: string;
  version?: string;
  mode?: string;
  effort?: string | number;
  thinking?: string | number | boolean;
  output_style?: string | {
    name?: string;
  };
  vim?: string | boolean | {
    mode?: string;
  };
  skills?: string[] | {
    active?: string[];
  };
  workspace?: {
    current_dir?: string;
    project_dir?: string;
  };
  model?: {
    id?: string;
    display_name?: string;
  };
  cost?: {
    total_cost_usd?: number;
  };
  context_window?: {
    used_percentage?: number | null;
    context_window_size?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    cache_read_input_tokens?: number;
    current_usage?: {
      cache_read_input_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
      total_input_tokens?: number;
      total_output_tokens?: number;
    };
  };
  transcript_path?: string;
  git_branch?: string;
}

export interface RenderContext {
  payload: StatusLinePayload;
  cacheTTL: CacheTTLResult;
  cacheStats: CacheSessionStats;
  usageData: UsageData | null;
  headroomStats: HeadroomStats | null;
  runtime: RuntimeData;
  displayMode?: "normal" | "minimal";
  isPreview?: boolean;
}

export interface WidgetItem {
  id: string;
  type: string;
  color?: string;
  bold?: boolean;
  variant?: string;
  rawValue?: boolean;
  customText?: string;
  options?: Record<string, string | number | boolean | null>;
}

export interface WidgetCatalogEntry {
  type: string;
  displayName: string;
  description: string;
  category: string;
  variants?: string[];
  dataKey?: string;
}

/**
 * One styled span produced by a formatter. Both the legacy ANSI path and
 * the mod's native `<Text>`/`<Link>` path consume the same token list —
 * the data layer's output is identical; only the renderer differs.
 */
export type TokenStyle =
  | { color?: string; dim?: boolean; bold?: boolean }
  | { type: "link"; url: string };

export interface StyledToken {
  text: string;
  style?: TokenStyle;
}

export interface Widget {
  getDisplayName(): string;
  getDescription(): string;
  getCategory(): string;
  getDefaultColor(): string;
  /**
   * Legacy ANSI renderer path. Kept for the CLI and any consumer that
   * wants raw text. The mod path does not call this directly — it asks
   * for tokens via `renderTokens` and renders them as native elements.
   */
  render(item: WidgetItem, context: RenderContext): string | null;
  /**
   * Token renderer used by the mod (and by the legacy renderer, which
   * converts tokens back to ANSI). Optional: defaults to splitting `render`'s
   * ANSI output into tokens (SGR only; OSC-8 hyperlinks pass through as text).
   * Widgets that can emit tokens natively should override for fidelity.
   */
  renderTokens?(item: WidgetItem, context: RenderContext): StyledToken[] | null;
  supportsColors(): boolean;
  getVariants?(): string[];
  getDataKey?(): string;
}