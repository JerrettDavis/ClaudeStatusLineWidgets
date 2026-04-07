import { getWidget } from "./widgets/registry.js";
export function renderStatusLine(settings, context) {
    const lines = [];
    for (const lineItems of settings.lines) {
        // First pass: render all widgets, tracking which are separators
        const rendered = [];
        for (const item of lineItems) {
            const widget = getWidget(item.type);
            if (!widget)
                continue;
            const value = widget.render(item, context);
            rendered.push({ value, isSep: item.type === "separator" });
        }
        // Second pass: collect content, suppress separators adjacent to nulls
        const segments = [];
        for (let i = 0; i < rendered.length; i++) {
            const { value, isSep } = rendered[i];
            if (value === null)
                continue;
            if (isSep) {
                // Only emit separator if there's content before AND after
                const hasBefore = segments.length > 0;
                const hasAfter = rendered.slice(i + 1).some((r) => !r.isSep && r.value !== null);
                if (hasBefore && hasAfter) {
                    segments.push(value);
                }
            }
            else {
                segments.push(value);
            }
        }
        if (segments.length > 0) {
            lines.push(segments.join(""));
        }
    }
    return lines.join("\n");
}
