import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { buildCodexPayload } from "./codex-session.js";
import { normalizeCodexPayload } from "./provider.js";

function fakeHome(lines: object[]): string {
  const home = mkdtempSync(join(tmpdir(), "codex-home-"));
  const dir = join(home, "sessions", "2026", "11", "09");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "rollout-2026-11-09T00-00-00-x.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  writeFileSync(join(home, "config.toml"), 'model = "from-config"\n[tui]\nmodel = "ignored"\n');
  return home;
}

const tokenCount = {
  type: "event_msg",
  payload: {
    type: "token_count",
    info: {
      total_token_usage: { input_tokens: 900, cached_input_tokens: 800, output_tokens: 100 },
      last_token_usage: { total_tokens: 50_000 },
      model_context_window: 200_000,
    },
    rate_limits: { primary: { used_percent: 70, window_minutes: 10080, resets_at: 1794419836 }, secondary: null },
  },
};

describe("buildCodexPayload", () => {
  it("derives context, model and weekly usage from the session log", () => {
    const home = fakeHome([
      { type: "turn_context", payload: { cwd: "/w", model: "gpt-x", collaboration_mode: { settings: { reasoning_effort: "low" } } } },
      tokenCount,
    ]);
    const raw = buildCodexPayload(0, home, "/fallback");
    const { payload, usage } = normalizeCodexPayload(raw);
    expect(payload.model?.id).toBe("gpt-x");
    expect(payload.effort).toBe("low");
    expect(payload.cwd).toBe("/w");
    expect(payload.context_window?.used_percentage).toBe(25);
    expect(usage.seven_day?.utilization).toBe(70);
    expect(usage.five_hour).toBeUndefined();
  });

  it("falls back to config.toml's root model before the first turn", () => {
    const home = fakeHome([{ type: "session_meta", payload: {} }]);
    expect((buildCodexPayload(0, home, "/c").model as { id: string }).id).toBe("from-config");
  });
});
