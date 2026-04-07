import type { CacheTTLResult } from "../cache.js";
import type { UsageData } from "../usage.js";
import type { HeadroomStats } from "../headroom.js";

export interface StatusLinePayload {
  cwd?: string;
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
    current_usage?: {
      cache_read_input_tokens?: number;
    };
  };
  transcript_path?: string;
  git_branch?: string;
}

export interface RenderContext {
  payload: StatusLinePayload;
  cacheTTL: CacheTTLResult;
  usageData: UsageData | null;
  headroomStats: HeadroomStats | null;
  isPreview?: boolean;
}

export interface WidgetItem {
  id: string;
  type: string;
  color?: string;
  bold?: boolean;
  rawValue?: boolean;
  customText?: string;
}

export interface WidgetCatalogEntry {
  type: string;
  displayName: string;
  description: string;
  category: string;
}

export interface Widget {
  getDisplayName(): string;
  getDescription(): string;
  getCategory(): string;
  getDefaultColor(): string;
  render(item: WidgetItem, context: RenderContext): string | null;
  supportsColors(): boolean;
}
