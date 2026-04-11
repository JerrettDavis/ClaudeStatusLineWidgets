export type { Widget, WidgetItem, WidgetCatalogEntry, RenderContext, StatusLinePayload } from "./types.js";
export { getWidget, getAllWidgetTypes, getWidgetCatalog, getWidgetCategories, registerExtension, loadExtensions } from "./registry.js";
export type { WidgetExtension, WidgetRegistration } from "../extensions/types.js";
