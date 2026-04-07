export const CURRENT_VERSION = 1;
let _nextId = 1;
function wid(type, extra) {
    return { id: String(_nextId++), type, ...extra };
}
function sep() {
    return wid("separator");
}
export function createDefaultSettings() {
    _nextId = 1;
    return {
        version: CURRENT_VERSION,
        lines: [
            // Line 1: session info
            [wid("path"), sep(), wid("branch"), sep(), wid("model"), sep(), wid("cost"), sep(), wid("context-bar"), sep(), wid("cache-ttl")],
            // Line 2: usage
            [wid("usage-5h"), sep(), wid("usage-7d"), sep(), wid("usage-overage")],
            // Line 3: headroom
            [wid("headroom-tokens"), sep(), wid("headroom-compression"), sep(), wid("headroom-cost"), sep(), wid("headroom-cache-hit")],
        ],
    };
}
export const DEFAULT_SETTINGS = createDefaultSettings();
export function generateId() {
    return Math.random().toString(36).slice(2, 10);
}
export function validateSettings(raw) {
    if (!raw || typeof raw !== "object")
        return createDefaultSettings();
    const obj = raw;
    if (!Array.isArray(obj.lines))
        return createDefaultSettings();
    const lines = [];
    for (const line of obj.lines) {
        if (!Array.isArray(line))
            continue;
        const items = [];
        for (const item of line) {
            if (!item || typeof item !== "object")
                continue;
            const it = item;
            if (typeof it.id !== "string" || typeof it.type !== "string")
                continue;
            items.push({
                id: it.id,
                type: it.type,
                color: typeof it.color === "string" ? it.color : undefined,
                bold: typeof it.bold === "boolean" ? it.bold : undefined,
                rawValue: typeof it.rawValue === "boolean" ? it.rawValue : undefined,
                customText: typeof it.customText === "string" ? it.customText : undefined,
            });
        }
        lines.push(items);
    }
    return {
        version: typeof obj.version === "number" ? obj.version : CURRENT_VERSION,
        lines,
        defaultSeparator: typeof obj.defaultSeparator === "string" ? obj.defaultSeparator : undefined,
    };
}
