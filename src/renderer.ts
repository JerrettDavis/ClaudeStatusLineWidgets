import type { Settings } from "./config/schema.js";
import type { RenderContext, StyledToken } from "./widgets/types.js";
import { getWidget, renderTokensFor } from "./widgets/registry.js";
import { tokensToAnsi } from "./colors.js";

/**
 * Override the color of every token in `tokens` to the user's chosen color.
 * Returns the same tokens with their style merged (the user's color wins
 * over each token's own, but dim/bold are preserved).
 */
function withOverride(
  tokens: StyledToken[] | null,
  color: string,
): StyledToken[] | null {
  if (tokens === null) return null;
  return tokens.map((t) => {
    if (t.style && "type" in t.style && t.style.type === "link") return t;
    const cur = (t.style ?? {}) as { color?: string; dim?: boolean; bold?: boolean };
    return { text: t.text, style: { ...cur, color } };
  });
}

export function renderStatusLine(settings: Settings, context: RenderContext): string {
  const lines: string[] = [];

  for (const lineItems of settings.lines) {
    // First pass: render all widgets, tracking which are separators
    const rendered: { value: StyledToken[] | null; isSep: boolean }[] = [];
    for (const item of lineItems) {
      const widget = getWidget(item.type);
      if (!widget) continue;
      const tokens = renderTokensFor(widget, item, context);
      const value =
        tokens !== null && item.color && item.color !== "default"
          ? withOverride(tokens, item.color)
          : tokens;
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
          segments.push(value.map((t) => t.text).join(""));
          lastWasSep = true;
        }
      } else {
        segments.push(tokensToAnsi(value));
        lastWasSep = false;
      }
    }

    if (segments.length > 0) {
      lines.push(segments.join(""));
    }
  }

  return lines.join("\n");
}