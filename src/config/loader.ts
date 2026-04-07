import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { createDefaultSettings, validateSettings, CURRENT_VERSION } from "./schema.js";
import type { Settings } from "./schema.js";

const CONFIG_DIR = join(homedir(), ".config", "claude-statusline-widgets");
const CONFIG_FILE = join(CONFIG_DIR, "settings.json");

let customConfigPath: string | null = null;

export function setConfigPath(path: string): void {
  customConfigPath = path;
}

export function getConfigPath(): string {
  return customConfigPath ?? CONFIG_FILE;
}

export function loadSettings(): Settings {
  const configPath = getConfigPath();
  try {
    if (!existsSync(configPath)) return createDefaultSettings();
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);

    // Version migration placeholder
    if (typeof parsed.version === "number" && parsed.version < CURRENT_VERSION) {
      const migrated = migrateSettings(parsed);
      saveSettings(migrated);
      return migrated;
    }

    return validateSettings(parsed);
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings: Settings): void {
  const configPath = getConfigPath();
  const dir = dirname(configPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(settings, null, 2), "utf-8");
}

function migrateSettings(raw: Record<string, unknown>): Settings {
  // No migrations yet (v1 is first version)
  // Future: add migration functions here
  return validateSettings({ ...raw, version: CURRENT_VERSION });
}
