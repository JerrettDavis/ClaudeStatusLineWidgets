import type { Widget } from "../widgets/types.js";

/**
 * A single widget entry that an extension contributes to the registry.
 */
export interface WidgetRegistration {
  /** Unique type identifier (e.g. "my-org.git-status"). Must not clash with built-in types. */
  type: string;
  /** Factory function that creates a new instance of the widget. */
  create: () => Widget;
}

/**
 * The shape that an extension package must export as `extension` (named export)
 * or as the default export so that the discovery loader can register its widgets.
 *
 * @example
 * ```ts
 * // my-statusline-widget/src/index.ts
 * import type { WidgetExtension } from "claude-statusline-widgets/extension-api";
 * import { MyCustomWidget } from "./MyCustomWidget.js";
 *
 * const extension: WidgetExtension = {
 *   widgets: [
 *     { type: "my-org.custom", create: () => new MyCustomWidget() },
 *   ],
 * };
 *
 * export { extension };
 * export default extension;
 * ```
 */
export interface WidgetExtension {
  widgets: WidgetRegistration[];
}
