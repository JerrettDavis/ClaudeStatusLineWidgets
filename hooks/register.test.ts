import { describe, expect, it } from "vitest";
import { modelDisplayName } from "./register.js";

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
