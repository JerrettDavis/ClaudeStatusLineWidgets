const ESC = "\x1b[";
const RESET = `${ESC}0m`;

const COLOR_CODE_MAP: Record<string, string> = {
  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  magenta: "35",
  cyan: "36",
  white: "37",
  gray: "90",
  redBright: "91",
  greenBright: "92",
  yellowBright: "93",
  blueBright: "94",
  magentaBright: "95",
  cyanBright: "96",
};

/** Apply a named color to text using ANSI escape codes. */
export function applyColor(text: string, color: string | undefined): string {
  if (!color || color === "default") return text;
  const code = COLOR_CODE_MAP[color];
  if (!code) return text;
  return `${ESC}${code}m${text}${RESET}`;
}

/** Return the set of supported named colors (excluding "default"). */
export function getSupportedColors(): string[] {
  return Object.keys(COLOR_CODE_MAP);
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;

/** Return the visible character width of a string (strips ANSI escapes). */
export function visibleLength(text: string): number {
  return text.replace(ANSI_RE, "").length;
}

export function green(text: string): string {
  return `${ESC}32m${text}${RESET}`;
}

export function yellow(text: string): string {
  return `${ESC}33m${text}${RESET}`;
}

export function red(text: string): string {
  return `${ESC}31m${text}${RESET}`;
}

export function cyan(text: string): string {
  return `${ESC}36m${text}${RESET}`;
}

export function dim(text: string): string {
  return `${ESC}2m${text}${RESET}`;
}

export function bold(text: string): string {
  return `${ESC}1m${text}${RESET}`;
}

const OSC8_START = "\x1b]8;;";
const OSC8_END = "\x1b]8;;\x07";

/** Wrap text as a clickable OSC-8 hyperlink with the given URL. */
export function hyperlink(text: string, url: string): string {
  return `${OSC8_START}${url}${OSC8_END}${text}${OSC8_START}${OSC8_END}`;
}

/**
 * Apply the token style to its text using ANSI escape codes.
 * Returns plain text when the style is undefined or default.
 */
function applyStyle(text: string, style: { color?: string; dim?: boolean; bold?: boolean }): string {
  let out = text;
  if (style.color && style.color !== "default") {
    const code = COLOR_CODE_MAP[style.color];
    if (code) out = `${ESC}${code}m${out}${RESET}`;
  }
  if (style.dim) out = `${ESC}2m${out}${RESET}`;
  if (style.bold) out = `${ESC}1m${out}${RESET}`;
  return out;
}

import type { StyledToken, TokenStyle } from "./widgets/types.js";

/**
 * Convert a StyledToken[] to an ANSI-escaped string. The single renderer
 * for any consumer (CLI TUI, legacy statusLine command, pipe mode) — the
 * mod path does not call this; it walks tokens directly into Box/Text/Link.
 */
export function tokensToAnsi(tokens: StyledToken[]): string {
  let out = "";
  for (const tok of tokens) {
    const style = tok.style as TokenStyle | undefined;
    if (style && "type" in style && style.type === "link") {
      out += hyperlink(tok.text, style.url);
    } else if (style) {
      out += applyStyle(tok.text, style as { color?: string; dim?: boolean; bold?: boolean });
    } else {
      out += tok.text;
    }
  }
  return out;
}
