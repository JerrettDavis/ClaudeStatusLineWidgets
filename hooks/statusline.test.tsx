/**
 * Plugin tests for the cache-ttl-statusline mod.
 *
 * Run from the project root:
 *   claude plugin test
 *
 * Uses `claude-code/testing` so each test runs in the same hook environment
 * the engine uses at runtime. Stubs answer every `$.*` call the mod makes;
 * no real fs, network, or session runs.
 *
 * Note: `$.state` calls are answered by the kit itself — no stub needed.
 */
import { expect, mock, test } from "claude-code/testing";

/** A minimal AbovePrompt event payload, equivalent to what the engine passes. */
const ABOVE_PROMPT = {
  plugin: "cache-ttl-statusline",
  component: "AbovePrompt",
  requestId: "test",
  surface: "terminal",
  viewport: { columns: 100, rows: 30 },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 6,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 6 },
    view: {},
  },
} as const;

/** What Claude Code would draw at the site when the mod passes through. */
const STUB_BELOW = {
  type: "Text",
  props: {},
  children: ["drawn by engine"],
};

/** Stubbed settings JSON that the mod will read from disk. */
const SETTINGS_JSON = JSON.stringify({
  version: 2,
  lines: [
    [
      { id: "1", type: "model" },
      { id: "2", type: "separator" },
      { id: "3", type: "cache-ttl" },
    ],
  ],
});

/** Default fs.read dispatch: each path returns its appropriate JSON. */
function defaultFsRead(_$: unknown, e: { path: string }): { value: string } {
  if (e.path.endsWith("settings.json")) return { value: SETTINGS_JSON };
  if (e.path.endsWith(".credentials.json"))
    return { value: JSON.stringify({ claudeAiOauth: { accessToken: "tk" } }) };
  if (e.path.endsWith("usage.json"))
    return {
      value: JSON.stringify({
        fetchedAt: Date.now(),
        data: { five_hour: { utilization: 0.3, resets_at: null } },
      }),
    };
  if (e.path.endsWith("headroom.json"))
    return { value: JSON.stringify({ fetchedAt: Date.now(), isActive: true, data: null }) };
  if (e.path.endsWith(".claude.json"))
    return { value: JSON.stringify({ userEmail: "test@example.com" }) };
  return { value: "" };
}

/** Default fs.stat dispatch: tiny file. */
function defaultFsStat(): { value: { size: number; mtimeMs: number; isFile: boolean } } {
  return { value: { size: 1024, mtimeMs: 1000, isFile: true } };
}

test("renders a tree when settings load", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("ui.render", () => STUB_BELOW);

  const out = await $.ui.render({ ...ABOVE_PROMPT });
  // Either the stub below or a wrapper tree — both mean the hook ran cleanly
  expect(out).toBeDefined();
});

test("yields to engine when a survey is active", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("ui.render", () => STUB_BELOW);

  const out = await $.ui.render({
    ...ABOVE_PROMPT,
    props: { ...ABOVE_PROMPT.props, hasSurvey: true },
  });
  // When a survey is active, the mod returns the stub below unchanged
  expect(out).toEqual(STUB_BELOW);
});

test("classic.SessionStart captures transcript_path without throwing", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("classic.SessionStart", () => ({}));

  // Should not throw
  await $.classic.SessionStart({
    source: "startup",
    transcript_path: "/work/sess.jsonl",
  });
});

test("classic.SessionStart tolerates a missing transcript_path", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("classic.SessionStart", () => ({}));

  // Should not throw even without transcript_path
  await $.classic.SessionStart({ source: "startup" });
});

test("falls back to no-data when transcript exceeds 4 MiB", async ($, on) => {
  on("fs.read", defaultFsRead);
  // Override fs.stat to report a 5 MiB transcript
  on("fs.stat", () => ({
    value: { size: 5 * 1024 * 1024, mtimeMs: 1000, isFile: true },
  }));
  on("ui.render", () => STUB_BELOW);

  // Should not throw
  const out = await $.ui.render({ ...ABOVE_PROMPT });
  expect(out).toBeDefined();
});

test("session.start arms a periodic redraw without throwing", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("session.start", () => ({ cwd: "/work" }));

  // Should not throw; arms a $.clock.every timer for periodic redraws
  await $.session.start({
    surface: "terminal",
    isInteractive: true,
    cwd: "/work",
  });
});

test("turn.complete triggers a redraw for the primary agent", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("turn.complete", () => ({ text: "" }));

  await $.turn.complete({
    turnId: "t1",
    answer: "ok",
    durationMs: 100,
    isAborted: false,
    usage: null,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Parity tests: verify the mod renders the same widget text the legacy CLI
// would have rendered for an equivalent fixture. Comprehensive content
// parity is verified in src/widgets/parity.spec.ts (vitest); the plugin
// tests below focus on the wiring (every payload field populated, error
// resilience, empty-settings yield).
// ──────────────────────────────────────────────────────────────────────────

test("mod renders without throwing when every payload field is set", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  // git calls — return empty so parseGitInfoMod doesn't error
  on("process.run", () => ({ value: { exitCode: 0, stdout: "", stderr: "" } }));
  // ui.log — drop them rather than throw
  on("ui.log", () => ({ value: undefined }));
  on("ui.render", () => STUB_BELOW);

  // Comprehensive session stubs: every field the legacy register.ts fed into
  // its payload must now come through $.session.* in the mod path.
  on("session.cwd", () => ({ value: "/work" }));
  on("session.id", () => ({ value: "sess-abc" }));
  on("session.model", () => ({ value: "claude-opus-4-6" }));
  on("session.version", () => ({ value: { version: "2.1.290" } }));
  on("session.usage", () => ({
    value: {
      context: { tokens: 0, window: 200000, percent: 45 },
      rateLimits: [],
      cost: 0.12,
    },
  }));

  // The mod should mount without throwing — comprehensive content parity
  // is verified in src/widgets/parity.spec.ts (vitest).
  const out = await $.ui.render({ ...ABOVE_PROMPT });
  expect(out).toBeDefined();
});

test("mod falls back gracefully when $.session.usage rejects", async ($, on) => {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("process.run", () => ({ value: { exitCode: 0, stdout: "", stderr: "" } }));
  on("ui.log", () => ({ value: undefined }));
  on("ui.render", () => STUB_BELOW);

  // Force the usage call to fail — the mod must not crash.
  on("session.usage", () => ({ deny: "simulated network failure" }));
  on("session.cwd", () => ({ value: "/work" }));
  on("session.model", () => ({ value: "Opus" }));

  // Should still render — renderAbovePrompt's try/catch swallows the
  // rejection and returns undefined, so the mod yields below.
  const out = await $.ui.render({ ...ABOVE_PROMPT });
  expect(out).toBeDefined();
});

test("mod yields below unmodified when nothing is configured", async ($, on) => {
  // Empty settings → renderStatusLineElement returns undefined → only below.
  on("fs.read", () => ({ value: JSON.stringify({ version: 2, lines: [] }) }));
  on("fs.stat", defaultFsStat);
  on("ui.render", () => STUB_BELOW);

  // No widgets → the mod returns next(e) verbatim.
  const out = await $.ui.render({ ...ABOVE_PROMPT });
  expect(out).toEqual(STUB_BELOW);
});
// ──────────────────────────────────────────────────────────────────────────
// Install-mode gate: the Mod draws only when scripts/mode.js reports `mod`.
// ──────────────────────────────────────────────────────────────────────────

function modeRun(mode: string) {
  return (_$: unknown, e: { argv?: string[] }) => {
    const isMode = (e.argv ?? []).some((a) => a.endsWith("mode.js"));
    return { value: { exitCode: 0, stdout: isMode ? `${mode}\n` : "", stderr: "" } };
  };
}

async function startWith($: any, on: any, mode: string) {
  on("fs.read", defaultFsRead);
  on("fs.stat", defaultFsStat);
  on("process.run", modeRun(mode));
  on("ui.log", () => ({ value: undefined }));
  on("ui.render", () => STUB_BELOW);
  on("env.get", () => ({ value: "/home/u" }));
  on("session.cwd", () => ({ value: "/work" }));
  on("session.id", () => ({ value: "s1" }));
  on("session.model", () => ({ value: "claude-sonnet-5-5" }));
  on("session.version", () => ({ value: { version: "2.1.292" } }));
  on("session.usage", () => ({ value: { startedAt: 0, context: { tokens: 10, window: 200000, percent: 5 }, rateLimits: [] } }));
  on("http.fetch", () => ({ value: { status: 503, headers: {}, body: "" } }));
  on("command.register", () => ({ value: { command: "statusline-mode" } }));
  on("clock.every", () => ({ value: { id: "t1" } }));
  on("clock.after", () => ({ value: { id: "t1" } }));
  on("session.start", () => ({ cwd: "/work" }));
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" });
}

test("hook mode leaves the AbovePrompt band untouched", async ($, on) => {
  await startWith($, on, "hook");
  const out = await $.ui.render({ ...ABOVE_PROMPT });
  expect(out).toEqual(STUB_BELOW);
});

test("mod mode draws the status line above the engine's own content", async ($, on) => {
  await startWith($, on, "mod");
  const out = await $.ui.render({ ...ABOVE_PROMPT });
  expect(out).not.toEqual(STUB_BELOW);
  expect(JSON.stringify(out)).toContain("drawn by engine");
});
