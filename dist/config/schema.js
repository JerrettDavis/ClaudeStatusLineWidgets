import { createRequire } from "module";
const require = createRequire(import.meta.url);

// src/config/schema.ts
var CURRENT_VERSION = 2;
var _nextId = 1;
function wid(type, extra) {
  return { id: String(_nextId++), type, ...extra };
}
function sep() {
  return wid("separator");
}
function createDefaultSettings() {
  _nextId = 1;
  return {
    version: CURRENT_VERSION,
    lines: [
      // Line 1: session info
      [wid("path"), sep(), wid("branch"), sep(), wid("model"), sep(), wid("cost"), sep(), wid("context-bar"), sep(), wid("cache-ttl")],
      // Line 2: usage
      [wid("usage-5h"), sep(), wid("usage-7d"), sep(), wid("usage-overage")],
      // Line 3: headroom
      [wid("headroom-tokens"), sep(), wid("headroom-compression"), sep(), wid("headroom-cost"), sep(), wid("headroom-cache-hit")]
    ]
  };
}
var DEFAULT_SETTINGS = createDefaultSettings();
function generateId() {
  return Math.random().toString(36).slice(2, 10);
}
function validateSettings(raw) {
  if (!raw || typeof raw !== "object") return createDefaultSettings();
  const obj = raw;
  if (!Array.isArray(obj.lines)) return createDefaultSettings();
  const lines = [];
  for (const line of obj.lines) {
    if (!Array.isArray(line)) continue;
    const items = [];
    for (const item of line) {
      if (!item || typeof item !== "object") continue;
      const it = item;
      if (typeof it.id !== "string" || typeof it.type !== "string") continue;
      items.push({
        id: it.id,
        type: it.type,
        color: typeof it.color === "string" ? it.color : void 0,
        bold: typeof it.bold === "boolean" ? it.bold : void 0,
        variant: typeof it.variant === "string" ? it.variant : void 0,
        rawValue: typeof it.rawValue === "boolean" ? it.rawValue : void 0,
        customText: typeof it.customText === "string" ? it.customText : void 0,
        options: isRecord(it.options) ? sanitizeOptions(it.options) : void 0
      });
    }
    lines.push(items);
  }
  return {
    version: typeof obj.version === "number" ? obj.version : CURRENT_VERSION,
    lines,
    defaultSeparator: typeof obj.defaultSeparator === "string" ? obj.defaultSeparator : void 0,
    minimalistMode: typeof obj.minimalistMode === "boolean" ? obj.minimalistMode : void 0
  };
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function sanitizeOptions(value) {
  const options = {};
  for (const [key, option] of Object.entries(value)) {
    if (option === null || typeof option === "string" || typeof option === "number" || typeof option === "boolean") {
      options[key] = option;
    }
  }
  return options;
}
export {
  CURRENT_VERSION,
  DEFAULT_SETTINGS,
  createDefaultSettings,
  generateId,
  validateSettings
};
