# Widget Reference

Claude StatusLine Widgets ships with 16 built-in widgets organized into five categories. All widgets integrate with the [interactive TUI configurator](configuration.md) and can be arranged in any order across any number of lines.

---

## Session

Widgets that reflect the current Claude Code session.

### `path` — Working Directory

Displays the current working directory.  Uses `~/` short form when inside your home directory.

**Example output**
```
~/projects/my-app
```

In the default layout it appears as the first item on Line 1.

---

### `branch` — Git Branch

Displays the active git branch reported by Claude Code.  Returns `null` (hidden) when no branch is available.

**Example output**
```
main
feat/add-widgets
```

---

### `model` — Claude Model

Displays the name of the Claude model currently in use (e.g. `Opus`, `Sonnet`, `Haiku`).

**Example output**
```
Opus
Sonnet
```

Supports per-widget color overrides via the TUI or settings file.

---

### `cost` — Session Cost

Running dollar cost of the current session.

**Example output**
```
$0.45
$0.00
```

---

## Context

Widgets related to the context window and prompt cache.

### `context-bar` — Context Window Bar

A compact progress bar showing how much of the context window is in use, followed by the percentage.

```
████░░░░ 45%   (green  — < 60 %)
████████ 72%   (yellow — 60–80 %)
████████ 88%   (red    — > 80 %)
```

![Context bar states](images/statusline-context-high.svg)

---

### `cache-ttl` — Cache TTL Countdown

Shows the expiry time of the most recent prompt-cache write, color-coded by urgency.

| Colour | Condition |
|--------|-----------|
| Green  | > 2 minutes remaining (5 min tier) |
| Yellow | 1–2 minutes remaining |
| Red    | < 1 minute remaining |
| Cyan   | 1-hour cache tier active |
| Dim    | Cache expired or not present |

![Cache states](images/statusline-cache-states.svg)

---

### `cache-tokens` — Cache Token Count

Shows the cumulative number of cache-read tokens for the current session.  Hidden when the count is zero.

**Example output**
```
↩ 45k cached
```

---

## Usage

Widgets that display Anthropic API rate-limit utilization.  Data is fetched in a background process every 60 seconds and requires a valid OAuth session (`~/.claude/.credentials.json`).

### `usage-5h` — 5-hour Rate Limit

```
5h ██░░░ 35%
```

### `usage-7d` — 7-day Rate Limit

```
7d █░░░░ 20%
```

### `usage-overage` — Overage Spend

Shows extra monthly spend if the overage feature is enabled on your account.

```
+$5/$20 █░░░░ 25%
```

![Usage line](images/statusline-usage.svg)

---

## Headroom

Widgets for the [Headroom](https://github.com/nicepkg/claude-code-headroom) compression proxy.  All four widgets return `null` (hidden) unless `ANTHROPIC_BASE_URL` points to a running Headroom instance on `localhost:8787`.

### `headroom-tokens` — Tokens Saved

```
⚖️ 491k tokens saved
```

### `headroom-compression` — Compression Ratio

```
34% compressed
```

### `headroom-cost` — Cost Saved

```
$0.12 saved
```

### `headroom-cache-hit` — Cache Hit Rate

```
78% cache hit
```

![Headroom line](images/statusline-headroom.svg)

---

## Layout

Utility widgets for visual organisation.

### `separator` — Separator

Inserts a dim ` | ` between adjacent widgets.  Separators adjacent to hidden (`null`) widgets are automatically suppressed so you never see `| |` or a leading/trailing pipe.

### `custom-text` — Custom Text

Displays a static string you define in the settings file via the `customText` field.

```json
{ "id": "42", "type": "custom-text", "customText": "🚀 dev" }
```

---

## Adding & Removing Widgets

### Via the TUI

```bash
ccfooter-config
```

Select a line → press **`a`** to add a widget → choose from the picker.  Press **`d`** or **`Delete`** to remove the selected widget.

### Via the settings file

Edit `~/.config/claude-statusline-widgets/settings.json` directly.  Each line is an array of widget objects.  See the [Configuration guide](configuration.md) for the full schema.
