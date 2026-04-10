# Widget Reference

Claude StatusLine Widgets now includes **62 built-in widgets** across seven categories. Several widgets also support **display variants**, so the same data can be rendered as a compact number, percentage, badge, countdown, or progress bar depending on what reads best in your layout.

---

## Session

Session widgets surface metadata Claude Code already knows about the current run:

- `path` — current working directory
- `branch` — active Git branch
- `model` — Claude model display name
- `cost` — current session cost in USD
- `session-id` — current Claude Code session identifier
- `version` — Claude Code version
- `output-style` — active output style name
- `session-clock` — current local time
- `session-elapsed` — elapsed time since the transcript began
- `account-email` — signed-in account email when it can be discovered locally
- `thinking-effort` — effort / thinking metadata when present in the payload
- `vim-mode` — current vim mode when present in the payload
- `skills` — active skill count or list

### Skills variants

- `count` — badge-style count
- `list` — comma-separated names

---

## Context

Context widgets focus on prompt budget and cache behavior:

- `context-bar` — context usage with variants
- `context-percent` — dedicated context percentage widget with variants
- `context-length` — maximum context window size
- `cache-ttl` — cache expiry with variants
- `cache-tokens` — cache read/write/break stats for the session

### Context variants

Available on `context-bar` and `context-percent`:

- `bar` — colorized progress bar
- `percent` — used percentage
- `remaining` — remaining percentage

### Cache TTL variants

- `time` — expiry timestamp
- `countdown` — time remaining
- `badge` — short status badge

---

## Usage

Usage widgets read the cached Anthropic usage data and reset timestamps:

- `usage-5h` — 5-hour usage
- `usage-7d` — 7-day usage
- `usage-overage` — overage spend
- `usage-reset-5h` — 5-hour reset countdown
- `usage-reset-7d` — 7-day reset countdown

### Usage variants

- `usage-5h`, `usage-7d`: `bar`, `percent`, `countdown`
- `usage-overage`: `bar`, `percent`

---

## Tokens

Token widgets use the richer statusline payload plus derived runtime data:

- `tokens-input` — total input tokens
- `tokens-output` — total output tokens
- `tokens-total` — combined input/output/cache tokens
- `input-speed` — average input tokens per second
- `output-speed` — average output tokens per second
- `total-speed` — average total tokens per second

---

## Git

Git widgets are derived from the current working tree instead of relying on the payload alone:

- `git-status`
- `git-changes`
- `git-staged`
- `git-unstaged`
- `git-untracked`
- `git-ahead-behind`
- `git-conflicts`
- `git-sha`
- `git-root`
- `git-insertions`
- `git-deletions`
- `git-origin-owner`
- `git-origin-repo`
- `git-origin-owner-repo`
- `git-upstream-owner`
- `git-upstream-repo`
- `git-upstream-owner-repo`
- `git-is-fork`
- `git-worktree-mode`
- `git-worktree-name`
- `git-worktree-branch`
- `git-worktree-original-branch`

These widgets automatically hide when Git data is unavailable.

---

## Headroom

Headroom widgets are shown when `ANTHROPIC_BASE_URL` points at a local Headroom instance:

- `headroom-tokens`
- `headroom-compression`
- `headroom-cost`
- `headroom-cache-hit`

---

## Environment

- `terminal-width` — detected terminal columns
- `memory-usage` — used / total system memory

---

## Layout and custom content

- `separator` — dim ` | ` separator
- `custom-text` — static text from `customText`
- `custom-symbol` — static symbol or emoji
- `link` — OSC 8 hyperlink using `options.url`
- `custom-command` — shell command output using `options.command`

### Common custom-widget fields

```json
{ "id": "1", "type": "custom-text", "customText": "deploy" }
{ "id": "2", "type": "custom-symbol", "customText": "⚡" }
{ "id": "3", "type": "link", "customText": "docs", "options": { "url": "https://example.com" } }
{ "id": "4", "type": "custom-command", "options": { "command": "git rev-parse --short HEAD", "timeoutMs": 1000 } }
```

---

## Variants in the TUI

When a widget supports more than one display style, the line editor shows the active variant beside the widget name. Press **`v`** to cycle through the available variants.
