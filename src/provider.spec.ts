import { describe, it, expect } from "vitest";
import { detectProvider, normalizeCodexPayload } from "./provider.js";
import { createDefaultSettings, resolveSettings, validateSettings, withProviderLayout } from "./config/schema.js";

const codexPayload = {
  schema_version: 1,
  cwd: "/repo",
  model: { id: "gpt-5.6", display_name: "GPT-5.6 Sol" },
  effort: { level: "high" },
  context_window: { used_percentage: 31, total_input_tokens: 1000, total_output_tokens: 200 },
  cost: { estimated_thread_cost_usd_micros: 2_500_000 },
  rate_limits: {
    codex: {
      primary: { used_percentage: 42, window_minutes: 300, resets_at: 1893456000 },
      secondary: { used_percentage: 18, window_minutes: 10080 },
    },
  },
};

describe("detectProvider", () => {
  it("prefers the --provider flag, then env, then payload shape", () => {
    expect(detectProvider({}, ["--provider", "codex"], {})).toBe("codex");
    expect(detectProvider(codexPayload, ["--provider=claude"], {})).toBe("claude");
    expect(detectProvider({}, [], { CCFOOTER_PROVIDER: "codex" })).toBe("codex");
    expect(detectProvider(codexPayload, [], {})).toBe("codex");
    expect(detectProvider({ model: { id: "claude-opus" } }, [], {})).toBe("claude");
  });
});

describe("normalizeCodexPayload", () => {
  it("maps rate limits to 5h/weekly usage and Codex fields to the shared payload", () => {
    const { payload, usage } = normalizeCodexPayload(codexPayload);
    expect(usage.five_hour?.utilization).toBe(42);
    expect(usage.five_hour?.resets_at).toBe(new Date(1893456000 * 1000).toISOString());
    expect(usage.seven_day?.utilization).toBe(18);
    expect(usage.extra_usage).toBeUndefined();
    expect(payload.effort).toBe("high");
    expect(payload.cost?.total_cost_usd).toBe(2.5);
  });

  it("reports no usage when Codex sends no rate limits", () => {
    const { usage } = normalizeCodexPayload({ schema_version: 1 });
    expect(usage.five_hour).toBeUndefined();
    expect(usage.seven_day).toBeUndefined();
  });
});

describe("provider layouts", () => {
  it("is global by default and overridable per provider", () => {
    const base = createDefaultSettings();
    expect(resolveSettings(base, "codex")).toBe(base);

    const custom = [[{ id: "x", type: "model" }]];
    const withCodex = withProviderLayout(base, "codex", { lines: custom });
    expect(resolveSettings(withCodex, "codex").lines).toEqual(custom);
    expect(resolveSettings(withCodex, "claude").lines).toEqual(base.lines);
  });

  it("round-trips through validation and drops empty overrides", () => {
    const base = createDefaultSettings();
    const withCodex = withProviderLayout(base, "codex", { lines: [[{ id: "x", type: "model" }]] });
    expect(validateSettings(JSON.parse(JSON.stringify(withCodex))).providers?.codex?.lines).toHaveLength(1);
    expect(withProviderLayout(withCodex, "codex", null).providers).toBeUndefined();
  });
});
