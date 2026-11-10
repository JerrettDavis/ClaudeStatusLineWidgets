import { describe, it, expect } from "vitest";
// @ts-expect-error plain JS module
import { upsertStatusLineCommand, removeStatusLineCommand, readCommand, applySeparateLayout } from "./codex.js";

const root = "C:\\pkg\\claude-statusline-widgets";

describe("codex config editing", () => {
  it("creates [tui] and the command table in an empty config", () => {
    const out = upsertStatusLineCommand("", root);
    expect(out).toContain("[tui]\nstatus_line = []");
    expect(out).toContain("[tui.status_line_command]");
    expect(readCommand(out)).toContain('"C:/pkg/claude-statusline-widgets/dist/index.js", "--provider", "codex"');
  });

  it("preserves unrelated config, keeps an existing status_line, and is idempotent", () => {
    const original = 'model = "gpt-5"\n\n[tui]\nstatus_line = ["model"]\n\n[projects.x]\ntrust = true\n';
    const once = upsertStatusLineCommand(original, root);
    expect(once).toContain('model = "gpt-5"');
    expect(once).toContain('status_line = ["model"]');
    expect(once).toContain("[projects.x]\ntrust = true");
    expect(upsertStatusLineCommand(once, root)).toBe(once);
  });

  it("adds status_line to an existing [tui] table that lacks it", () => {
    const out = upsertStatusLineCommand('[tui]\ntheme = "dark"\n', root);
    expect(out.match(/\[tui\]/g)).toHaveLength(1);
    expect(out).toContain("status_line = []");
  });

  it("removes only our table", () => {
    const out = removeStatusLineCommand(upsertStatusLineCommand('[a]\nx = 1\n', root));
    expect(out).not.toContain("status_line_command");
    expect(out).toContain("[a]\nx = 1");
  });
});

describe("applySeparateLayout", () => {
  it("copies the global layout into a codex override once", () => {
    const base = { version: 2, lines: [[{ id: "1", type: "model" }]] };
    const { settings, changed } = applySeparateLayout(base);
    expect(changed).toBe(true);
    expect(settings.providers.codex.lines).toEqual(base.lines);
    expect(applySeparateLayout(settings).changed).toBe(false);
  });
});
