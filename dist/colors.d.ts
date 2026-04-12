/** Apply a named color to text using ANSI escape codes. */
export declare function applyColor(text: string, color: string | undefined): string;
/** Return the set of supported named colors (excluding "default"). */
export declare function getSupportedColors(): string[];
/** Return the visible character width of a string (strips ANSI escapes). */
export declare function visibleLength(text: string): number;
export declare function green(text: string): string;
export declare function yellow(text: string): string;
export declare function red(text: string): string;
export declare function cyan(text: string): string;
export declare function dim(text: string): string;
export declare function bold(text: string): string;
