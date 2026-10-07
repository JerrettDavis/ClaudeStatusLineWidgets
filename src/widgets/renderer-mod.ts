/**
 * Mod renderer: convert `Settings` + `RenderContext` to a native React
 * tree of `Box` / `Text` / `Link` elements.
 *
 * The engine provides element constructors via `$.ui.resolve(e)`. We
 * accept those as a structural `ModSurfaceElements` object so this
 * module does not need to import from `claude-code` directly.
 */
import type { Settings } from "../config/schema.js";
import type { RenderContext, StyledToken } from "./types.js";
import { getWidget, renderTokensFor } from "./registry.js";

/** Native element constructors as the engine hands them via `$.ui.resolve(e)`. */
export interface ModSurfaceElements {
  Box: (...args: unknown[]) => unknown;
  Text: (...args: unknown[]) => unknown;
  Link: (...args: unknown[]) => unknown;
}

/** Apply the user's color override to a token list. */
function withColorOverride(
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

function tokenToElement(
  tok: StyledToken,
  E: ModSurfaceElements,
  key: string,
): unknown {
  const style = tok.style;
  if (style && "type" in style && style.type === "link") {
    return E.Link({ key, href: style.url, children: tok.text });
  }
  const s = style as { color?: string; dim?: boolean; bold?: boolean } | undefined;
  return E.Text({
    key,
    color: s?.color,
    dimColor: s?.dim,
    bold: s?.bold,
    children: tok.text,
  });
}

/**
 * Render the configured statusline as a React tree. Returns `undefined`
 * when there is nothing to display — the band vanishes (mod-builder:
 * "appear only when there is something to say").
 */
export function renderStatusLineElement(
  settings: Settings,
  ctx: RenderContext,
  E: ModSurfaceElements,
): unknown {
  const lineRows: unknown[] = [];
  for (let lineIdx = 0; lineIdx < settings.lines.length; lineIdx++) {
    const lineItems = settings.lines[lineIdx];
    if (!lineItems) continue;
    const rendered: { tokens: StyledToken[] | null; isSep: boolean }[] = [];
    for (const item of lineItems) {
      const widget = getWidget(item.type);
      if (!widget) continue;
      const raw = renderTokensFor(widget, item, ctx);
      const tokens =
        raw !== null && item.color && item.color !== "default"
          ? withColorOverride(raw, item.color)
          : raw;
      rendered.push({ tokens, isSep: item.type === "separator" });
    }

    const segments: unknown[] = [];
    let lastWasSep = false;
    for (let i = 0; i < rendered.length; i++) {
      const { tokens, isSep } = rendered[i];
      if (tokens === null) continue;
      if (isSep) {
        if (lastWasSep) continue;
        const hasAfter = rendered
          .slice(i + 1)
          .some((r) => !r.isSep && r.tokens !== null);
        if (segments.length > 0 && hasAfter) {
          segments.push(
            E.Text({ key: `sep-${lineIdx}-${i}`, dimColor: true, children: " | " }),
          );
          lastWasSep = true;
        }
      } else {
        tokens.forEach((tok, j) =>
          segments.push(tokenToElement(tok, E, `tok-${lineIdx}-${i}-${j}`)),
        );
        lastWasSep = false;
      }
    }

    if (segments.length > 0) {
      lineRows.push(
        E.Box({
          key: `line-${lineIdx}`,
          flexDirection: "row",
          gap: 2,
          alignItems: "center",
          children: segments,
        }),
      );
    }
  }

  if (lineRows.length === 0) return undefined;
  return E.Box({
    key: "statusline",
    flexDirection: "column",
    paddingRight: 4, // engine reserves 5 cols for `[-]` chrome
    children: lineRows,
  });
}