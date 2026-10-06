export type { Widget, WidgetItem, WidgetCatalogEntry, RenderContext, StatusLinePayload } from "./types.js";
export { getWidget, getAllWidgetTypes, getWidgetCatalog, getWidgetCategories, registerExtension } from "./registry.js";
export { loadExtensions } from "../extensions/register-cli.js";
export type { WidgetExtension, WidgetRegistration } from "../extensions/types.js";
