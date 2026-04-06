# Cache TTL StatusLine Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript statusline command for Claude Code that shows cache TTL countdown, model, cost, and context usage.

**Architecture:** A single Node.js script reads Claude Code's statusline JSON from stdin, parses the session's JSONL transcript to find the last cache write timestamp, computes TTL remaining, and outputs a formatted ANSI string. No external dependencies — only Node.js built-ins.

**Tech Stack:** TypeScript, Node.js built-ins (`fs`, `readline`, `path`), compiled via `tsc` to `dist/`.

---

## File Structure

```
ClaudeCacheTTLStatusLine/
├── plugin.json              # Plugin manifest (skills + setup command)
├── package.json             # Build scripts
├── tsconfig.json            # TypeScript config
├── src/
│   ├── index.ts             # Entry point — reads stdin, orchestrates output
│   ├── cache.ts             # JSONL parsing, TTL computation
│   ├── segments.ts          # Segment formatters (cache, model, cost, context)
│   └── colors.ts            # ANSI escape helpers
├── dist/                    # Compiled output (gitignored)
│   └── index.js
├── skills/
│   └── setup/
│       └── SKILL.md         # Setup instructions skill
├── CLAUDE.md
└── docs/
    └── plans/
        └── 2026-04-04-cache-ttl-statusline.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "claude-cache-ttl-statusline",
  "version": "0.1.0",
  "description": "Claude Code statusline with cache TTL countdown",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
```

- [ ] **Step 4: Create CLAUDE.md**

```markdown
# Claude Cache TTL StatusLine

TypeScript statusline plugin for Claude Code showing cache TTL countdown.

## Build
npm run build

## Test locally
echo '{"model":{"id":"claude-opus-4-6","display_name":"Opus"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":45,"context_window_size":200000},"transcript_path":"path/to/session.jsonl"}' | node dist/index.js

## Architecture
- src/index.ts — entry point, reads stdin JSON, calls segments, prints output
- src/cache.ts — reads JSONL transcript, finds last cache write, computes TTL
- src/segments.ts — formatters for each statusline segment
- src/colors.ts — ANSI color/style helpers
```

- [ ] **Step 5: Install dependencies and verify build scaffolding**

Run: `cd C:/git/ClaudeCacheTTLStatusLine && npm install`
Expected: node_modules created, typescript installed.

- [ ] **Step 6: Initialize git and commit**

```bash
cd C:/git/ClaudeCacheTTLStatusLine
git init
git add package.json tsconfig.json .gitignore CLAUDE.md docs/
git commit -m "feat: project scaffolding with TypeScript build setup

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: ANSI Color Helpers

**Files:**
- Create: `src/colors.ts`

- [ ] **Step 1: Create src/colors.ts**

```typescript
const ESC = "\x1b[";
const RESET = `${ESC}0m`;

export function green(text: string): string {
  return `${ESC}32m${text}${RESET}`;
}

export function yellow(text: string): string {
  return `${ESC}33m${text}${RESET}`;
}

export function red(text: string): string {
  return `${ESC}31m${text}${RESET}`;
}

export function cyan(text: string): string {
  return `${ESC}36m${text}${RESET}`;
}

export function dim(text: string): string {
  return `${ESC}2m${text}${RESET}`;
}

export function bold(text: string): string {
  return `${ESC}1m${text}${RESET}`;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd C:/git/ClaudeCacheTTLStatusLine && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/colors.ts
git commit -m "feat: add ANSI color helper functions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Cache TTL Logic

**Files:**
- Create: `src/cache.ts`

This is the core feature. It reads the session JSONL backwards to find the last cache write, determines the TTL tier (5m or 1h), and computes remaining time.

- [ ] **Step 1: Create src/cache.ts**

```typescript
import { readFileSync } from "fs";

export interface CacheTTLResult {
  /** Seconds remaining on cache TTL. 0 = expired. -1 = no cache data found. */
  remainingSeconds: number;
  /** Which TTL tier: "5m", "1h", or "none" */
  tier: "5m" | "1h" | "none";
  /** Timestamp of the last cache write (ISO string) */
  lastWriteTime: string | null;
  /** Whether this is from the current request's cache_read (still active) */
  cacheReadActive: boolean;
}

interface UsageData {
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

interface JournalEntry {
  timestamp?: string;
  message?: {
    usage?: UsageData;
  };
}

const TTL_5M = 5 * 60;
const TTL_1H = 60 * 60;

/**
 * Read the last N lines of a file efficiently.
 * Reads from end in chunks to avoid loading the entire file.
 */
function readLastLines(filePath: string, maxLines: number): string[] {
  let content: string;
  try {
    const stats = require("fs").statSync(filePath);
    const fileSize = stats.size;
    // Read last 256KB or whole file if smaller
    const readSize = Math.min(fileSize, 256 * 1024);
    const buffer = Buffer.alloc(readSize);
    const fd = require("fs").openSync(filePath, "r");
    require("fs").readSync(fd, buffer, 0, readSize, fileSize - readSize);
    require("fs").closeSync(fd);
    content = buffer.toString("utf-8");
  } catch {
    return [];
  }

  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(-maxLines);
}

/**
 * Compute cache TTL status from the session JSONL transcript.
 *
 * Strategy:
 * 1. Read last ~100 lines of the JSONL
 * 2. Scan backwards for the most recent entry with cache_creation_input_tokens > 0
 * 3. Determine TTL tier from cache_creation.ephemeral_5m vs ephemeral_1h
 * 4. Compute remaining = (write_timestamp + TTL) - now
 */
export function getCacheTTL(
  transcriptPath: string | undefined,
  currentCacheRead: number
): CacheTTLResult {
  const noData: CacheTTLResult = {
    remainingSeconds: -1,
    tier: "none",
    lastWriteTime: null,
    cacheReadActive: currentCacheRead > 0,
  };

  if (!transcriptPath) return noData;

  const lines = readLastLines(transcriptPath, 100);
  if (lines.length === 0) return noData;

  // Scan backwards for last cache write
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry: JournalEntry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }

    const usage = entry.message?.usage;
    if (!usage || !usage.cache_creation_input_tokens || usage.cache_creation_input_tokens <= 0) {
      continue;
    }

    const timestamp = entry.timestamp;
    if (!timestamp) continue;

    // Determine TTL tier
    const creation = usage.cache_creation;
    const is1h = (creation?.ephemeral_1h_input_tokens ?? 0) > 0;
    const is5m = (creation?.ephemeral_5m_input_tokens ?? 0) > 0;

    let ttlSeconds: number;
    let tier: "5m" | "1h";

    if (is1h) {
      ttlSeconds = TTL_1H;
      tier = "1h";
    } else if (is5m) {
      ttlSeconds = TTL_5M;
      tier = "5m";
    } else {
      // Has cache_creation tokens but no tier breakdown — assume 5m
      ttlSeconds = TTL_5M;
      tier = "5m";
    }

    const writeTime = new Date(timestamp).getTime();
    const now = Date.now();
    const elapsed = (now - writeTime) / 1000;
    const remaining = Math.max(0, ttlSeconds - elapsed);

    return {
      remainingSeconds: Math.round(remaining),
      tier,
      lastWriteTime: timestamp,
      cacheReadActive: currentCacheRead > 0,
    };
  }

  return noData;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd C:/git/ClaudeCacheTTLStatusLine && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/cache.ts
git commit -m "feat: cache TTL computation from session JSONL transcript

Reads transcript backwards, finds last cache write, determines
5m vs 1h tier, computes remaining seconds.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Segment Formatters

**Files:**
- Create: `src/segments.ts`

- [ ] **Step 1: Create src/segments.ts**

Each segment function takes typed data and returns a formatted string.

```typescript
import { green, yellow, red, cyan, dim, bold } from "./colors.js";
import type { CacheTTLResult } from "./cache.js";

/**
 * Format cache TTL as a countdown with color coding.
 *
 * States:
 *   ◆ Cache 3:42    (green, >2min remaining)
 *   ◆ Cache 1:30    (yellow, 1-2min)
 *   ◆ Cache 0:42    (red, <1min)
 *   ○ Cache expired  (dim gray)
 *   ◇ Cache 45:12   (cyan, 1h tier)
 */
export function formatCache(cache: CacheTTLResult): string {
  if (cache.tier === "none" && !cache.cacheReadActive) {
    return dim("○ No cache");
  }

  if (cache.remainingSeconds <= 0) {
    return dim("○ Cache expired");
  }

  const mins = Math.floor(cache.remainingSeconds / 60);
  const secs = cache.remainingSeconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  if (cache.tier === "1h") {
    return cyan(`◇ Cache ${timeStr}`);
  }

  if (cache.remainingSeconds > 120) {
    return green(`◆ Cache ${timeStr}`);
  }
  if (cache.remainingSeconds > 60) {
    return yellow(`◆ Cache ${timeStr}`);
  }
  return red(`◆ Cache ${timeStr}`);
}

/**
 * Format model display name.
 */
export function formatModel(model: { id?: string; display_name?: string }): string {
  return model.display_name ?? model.id ?? "unknown";
}

/**
 * Format session cost.
 */
export function formatCost(totalCostUsd: number | undefined): string {
  if (totalCostUsd === undefined || totalCostUsd === null) return "$0.00";
  return `$${totalCostUsd.toFixed(2)}`;
}

/**
 * Format context window usage as a progress bar + percentage.
 * Bar is 8 characters wide using block elements.
 */
export function formatContext(
  usedPercentage: number | undefined | null,
  contextWindowSize: number | undefined
): string {
  const pct = usedPercentage ?? 0;
  const barWidth = 8;
  const filled = Math.round((pct / 100) * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  let colorFn = green;
  if (pct > 80) colorFn = red;
  else if (pct > 60) colorFn = yellow;

  return `${colorFn(bar)} ${Math.round(pct)}%`;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd C:/git/ClaudeCacheTTLStatusLine && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/segments.ts
git commit -m "feat: statusline segment formatters (cache, model, cost, context)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Entry Point — Stdin Reader & Output

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create src/index.ts**

```typescript
import { getCacheTTL } from "./cache.js";
import { formatCache, formatModel, formatCost, formatContext } from "./segments.js";
import { dim } from "./colors.js";

interface StatusLinePayload {
  model?: {
    id?: string;
    display_name?: string;
  };
  cost?: {
    total_cost_usd?: number;
  };
  context_window?: {
    used_percentage?: number | null;
    context_window_size?: number;
    current_usage?: {
      cache_read_input_tokens?: number;
    };
  };
  transcript_path?: string;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
    // Timeout after 1 second if no data
    setTimeout(() => resolve(Buffer.concat(chunks).toString("utf-8")), 1000);
  });
}

async function main(): Promise<void> {
  const input = await readStdin();
  if (!input.trim()) {
    process.stdout.write("○ No data\n");
    return;
  }

  let payload: StatusLinePayload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.stdout.write("○ Parse error\n");
    return;
  }

  const cacheRead = payload.context_window?.current_usage?.cache_read_input_tokens ?? 0;
  const cache = getCacheTTL(payload.transcript_path, cacheRead);

  const segments = [
    formatCache(cache),
    formatModel(payload.model ?? {}),
    formatCost(payload.cost?.total_cost_usd),
    formatContext(
      payload.context_window?.used_percentage,
      payload.context_window?.context_window_size
    ),
  ];

  process.stdout.write(segments.join(dim(" | ")) + "\n");
}

main().catch(() => {
  process.stdout.write("○ Error\n");
});
```

- [ ] **Step 2: Build the project**

Run: `cd C:/git/ClaudeCacheTTLStatusLine && npm run build`
Expected: `dist/index.js`, `dist/cache.js`, `dist/segments.js`, `dist/colors.js` created with no errors.

- [ ] **Step 3: Smoke test with mock data**

Run:
```bash
echo '{"model":{"id":"claude-opus-4-6","display_name":"Opus"},"cost":{"total_cost_usd":0.45},"context_window":{"used_percentage":48,"context_window_size":200000,"current_usage":{"cache_read_input_tokens":5000}}}' | node dist/index.js
```
Expected: Output like `○ No cache | Opus | $0.45 | ████░░░░ 48%` (no transcript_path so cache shows no data).

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: statusline entry point — reads stdin, outputs formatted segments

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Plugin Manifest & Setup Skill

**Files:**
- Create: `plugin.json`
- Create: `skills/setup/SKILL.md`

- [ ] **Step 1: Create plugin.json**

```json
{
  "name": "cache-ttl-statusline",
  "version": "0.1.0",
  "description": "StatusLine showing cache TTL countdown, model, cost, and context usage for Claude Code",
  "author": {
    "name": "JD"
  },
  "skills": "skills/"
}
```

- [ ] **Step 2: Create skills/setup/SKILL.md**

```markdown
---
name: setup
description: Configure the cache TTL statusline in Claude Code settings
---

# Setup Cache TTL StatusLine

Add this to your Claude Code settings (`~/.claude/settings.json` or `.claude/settings.json`):

\`\`\`json
{
  "statusLine": {
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_ROOT}/dist/index.js"
  }
}
\`\`\`

Or if installed standalone (not as plugin), use the absolute path:

\`\`\`json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/ClaudeCacheTTLStatusLine/dist/index.js"
  }
}
\`\`\`

After adding, restart Claude Code. The statusline will show:

- **Cache TTL countdown** — green/yellow/red timer, or "expired" when cache is cold
- **Model name** — current model in use
- **Session cost** — running USD total
- **Context usage** — visual bar with percentage
```

- [ ] **Step 3: Commit**

```bash
git add plugin.json skills/
git commit -m "feat: plugin manifest and setup skill

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Integration Test with Live Session Data

**Files:** None created — this is a verification task.

- [ ] **Step 1: Test against the real JSONL from this session**

Run:
```bash
echo '{"model":{"id":"claude-opus-4-6","display_name":"Opus"},"cost":{"total_cost_usd":0.45},"context_window":{"used_percentage":48,"context_window_size":200000,"current_usage":{"cache_read_input_tokens":50000}},"transcript_path":"'$HOME'/.claude/projects/C--git-ClaudeCacheTTLStatusLine/a6469134-96e9-46e0-a5d7-ba9d8017ff01.jsonl"}' | node dist/index.js
```

Expected: Output showing a cache TTL countdown (since this session has real cache writes in the JSONL), model, cost, and context bar.

- [ ] **Step 2: Test with no transcript path (graceful fallback)**

Run:
```bash
echo '{"model":{"display_name":"Haiku"},"cost":{"total_cost_usd":0.01},"context_window":{"used_percentage":5}}' | node dist/index.js
```

Expected: `○ No cache | Haiku | $0.01 | ░░░░░░░░ 5%`

- [ ] **Step 3: Test with empty stdin**

Run:
```bash
echo '' | node dist/index.js
```

Expected: `○ No data`

- [ ] **Step 4: Commit all remaining files and tag**

```bash
git add .
git commit -m "chore: complete v0.1.0 — cache TTL statusline plugin

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Post-Implementation

After all tasks pass, configure the statusline in this project's settings to dog-food it:

```json
// .claude/settings.local.json
{
  "statusLine": {
    "type": "command",
    "command": "node C:/git/ClaudeCacheTTLStatusLine/dist/index.js"
  }
}
```
