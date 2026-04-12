import type { Settings } from "./schema.js";
export declare function setConfigPath(path: string): void;
export declare function getConfigPath(): string;
export declare function loadSettings(): Settings;
export declare function saveSettings(settings: Settings): void;
