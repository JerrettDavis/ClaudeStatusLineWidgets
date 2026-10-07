import { describe, expect, it } from "vitest";
import { shouldStripStatusLine } from "./self-clean.js";

describe("shouldStripStatusLine", () => {
  it("never strips in hook mode while the plugin is enabled (hook mode owns the entry)", () => {
    expect(shouldStripStatusLine("hook", true)).toBe(false);
  });

  it("strips in hook mode when the plugin is disabled (hooks can't fire)", () => {
    expect(shouldStripStatusLine("hook", false)).toBe(true);
  });

  it("strips in mod mode whether the plugin is enabled or disabled", () => {
    expect(shouldStripStatusLine("mod", true)).toBe(true);
    expect(shouldStripStatusLine("mod", false)).toBe(true);
  });

  it("leaves settings alone when the plugin state is not configured", () => {
    expect(shouldStripStatusLine("hook", undefined)).toBe(false);
    expect(shouldStripStatusLine("mod", undefined)).toBe(false);
  });
});
