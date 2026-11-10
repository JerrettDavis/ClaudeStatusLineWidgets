import { spawn as spawnProcess } from "child_process";
import { createRequire as makeRequire } from "module";
import { homedir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";
import type * as NodePty from "node-pty";
import { buildCodexPayload } from "./codex-session.js";
import { loadSettingsFor } from "./config/loader.js";

const REFRESH_MS = 2000;
const MAX_ROWS = 6;
const ESC = "\x1b";

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g, "");

/** Cut a line to `width` visible columns, keeping its ANSI sequences intact. */
export function clipLine(line: string, width: number): string {
  let visible = 0;
  let out = "";
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ESC) {
      const m = /^\x1b\[[0-9;?]*[ -/]*[@-~]|^\x1b\][^\x07]*\x07/.exec(line.slice(i));
      if (m) {
        out += m[0];
        i += m[0].length - 1;
        continue;
      }
    }
    if (visible >= width) break;
    out += line[i];
    visible++;
  }
  return out + `${ESC}[0m`;
}

function renderFooter(payload: Record<string, unknown>): Promise<string[]> {
  return new Promise((resolve) => {
    const entry = fileURLToPath(import.meta.url);
    const child = spawnProcess(process.execPath, [entry, "--provider", "codex"], {
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
    let out = "";
    const timer = setTimeout(() => child.kill(), 5000);
    child.stdout.on("data", (d) => (out += d));
    child.on("close", () => {
      clearTimeout(timer);
      resolve(out.split(/\r?\n/).filter((l) => stripAnsi(l).trim() !== "").slice(0, MAX_ROWS));
    });
    child.on("error", () => resolve([]));
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

/** node-pty is a native addon, so it lives outside the package (see `ccfooter-config codex install`). */
function loadPty(): typeof NodePty | null {
  try {
    const dir = join(process.env.CCFOOTER_CONFIG_DIR ?? join(homedir(), ".config", "claude-statusline-widgets"), "pty");
    return makeRequire(join(dir, "package.json"))("node-pty");
  } catch {
    return null;
  }
}

/**
 * Run `command` inside a pseudo-terminal that is shorter than the real terminal,
 * and draw the Codex statusline in the rows left over at the bottom. Stock Codex
 * cannot run a status command itself, so the host owns those rows instead.
 */
export async function runCodexHost(command: string[]): Promise<number> {
  if (command.length === 0) {
    process.stderr.write("[ccfooter-config] no codex command given\n");
    return 1;
  }
  const pty = loadPty();
  if (!pty) {
    process.stderr.write("[ccfooter-config] node-pty is not installed (run `ccfooter-config codex install`); running codex without a status line.\n");
    return await new Promise((resolve) => {
      const child = spawnProcess(command[0], command.slice(1), { stdio: "inherit" });
      child.on("exit", (code) => resolve(code ?? 1));
    });
  }

  const out = process.stdout;
  const startedAt = Date.now();
  let footer: string[] = [];
  let firstDone = false;
  const startRows = out.rows || 24;
  // Fixed for the whole session: resizing the PTY while Codex runs makes it redraw and flicker.
  const layoutRows = loadSettingsFor("codex").lines.filter((l) => l.some((w) => w.type !== "separator")).length;
  const reserved = startRows >= 14 ? Math.min(MAX_ROWS, Math.max(1, layoutRows)) : 0;
  let stopped = false;

  const size = () => ({ cols: out.columns || 80, rows: out.rows || 24 });

  const term = pty.spawn(command[0], command.slice(1), {
    name: process.env.TERM || "xterm-256color",
    cols: size().cols,
    rows: size().rows - reserved,
    cwd: process.cwd(),
    env: process.env as Record<string, string>,
  });

  const draw = () => {
    if (stopped || !firstDone) return;
    const { cols, rows } = size();
    let buf = `${ESC}7`;
    // The scroll region keeps Codex's own scrolling out of the footer rows.
    buf += reserved > 0 ? `${ESC}[1;${rows - reserved}r` : `${ESC}[r`;
    for (let i = 0; i < reserved; i++) {
      buf += `${ESC}[${rows - reserved + 1 + i};1H${ESC}[2K${clipLine(footer[i] ?? "", cols)}`;
    }
    out.write(buf + `${ESC}8`);
  };

  let refreshing = false;
  const refresh = async () => {
    if (refreshing || stopped) return;
    refreshing = true;
    try {
      footer = await renderFooter(buildCodexPayload(startedAt - 5000));
    } catch {
      footer = [];
    }
    refreshing = false;
    firstDone = true;
    draw();
  };

  term.onData((data) => {
    out.write(data);
    // A full-screen clear or reset also wipes the footer rows.
    if (data.includes(`${ESC}[2J`) || data.includes(`${ESC}c`) || data.includes(`${ESC}[?1049`)) draw();
  });

  const wasRaw = process.stdin.isTTY ? process.stdin.isRaw : false;
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("data", (d) => term.write(d.toString("utf8")));
  process.stdin.resume();
  out.on("resize", () => {
    const { cols, rows } = size();
    term.resize(cols, rows - reserved);
    draw();
  });

  const timer = setInterval(refresh, REFRESH_MS);
  void refresh();

  return await new Promise<number>((resolve) => {
    term.onExit(({ exitCode }) => {
      stopped = true;
      clearInterval(timer);
      if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      const { rows } = size();
      let buf = `${ESC}[r`;
      for (let i = 0; i < reserved; i++) buf += `${ESC}[${rows - reserved + 1 + i};1H${ESC}[2K`;
      out.write(buf + `${ESC}[${rows - reserved + 1};1H${ESC}[?25h`);
      resolve(exitCode);
    });
  });
}
