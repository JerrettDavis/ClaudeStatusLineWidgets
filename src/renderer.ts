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

    // Second pass: collect content, suppress separators adjacent to nulls.
    // Track whether the last emitted segment was a separator so we never
    // emit two separators in a row (happens when a widget between them is null).
    const segments: string[] = [];
    let lastWasSep = false;
    for (let i = 0; i < rendered.length; i++) {
      const { value, isSep } = rendered[i];
      if (value === null) continue;

      if (isSep) {
        // Skip if last emission was already a separator (widget between them was null)
        if (lastWasSep) continue;
        // Only emit if there is non-null, non-separator content after this point
        const hasAfter = rendered.slice(i + 1).some((r) => !r.isSep && r.value !== null);
        if (segments.length > 0 && hasAfter) {
          segments.push(value);
          lastWasSep = true;
        }
      } else {
        segments.push(value);
        lastWasSep = false;
      }
    }

    if (segments.length > 0) {
      lines.push(segments.join(""));
    }
  }

  return lines.join("\n");
}
