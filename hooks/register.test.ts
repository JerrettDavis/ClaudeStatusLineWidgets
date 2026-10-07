import { describe, expect, it } from "vitest";
import { modelDisplayName } from "./register";

describe("modelDisplayName", () => {
  it("rebuilds display names from current ids", () => {
    expect(modelDisplayName("claude-sonnet-5-5")).toBe("Sonnet 5.5");
    expect(modelDisplayName("claude-opus-5-5")).toBe("Opus 5.5");
    expect(modelDisplayName("claude-haiku-4-5-20251001")).toBe("Haiku 4.5");
    expect(modelDisplayName("claude-fable-5-1")).toBe("Fable 5.1");
  });
  it("passes unknown ids through", () => {
    expect(modelDisplayName("gpt-x")).toBe("gpt-x");
  });
});

import { parseAnsiLine } from "./register";

describe("parseAnsiLine", () => {
  it("turns SGR colours into spans and never leaves escapes behind", () => {
    const spans = parseAnsiLine("a\x1b[2m | \x1b[0m\x1b[32m██\x1b[0m 12%");
    expect(spans.map((s) => s.text).join("")).toBe("a | ██ 12%");
    expect(spans[1]).toMatchObject({ dim: true });
    expect(spans[2]).toMatchObject({ color: "green", text: "██" });
    expect(spans[3].color).toBeUndefined();
  });
  it("drops unknown control sequences", () => {
    expect(parseAnsiLine("x\x07y")[0].text).toBe("xy");
  });
});
