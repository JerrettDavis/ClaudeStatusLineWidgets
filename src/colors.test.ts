import { describe, it, expect } from "vitest";
import { applyColor, getSupportedColors, visibleLength } from "./colors.js";

const ESC = "\x1b[";
const RESET = `${ESC}0m`;

describe("applyColor", () => {
  it("returns text unchanged when color is undefined", () => {
    expect(applyColor("hello", undefined)).toBe("hello");
  });

  it('returns text unchanged when color is "default"', () => {
    expect(applyColor("hello", "default")).toBe("hello");
  });

  it("returns text unchanged for an unrecognised color name", () => {
    expect(applyColor("hello", "rainbow")).toBe("hello");
  });

  it.each([
    ["red", "31"],
    ["green", "32"],
    ["yellow", "33"],
    ["blue", "34"],
    ["magenta", "35"],
    ["cyan", "36"],
    ["white", "37"],
    ["gray", "90"],
    ["redBright", "91"],
    ["greenBright", "92"],
    ["yellowBright", "93"],
    ["blueBright", "94"],
    ["magentaBright", "95"],
    ["cyanBright", "96"],
  ])('wraps text with ANSI code for "%s"', (color, code) => {
    const result = applyColor("text", color);
    expect(result).toBe(`${ESC}${code}mtext${RESET}`);
  });

  it("visible length of colored text equals length of raw text", () => {
    const colored = applyColor("hello", "red");
    expect(visibleLength(colored)).toBe("hello".length);
  });
});

describe("getSupportedColors", () => {
  it("returns a non-empty array", () => {
    const colors = getSupportedColors();
    expect(colors.length).toBeGreaterThan(0);
  });

  it('does not include "default"', () => {
    expect(getSupportedColors()).not.toContain("default");
  });

  it("includes standard named colors", () => {
    const colors = getSupportedColors();
    for (const c of ["red", "green", "yellow", "blue", "magenta", "cyan", "white", "gray"]) {
      expect(colors).toContain(c);
    }
  });

  it("includes bright variants", () => {
    const colors = getSupportedColors();
    for (const c of ["redBright", "greenBright", "yellowBright", "cyanBright"]) {
      expect(colors).toContain(c);
    }
  });
});
