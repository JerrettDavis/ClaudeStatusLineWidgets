const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const COLOR_CODE_MAP = {
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
export function applyColor(text, color) {
    if (!color || color === "default")
        return text;
    const code = COLOR_CODE_MAP[color];
    if (!code)
        return text;
    return `${ESC}${code}m${text}${RESET}`;
}
/** Return the set of supported named colors (excluding "default"). */
export function getSupportedColors() {
    return Object.keys(COLOR_CODE_MAP);
}
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
/** Return the visible character width of a string (strips ANSI escapes). */
export function visibleLength(text) {
    return text.replace(ANSI_RE, "").length;
}
export function green(text) {
    return `${ESC}32m${text}${RESET}`;
}
export function yellow(text) {
    return `${ESC}33m${text}${RESET}`;
}
export function red(text) {
    return `${ESC}31m${text}${RESET}`;
}
export function cyan(text) {
    return `${ESC}36m${text}${RESET}`;
}
export function dim(text) {
    return `${ESC}2m${text}${RESET}`;
}
export function bold(text) {
    return `${ESC}1m${text}${RESET}`;
}
