import type { CacheTTLResult, CacheSessionStats } from "../cache.js";
import type { UsageData } from "../usage.js";
import type { HeadroomStats } from "../headroom.js";
import type { RuntimeData } from "../runtime.js";

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

export interface Widget {
  getDisplayName(): string;
  getDescription(): string;
  getCategory(): string;
  getDefaultColor(): string;
  render(item: WidgetItem, context: RenderContext): string | null;
  supportsColors(): boolean;
  getVariants?(): string[];
  getDataKey?(): string;
}
