import type { Widget, WidgetCatalogEntry } from "./types.js";
import type { WidgetExtension } from "../extensions/types.js";
export declare function getWidget(type: string): Widget | null;
export declare function getAllWidgetTypes(): string[];
export declare function getWidgetCatalog(): WidgetCatalogEntry[];
export declare function getWidgetCategories(): string[];
/**
 * Registers all widgets contributed by a single extension.
 * Built-in widget types cannot be overridden — duplicate types are silently skipped.
 */
export declare function registerExtension(extension: WidgetExtension): void;
/**
 * Discovers all globally-installed extension packages and registers their
 * widgets into the registry. Should be called once at startup, before any
 * rendering or TUI interaction.
 */
export declare function loadExtensions(): Promise<void>;
