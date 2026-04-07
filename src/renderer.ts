import type { Settings } from "./config/schema.js";
import type { RenderContext } from "./widgets/types.js";
import { getWidget } from "./widgets/registry.js";

export function renderStatusLine(settings: Settings, context: RenderContext): string {
  const lines: string[] = [];

  for (const lineItems of settings.lines) {
    // First pass: render all widgets, tracking which are separators
    const rendered: { value: string | null; isSep: boolean }[] = [];
    for (const item of lineItems) {
      const widget = getWidget(item.type);
      if (!widget) continue;
      const value = widget.render(item, context);
      rendered.push({ value, isSep: item.type === "separator" });
    }

    // Second pass: collect content, suppress separators adjacent to nulls
    const segments: string[] = [];
    for (let i = 0; i < rendered.length; i++) {
      const { value, isSep } = rendered[i];
      if (value === null) continue;

      if (isSep) {
        // Only emit separator if there's content before AND after
        const hasBefore = segments.length > 0;
        const hasAfter = rendered.slice(i + 1).some((r) => !r.isSep && r.value !== null);
        if (hasBefore && hasAfter) {
          segments.push(value);
        }
      } else {
        segments.push(value);
      }
    }

    if (segments.length > 0) {
      lines.push(segments.join(""));
    }
  }

  return lines.join("\n");
}
