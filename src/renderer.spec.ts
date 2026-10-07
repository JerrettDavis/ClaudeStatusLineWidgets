import { describe, it, expect } from "vitest";
import { renderStatusLine } from "./renderer.js";
import type { Settings } from "./config/schema.js";
import type { RenderContext } from "./widgets/types.js";
import type { RuntimeData } from "./runtime.js";

const minimalRuntime: RuntimeData = {
  git: {
    available: false,
    cwd: null,
    branch: null,
    rootPath: null,
    rootName: null,
    sha: null,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicts: 0,
    changes: 0,
    insertions: 0,
    deletions: 0,
    ahead: 0,
    behind: 0,
    origin: null,
    upstream: null,
    isFork: false,
    worktreeMode: null,
    worktreeName: null,
    worktreeBranch: null,
    worktreeOriginalBranch: null,
  },
  session: {
    sessionId: null,
    version: null,
    outputStyle: null,
    vimMode: null,
    thinkingEffort: null,
    skills: [],
    accountEmail: null,
    startedAt: null,
    elapsedSeconds: null,
  },
  system: {
    terminalWidth: null,
    memoryUsedBytes: 0,
    memoryTotalBytes: 0,
  },
  tokens: {
    input: null,
    output: null,
    cached: null,
    total: null,
    inputSpeed: null,
    outputSpeed: null,
    totalSpeed: null,
  },
  usage: {
    fiveHourResetSeconds: null,
    sevenDayResetSeconds: null,
  },
};

// Minimal valid RenderContext for unit tests
const minimalCtx: RenderContext = {
  payload: {},
  cacheTTL: {
    remainingSeconds: -1,
    tier: "none",
    lastWriteTime: null,
    expiresAt: null,
    cacheReadActive: false,
  },
  cacheStats: {
    totalReads: 0,
    totalWrites: 0,
    breakCount: 0,
    lastBreakTime: null,
    lastBreakTokens: 0,
    avgBreakTokens: 0,
  },
  usageData: null,
  headroomStats: null,
  runtime: minimalRuntime,
  isPreview: false,
};

function makeSettings(overrides: Partial<Settings>): Settings {
  return {
    version: 2,
    lines: [],
    ...overrides,
  };
}

describe("renderStatusLine — color application", () => {
  it("renders plain text with no color when color is undefined", () => {
    const settings = makeSettings({
      lines: [[{ id: "1", type: "custom-text", customText: "hello" }]],
    });
    const output = renderStatusLine(settings, minimalCtx);
    expect(output).toBe("hello");
    // No ANSI codes
    expect(output).not.toMatch(/\x1b\[/);
  });

  it('renders plain text with no color when color is "default"', () => {
    const settings = makeSettings({
      lines: [[{ id: "1", type: "custom-text", customText: "hello", color: "default" }]],
    });
    const output = renderStatusLine(settings, minimalCtx);
    expect(output).toBe("hello");
    expect(output).not.toMatch(/\x1b\[/);
  });

  it("wraps output in ANSI code when color is set to a named color", () => {
    const settings = makeSettings({
      lines: [[{ id: "1", type: "custom-text", customText: "hello", color: "red" }]],
    });
    const output = renderStatusLine(settings, minimalCtx);
    // Should contain the red ANSI start code
    expect(output).toContain("\x1b[31m");
    // Should contain the text
    expect(output).toContain("hello");
    // Should contain reset
    expect(output).toContain("\x1b[0m");
    // Exact: ESC[31m + hello + ESC[0m
    expect(output).toBe("\x1b[31mhello\x1b[0m");
  });

  it.each([
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
  ])('applies ANSI code for color "%s"', (color, code) => {
    const settings = makeSettings({
      lines: [[{ id: "1", type: "custom-text", customText: "test", color }]],
    });
    const output = renderStatusLine(settings, minimalCtx);
    expect(output).toContain(`\x1b[${code}m`);
    expect(output).toContain("test");
  });

  it("applies different colors to different widgets on the same line", () => {
    const settings = makeSettings({
      lines: [[
        { id: "1", type: "custom-text", customText: "red-text", color: "red" },
        { id: "2", type: "custom-text", customText: "blue-text", color: "blue" },
      ]],
    });
    const output = renderStatusLine(settings, minimalCtx);
    expect(output).toContain("\x1b[31m"); // red
    expect(output).toContain("red-text");
    expect(output).toContain("\x1b[34m"); // blue
    expect(output).toContain("blue-text");
  });

  it("does not apply color to a widget that returns null", () => {
    // branch widget returns null when no branch is in the payload
    const settings = makeSettings({
      lines: [[{ id: "1", type: "branch", color: "red" }]],
    });
    const output = renderStatusLine(settings, minimalCtx);
    // null widgets are excluded from output, so output should be empty
    expect(output).toBe("");
    expect(output).not.toMatch(/\x1b\[/);
  });

  it("renders multiple lines correctly", () => {
    const settings = makeSettings({
      lines: [
        [{ id: "1", type: "custom-text", customText: "line1", color: "green" }],
        [{ id: "2", type: "custom-text", customText: "line2", color: "cyan" }],
      ],
    });
    const output = renderStatusLine(settings, minimalCtx);
    const [first, second] = output.split("\n");
    expect(first).toContain("\x1b[32m"); // green
    expect(first).toContain("line1");
    expect(second).toContain("\x1b[36m"); // cyan
    expect(second).toContain("line2");
  });

  it("applies color to a model widget in preview mode", () => {
    const settings = makeSettings({
      lines: [[{ id: "1", type: "model", color: "magenta" }]],
    });
    const ctxPreview = { ...minimalCtx, isPreview: true };
    const output = renderStatusLine(settings, ctxPreview);
    // ModelWidget returns "Opus" in preview mode
    expect(output).toBe("\x1b[35mOpus\x1b[0m");
  });

  it("applies color to a cost widget in preview mode", () => {
    const settings = makeSettings({
      lines: [[{ id: "1", type: "cost", color: "yellow" }]],
    });
    const ctxPreview = { ...minimalCtx, isPreview: true };
    const output = renderStatusLine(settings, ctxPreview);
    expect(output).toBe("\x1b[33m$0.45\x1b[0m");
  });
});

describe("renderStatusLine — separator logic unchanged", () => {
  it("suppresses separators adjacent to null-rendering widgets", () => {
    const settings = makeSettings({
      lines: [[
        { id: "1", type: "custom-text", customText: "A" },
        { id: "2", type: "separator" },
        // branch with no payload → null
        { id: "3", type: "branch" },
      ]],
    });
    const output = renderStatusLine(settings, minimalCtx);
    // separator should be suppressed because nothing follows it
    expect(output).toBe("A");
  });
});
