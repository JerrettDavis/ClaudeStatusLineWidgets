#!/usr/bin/env node
/**
 * capture-screenshots.js
 *
 * Generates SVG terminal screenshots for docs/images/.
 * Run after `npm run build`.
 *
 * Usage:
 *   node scripts/capture-screenshots.js
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "docs", "images");

mkdirSync(IMAGES_DIR, { recursive: true });

// --- Terminal SVG configuration (Catppuccin Mocha palette) ---
const T = {
  bg: "#1e1e2e",
  titleBg: "#313244",
  fg: "#cdd6f4",
  dimFg: "#585b70",
  colors: {
    31: "#f38ba8", // red
    32: "#a6e3a1", // green
    33: "#f9e2af", // yellow
    36: "#89dceb", // cyan
  },
  btnClose: "#f38ba8",
  btnMin: "#f9e2af",
  btnMax: "#a6e3a1",
  font: "JetBrains Mono,Cascadia Code,SF Mono,Menlo,Consolas,Courier New,monospace",
  fontSize: 13,
  lineHeight: 22,
  paddingX: 20,
  paddingY: 16,
  titleH: 36,
  cornerR: 10,
  charW: 7.9, // approximate px per monospace char at fontSize 13
};

// --- ANSI escape code parser ---
function parseAnsi(text) {
  const ANSI_RE = /\x1b\[([0-9;]*)m/g;
  const spans = [];
  let lastIndex = 0;
  let state = { color: null, bold: false, dim: false };
  let match;

  while ((match = ANSI_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const raw = text.slice(lastIndex, match.index);
      if (raw) spans.push({ text: raw, ...state });
    }
    const codes = match[1] ? match[1].split(";").map(Number) : [0];
    for (const code of codes) {
      if (code === 0) state = { color: null, bold: false, dim: false };
      else if (code === 1) state = { ...state, bold: true };
      else if (code === 2) state = { ...state, dim: true };
      else if (T.colors[code]) state = { ...state, color: code };
    }
    lastIndex = ANSI_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    const raw = text.slice(lastIndex);
    if (raw) spans.push({ text: raw, ...state });
  }
  return spans;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strip ANSI codes and ZWJ/VS16 to get printable text only */
function visibleText(text) {
  return text
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\u200D/g, "") // ZWJ
    .replace(/\uFE0F/g, "") // VS16
    .replace(/\uFE0E/g, ""); // VS15
}

/** Approximate visible width: emojis count as 2 columns */
function visibleWidth(text) {
  const clean = visibleText(text);
  let w = 0;
  for (const cp of [...clean]) {
    const code = cp.codePointAt(0);
    if (
      (code >= 0x1f000 && code <= 0x1ffff) || // Emoticons + misc symbols
      (code >= 0x2600 && code <= 0x27bf) || // Misc + dingbats (⛓, ⚖)
      code === 0x231a || // ⌚
      code === 0x23f0 // ⏰
    ) {
      w += 2;
    } else if (code === 0x200d || code === 0xfe0f || code === 0xfe0e) {
      // skip joiners/selectors
    } else {
      w += 1;
    }
  }
  return w;
}

/**
 * Convert an array of ANSI-encoded lines to an SVG terminal screenshot.
 *
 * @param {string[]} lines   Array of lines with ANSI colour codes.
 * @param {object}   options
 * @param {string}   options.title      Window title text.
 * @param {number}   [options.minWidth] Minimum SVG width in px (default 560).
 * @param {string}   [options.label]    Optional dim label prepended above content.
 */
function ansiLinesToSvg(lines, { title = "Terminal", minWidth = 560 } = {}) {
  // Remove trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();

  const maxChars = Math.max(...lines.map((l) => visibleWidth(l)));
  const contentPxW = Math.max(minWidth - T.paddingX * 2, Math.ceil(maxChars * T.charW));
  const svgWidth = contentPxW + T.paddingX * 2;
  const svgHeight =
    T.titleH + T.paddingY + lines.length * T.lineHeight + T.paddingY;

  const btnY = T.titleH / 2;

  const textElems = lines
    .map((line, i) => {
      const y = T.titleH + T.paddingY + i * T.lineHeight + T.fontSize;
      const spans = parseAnsi(line);
      const tspans = spans
        .map((span) => {
          if (!span.text) return "";
          const fill = span.color
            ? T.colors[span.color]
            : span.dim
              ? T.dimFg
              : T.fg;
          const weight = span.bold ? ' font-weight="bold"' : "";
          // dim non-coloured text slightly
          const opacity =
            span.dim && !span.color ? ' opacity="0.75"' : "";
          return `<tspan fill="${fill}"${weight}${opacity}>${escapeXml(span.text)}</tspan>`;
        })
        .join("");
      return `  <text x="${T.paddingX}" y="${y}" xml:space="preserve" font-family="${T.font}" font-size="${T.fontSize}" fill="${T.fg}">${tspans}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <!-- Window background -->
  <rect width="${svgWidth}" height="${svgHeight}" rx="${T.cornerR}" fill="${T.bg}"/>
  <!-- Title bar -->
  <rect width="${svgWidth}" height="${T.titleH}" rx="${T.cornerR}" fill="${T.titleBg}"/>
  <rect y="${T.titleH - T.cornerR}" width="${svgWidth}" height="${T.cornerR}" fill="${T.titleBg}"/>
  <!-- Window control dots -->
  <circle cx="16" cy="${btnY}" r="5" fill="${T.btnClose}"/>
  <circle cx="32" cy="${btnY}" r="5" fill="${T.btnMin}"/>
  <circle cx="48" cy="${btnY}" r="5" fill="${T.btnMax}"/>
  <!-- Title -->
  <text x="${svgWidth / 2}" y="${btnY + 4.5}" text-anchor="middle" font-family="${T.font}" font-size="11" fill="${T.dimFg}">${escapeXml(title)}</text>
${textElems}
</svg>`;
}

// --- Rendering helpers ---

/** Render a statusline with mock context using isPreview semantics */
async function renderMock(overrides = {}) {
  const { renderStatusLine } = await import("../dist/renderer.js");
  const { createDefaultSettings } = await import("../dist/config/schema.js");

  const now = Date.now();
  const settings = createDefaultSettings();

  const defaultContext = {
    payload: {
      model: { id: "claude-opus-4-6", display_name: "Opus" },
      cost: { total_cost_usd: 0.45 },
      context_window: {
        used_percentage: 45,
        context_window_size: 200000,
      },
      git_branch: "main",
      cwd: "/home/user/project",
    },
    cacheTTL: {
      remainingSeconds: 180,
      tier: "5m",
      lastWriteTime: new Date(now - 120_000).toISOString(),
      expiresAt: now + 180_000,
      cacheReadActive: true,
    },
    cacheStats: {
      totalReads: 50,
      totalWrites: 10,
      breakCount: 1,
      lastBreakTime: null,
    },
    usageData: null,
    headroomStats: null,
    isPreview: true,
  };

  const context = deepMerge(defaultContext, overrides);
  return renderStatusLine(settings, context);
}

/** Deep merge (second wins) */
function deepMerge(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object") {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// --- Screenshot definitions ---

async function main() {
  const now = Date.now();

  // 1. Full default layout — all 3 lines, healthy state
  {
    const raw = await renderMock();
    const lines = raw.split("\n");
    const svg = ansiLinesToSvg(lines, {
      title: "Claude StatusLine Widgets — Default Layout",
      minWidth: 660,
    });
    writeFileSync(join(IMAGES_DIR, "statusline-full.svg"), svg, "utf-8");
    console.log("✔ statusline-full.svg");
  }

  // 2. Session line only — Sonnet model, 28% context
  {
    const { renderStatusLine } = await import("../dist/renderer.js");
    const { createDefaultSettings } = await import("../dist/config/schema.js");
    const settings = createDefaultSettings();
    // Override to only show Line 1
    settings.lines = [settings.lines[0]];
    const raw = renderStatusLine(settings, {
      payload: {
        model: { id: "claude-sonnet-4-5", display_name: "Sonnet" },
        cost: { total_cost_usd: 0.12 },
        context_window: { used_percentage: 28, context_window_size: 200000 },
        git_branch: "feat/add-widgets",
        cwd: "/home/user/my-app",
      },
      cacheTTL: {
        remainingSeconds: 180,
        tier: "5m",
        lastWriteTime: new Date(now - 60_000).toISOString(),
        expiresAt: now + 180_000,
        cacheReadActive: true,
      },
      cacheStats: { totalReads: 10, totalWrites: 3, breakCount: 1, lastBreakTime: null },
      usageData: null,
      headroomStats: null,
      isPreview: false,
    });
    const lines = raw.split("\n");
    const svg = ansiLinesToSvg(lines, {
      title: "Claude StatusLine Widgets — Session Line",
      minWidth: 600,
    });
    writeFileSync(join(IMAGES_DIR, "statusline-session.svg"), svg, "utf-8");
    console.log("✔ statusline-session.svg");
  }

  // 3. High context warning — 88% context (red bar)
  {
    const raw = await renderMock({
      payload: {
        context_window: { used_percentage: 88, context_window_size: 200000 },
      },
    });
    const lines = raw.split("\n");
    const svg = ansiLinesToSvg(lines, {
      title: "Claude StatusLine Widgets — High Context Warning",
      minWidth: 660,
    });
    writeFileSync(join(IMAGES_DIR, "statusline-context-high.svg"), svg, "utf-8");
    console.log("✔ statusline-context-high.svg");
  }

  // 4. Cache TTL states — 4 session lines in one screenshot
  {
    const { renderStatusLine } = await import("../dist/renderer.js");
    const { createDefaultSettings } = await import("../dist/config/schema.js");

    const basePayload = {
      model: { id: "claude-opus-4-6", display_name: "Opus" },
      cost: { total_cost_usd: 0.45 },
      context_window: { used_percentage: 45, context_window_size: 200000 },
      git_branch: "main",
      cwd: "/home/user/project",
    };
    const cacheStats = { totalReads: 20, totalWrites: 5, breakCount: 1, lastBreakTime: null };

    const states = [
      {
        label: "Green  (> 2 min)",
        cacheTTL: { remainingSeconds: 240, tier: "5m", lastWriteTime: null, expiresAt: now + 240_000, cacheReadActive: true },
      },
      {
        label: "Yellow (1–2 min)",
        cacheTTL: { remainingSeconds: 90, tier: "5m", lastWriteTime: null, expiresAt: now + 90_000, cacheReadActive: true },
      },
      {
        label: "Red    (< 1 min)",
        cacheTTL: { remainingSeconds: 30, tier: "5m", lastWriteTime: null, expiresAt: now + 30_000, cacheReadActive: true },
      },
      {
        label: "Expired",
        cacheTTL: { remainingSeconds: 0, tier: "none", lastWriteTime: null, expiresAt: null, cacheReadActive: false },
      },
    ];

    const dim = (s) => `\x1b[2m${s}\x1b[0m`;

    const lines = [];
    for (const { label, cacheTTL } of states) {
      const settings = createDefaultSettings();
      settings.lines = [settings.lines[0]]; // line 1 only
      const out = renderStatusLine(settings, {
        payload: basePayload,
        cacheTTL,
        cacheStats,
        usageData: null,
        headroomStats: null,
        isPreview: false,
      });
      const firstLine = out.split("\n")[0];
      lines.push(`${dim(label.padEnd(18))}${firstLine}`);
    }

    const svg = ansiLinesToSvg(lines, {
      title: "Claude StatusLine Widgets — Cache TTL States",
      minWidth: 700,
    });
    writeFileSync(join(IMAGES_DIR, "statusline-cache-states.svg"), svg, "utf-8");
    console.log("✔ statusline-cache-states.svg");
  }

  // 5. Usage line
  {
    const { renderStatusLine } = await import("../dist/renderer.js");
    const { createDefaultSettings } = await import("../dist/config/schema.js");
    const settings = createDefaultSettings();
    settings.lines = [settings.lines[1]]; // Line 2 only (usage)
    const raw = renderStatusLine(settings, {
      payload: {},
      cacheTTL: { remainingSeconds: 0, tier: "none", lastWriteTime: null, expiresAt: null, cacheReadActive: false },
      cacheStats: { totalReads: 0, totalWrites: 0, breakCount: 0, lastBreakTime: null },
      usageData: null,
      headroomStats: null,
      isPreview: true,
    });
    if (raw.trim()) {
      const lines = raw.split("\n");
      const svg = ansiLinesToSvg(lines, {
        title: "Claude StatusLine Widgets — API Usage",
        minWidth: 500,
      });
      writeFileSync(join(IMAGES_DIR, "statusline-usage.svg"), svg, "utf-8");
      console.log("✔ statusline-usage.svg");
    }
  }

  // 6. Headroom line
  {
    const { renderStatusLine } = await import("../dist/renderer.js");
    const { createDefaultSettings } = await import("../dist/config/schema.js");
    const settings = createDefaultSettings();
    settings.lines = [settings.lines[2]]; // Line 3 only (headroom)
    const raw = renderStatusLine(settings, {
      payload: {},
      cacheTTL: { remainingSeconds: 0, tier: "none", lastWriteTime: null, expiresAt: null, cacheReadActive: false },
      cacheStats: { totalReads: 0, totalWrites: 0, breakCount: 0, lastBreakTime: null },
      usageData: null,
      headroomStats: {
        compressionPct: 34,
        tokensSaved: 491000,
        cliTokensSaved: 100000,
        costSavedUsd: 0.12,
        requests: 150,
        cacheHitRate: 0.78,
      },
      isPreview: false,
    });
    if (raw.trim()) {
      const lines = raw.split("\n");
      const svg = ansiLinesToSvg(lines, {
        title: "Claude StatusLine Widgets — Headroom Proxy Stats",
        minWidth: 520,
      });
      writeFileSync(join(IMAGES_DIR, "statusline-headroom.svg"), svg, "utf-8");
      console.log("✔ statusline-headroom.svg");
    }
  }

  console.log(`\nAll screenshots saved to ${IMAGES_DIR}`);
}

main().catch((err) => {
  console.error("Screenshot generation failed:", err);
  process.exit(1);
});
