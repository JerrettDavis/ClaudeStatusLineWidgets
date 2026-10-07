import type { EngineInterface, Register } from "claude-code";

type SessionMeta = {
  transcriptPath?: string;
  version?: string;
};

let meta: SessionMeta = {};
let refreshInFlight: Promise<void> | null = null;
let refreshAgain = false;
let lines: Span[][] = [];

// The native API reports the model id; the legacy payload carried a display
// name ("Sonnet 5.5"). Rebuild it for current ids and pass anything else through.
export function modelDisplayName(id: string): string {
  const m = /^claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?/.exec(id);
  if (!m) return id;
  const family = m[1][0].toUpperCase() + m[1].slice(1);
  return `${family} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
}

export type Span = {
  text: string;
  color?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
};

const BASIC = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
const BRIGHT = ["gray", "redBright", "greenBright", "yellowBright", "blueBright", "magentaBright", "cyanBright", "whiteBright"];

// ui.status and Text both drop control characters, so the renderer's SGR
// colours cannot pass through as text. Parse them into styled spans instead.
export function parseAnsiLine(line: string): Span[] {
  const spans: Span[] = [];
  let style: Omit<Span, "text"> = {};
  let last = 0;
  const re = /\x1b\[([0-9;]*)m/g;
  const push = (text: string) => {
    if (text) spans.push({ ...style, text });
  };
  for (let m = re.exec(line); m; m = re.exec(line)) {
    push(line.slice(last, m.index));
    last = m.index + m[0].length;
    const codes = m[1] === "" ? [0] : m[1].split(";").map(Number);
    for (const c of codes) {
      if (c === 0) style = {};
      else if (c === 1) style = { ...style, bold: true };
      else if (c === 2) style = { ...style, dim: true };
      else if (c === 3) style = { ...style, italic: true };
      else if (c === 4) style = { ...style, underline: true };
      else if (c === 22) style = { ...style, bold: false, dim: false };
      else if (c >= 30 && c <= 37) style = { ...style, color: BASIC[c - 30] };
      else if (c >= 90 && c <= 97) style = { ...style, color: BRIGHT[c - 90] };
      else if (c === 39) style = { ...style, color: undefined };
    }
  }
  push(line.slice(last));
  // Any escape the parser did not understand would render as garbage.
  return spans.map((sp) => ({ ...sp, text: sp.text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "") }));
}

function stripTrailingBlankLines(value: string): string {
  return value.replace(/[\r\n]+$/g, "");
}

async function buildPayload($: EngineInterface): Promise<Record<string, unknown>> {
  const [cwd, sessionId, model, usage, versionInfo] = await Promise.all([
    $.session.cwd(),
    $.session.id(),
    $.session.model(),
    $.session.usage(),
    $.session.version(),
  ]);

  // After a hot reload the module's variables start over; recover the
  // transcript path the SessionStart hook persisted for this same session.
  if (!meta.transcriptPath) {
    try {
      const saved = (await $.store.get("sessionMeta")) as
        | { sessionId?: string; transcriptPath?: string; version?: string }
        | undefined;
      if (saved?.sessionId === sessionId) {
        meta = { transcriptPath: saved.transcriptPath, version: saved.version };
      }
    } catch {
      // Store unreadable: render without transcript-derived widgets.
    }
  }

  const context = usage.context;
  const payload: Record<string, unknown> = {
    cwd,
    session_id: sessionId,
    version: meta.version ?? versionInfo.version,
    model: {
      id: model,
      display_name: modelDisplayName(model),
    },
    context_window: {
      used_percentage: context.percent ?? null,
      context_window_size: context.window,
      // Mod usage exposes the live context total, not the legacy statusLine
      // payload's cumulative input/output token counters. Do not mislabel it.
    },
    transcript_path: meta.transcriptPath,
  };

  // Keep the bridge forward-compatible with richer usage snapshots without
  // coupling the mod to fields that are not guaranteed by the public type yet.
  const usageRecord = usage as unknown as Record<string, unknown>;
  const cost = usageRecord.cost;
  if (typeof cost === "number") {
    payload.cost = { total_cost_usd: cost };
  } else if (cost && typeof cost === "object") {
    const total = (cost as Record<string, unknown>).total_cost_usd
      ?? (cost as Record<string, unknown>).totalCostUsd
      ?? (cost as Record<string, unknown>).usd;
    if (typeof total === "number") payload.cost = { total_cost_usd: total };
  }

  return payload;
}

async function render($: EngineInterface): Promise<void> {
  const payload = await buildPayload($);
  const root = $.plugin.root;
  const cwd = typeof payload.cwd === "string" ? payload.cwd : undefined;

  const result = await $.process.run(
    ["node", `${root}/dist/index.js`],
    {
      cwd,
      timeoutMs: 8_000,
      stdin: JSON.stringify(payload),
    },
  );

  if (result.exitCode !== 0) {
    const detail = result.stderr.trim().split("\n")[0] || `renderer exited ${result.exitCode}`;
    $.ui.log(`claude-statusline-widgets: ${detail}`, { to: "debug" });
    return;
  }

  const output = stripTrailingBlankLines(result.stdout);
  if (!output) {
    lines = [];
    $.ui.invalidate("ui.render");
    return;
  }

  // Colours and multi-row layouts only survive in a drawn tree, so the output
  // is published to the AbovePrompt band; ui.status is plain text only.
  lines = output.split(/\r?\n/).map(parseAnsiLine);
  $.ui.invalidate("ui.render");
}

function scheduleRefresh($: EngineInterface): void {
  if (refreshInFlight) {
    refreshAgain = true;
    return;
  }

  refreshInFlight = (async () => {
    do {
      refreshAgain = false;
      try {
        await render($);
      } catch (err) {
        $.ui.log(
          `claude-statusline-widgets: ${err instanceof Error ? err.message : String(err)}`,
          { to: "debug" },
        );
      }
    } while (refreshAgain);
  })().finally(() => {
    refreshInFlight = null;
  });
}

export const register: Register = (on) => {
  on("ui.render", { component: "AbovePrompt" }, ($, e, next) => {
    if (e.props.hasSurvey || lines.length === 0) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    return (
      <Box flexDirection="column">
        {lines.map((spans, row) => (
          <Box key={`row-${row}`}>
            {spans.map((sp, i) => (
              <Text
                key={`s-${i}`}
                color={sp.color}
                bold={sp.bold}
                dimColor={sp.dim}
                italic={sp.italic}
                underline={sp.underline}
              >
                {sp.text}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    );
  });

  on("session.start", async ($, e, next) => {
    const result = await next(e);
    // Drop the statusLine entry older releases wrote to settings.json.
    void $.process
      .run(["node", `${$.plugin.root}/scripts/cleanup-legacy-statusline.js`], { timeoutMs: 5_000 })
      .catch(() => undefined);
    $.clock.after(0, () => scheduleRefresh($));

    // Cache TTL and reset countdown widgets need to advance even while Claude
    // is idle. Keep this deliberately coarse so the renderer stays cheap.
    $.clock.every(15_000, () => scheduleRefresh($));
    return result;
  });

  // The classic event carries transcript_path, which the native session API
  // intentionally does not expose. Retaining it gives cache TTL/session widgets
  // feature parity while the status line itself is now fully Mod-owned.
  on("classic.SessionStart", async ($, e, next) => {
    const result = await next(e);
    meta = {
      transcriptPath: typeof e.transcript_path === "string" ? e.transcript_path : undefined,
      version: typeof e.version === "string" ? e.version : undefined,
    };
    if (typeof e.session_id === "string") {
      await $.store
        .set("sessionMeta", { sessionId: e.session_id, ...meta })
        .catch(() => undefined);
    }
    $.clock.after(0, () => scheduleRefresh($));
    return result;
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (e.agentId === undefined) $.clock.after(0, () => scheduleRefresh($));
    return result;
  });

  on("session.measure", async ($, e, next) => {
    const result = await next(e);
    $.clock.after(0, () => scheduleRefresh($));
    return result;
  });
};
