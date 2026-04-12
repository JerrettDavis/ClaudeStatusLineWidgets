export declare const CURRENT_VERSION = 2;
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
export interface Settings {
    version: number;
    lines: WidgetItemConfig[][];
    defaultSeparator?: string;
    minimalistMode?: boolean;
}
export declare function createDefaultSettings(): Settings;
export declare const DEFAULT_SETTINGS: Settings;
export declare function generateId(): string;
export declare function validateSettings(raw: unknown): Settings;
