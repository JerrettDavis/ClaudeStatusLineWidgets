import type { EngineInterface, Register } from "claude-code";

type SessionMeta = {
  transcriptPath?: string;
  version?: string;
};

let meta: SessionMeta = {};
let refreshInFlight: Promise<void> | null = null;
let refreshAgain = false;

// The native API reports the model id; the legacy payload carried a display
// name ("Sonnet 5.5"). Rebuild it for current ids and pass anything else through.
export function modelDisplayName(id: string): string {
  const m = /^claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?/.exec(id);
  if (!m) return id;
  const family = m[1][0].toUpperCase() + m[1].slice(1);
  return `${family} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
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
    $.ui.status("");
    return;
  }

  // ui.status owns the native line below the prompt. Existing configurations
  // may contain multiple rows, so collapse them deterministically into one
  // status line rather than drawing a second custom band above the prompt.
  $.ui.status(output.replace(/\r?\n+/g, "  "));
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
