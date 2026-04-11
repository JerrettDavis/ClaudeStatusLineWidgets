/**
 * Extension API for claude-statusline-widgets
 *
 * Extension packages should import from this entry point to get type-safe
 * access to the interfaces they need to implement.
 *
 * @example
 * ```ts
 * import type { Widget, WidgetItem, RenderContext, WidgetExtension } from "claude-statusline-widgets/extension-api";
 * ```
 */
export type { Widget, WidgetItem, RenderContext, StatusLinePayload } from "./widgets/types.js";
export type { WidgetExtension, WidgetRegistration } from "./extensions/types.js";
