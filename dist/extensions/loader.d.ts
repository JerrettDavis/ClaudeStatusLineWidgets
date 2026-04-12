import type { WidgetExtension } from "./types.js";
/**
 * The keyword that extension packages must declare in their `package.json`
 * `keywords` array so that the loader can discover them.
 */
export declare const EXTENSION_KEYWORD = "claude-statusline-widget";
/**
 * Discovers and loads all extension packages installed globally.
 *
 * Extension packages must:
 * 1. Be installed in the npm global `node_modules`.
 * 2. Include `"claude-statusline-widget"` in their `package.json` `keywords`.
 * 3. Export a `WidgetExtension` as `export { extension }` or `export default`.
 */
export declare function discoverExtensions(): Promise<WidgetExtension[]>;
