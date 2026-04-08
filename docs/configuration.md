# Configuration Guide

This guide covers every way to configure Claude StatusLine Widgets: via the interactive TUI, the settings file, and environment variables.

---

## Interactive TUI

The TUI is the recommended way to configure the statusline. Launch it with:

```bash
ccfooter-config
# or without a global install:
node dist/index.js
```

![TUI configurator](images/tui-preview.svg)

### Screens

| Screen | What it does |
|--------|-------------|
| **Main Menu** | Entry point — choose a line to edit, add/remove lines, reset, or quit |
| **Line Editor** | Reorder, add, or remove widgets on a specific line |
| **Widget Picker** | Browse the full widget catalogue, grouped by category |
| **Color Menu** | Set a per-widget ANSI colour |

### Keyboard shortcuts

| Context | Key | Action |
|---------|-----|--------|
| Global | `Ctrl+S` | Save settings |
| Global | `Ctrl+C` | Quit without saving |
| Line Editor | `a` | Add a widget |
| Line Editor | `d` / `Delete` | Remove selected widget |
| Line Editor | `m` | Toggle move mode (reorder with ↑/↓) |
| Line Editor | `x` | Delete the entire line |
| Line Editor | `Esc` | Go back to Main Menu |
| Line Selector | `a` | Add a new line |
| Widget Picker | Arrow keys | Navigate |
| Widget Picker | `Enter` | Select widget |
| Widget Picker | `Esc` | Cancel |
| Color Menu | Arrow keys | Navigate colours |
| Color Menu | `Enter` | Apply colour |
| Color Menu | `Esc` | Cancel |

The **Live Preview** at the bottom of the screen updates instantly as you make changes.

---

## Settings File

Settings are stored at:

```
~/.config/claude-statusline-widgets/settings.json
```

You can edit this file directly. Delete it to reset to defaults.

### Schema

```ts
{
  "version": 1,
  "lines": WidgetItemConfig[][]   // array of lines; each line is an array of widgets
}
```

### `WidgetItemConfig`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Unique widget instance ID (any string) |
| `type` | `string` | ✓ | Widget type key (see [Widget Reference](widgets.md)) |
| `color` | `string` | — | Override colour (`"red"`, `"green"`, `"yellow"`, `"cyan"`, `"blue"`, `"magenta"`, `"white"`, `"default"`) |
| `bold` | `boolean` | — | Render text bold |
| `rawValue` | `boolean` | — | Skip ANSI colour codes (useful for scripts) |
| `customText` | `string` | — | Static text string (only used by `custom-text` widget) |

### Default settings

```json
{
  "version": 1,
  "lines": [
    [
      { "id": "1",  "type": "path" },
      { "id": "2",  "type": "separator" },
      { "id": "3",  "type": "branch" },
      { "id": "4",  "type": "separator" },
      { "id": "5",  "type": "model" },
      { "id": "6",  "type": "separator" },
      { "id": "7",  "type": "cost" },
      { "id": "8",  "type": "separator" },
      { "id": "9",  "type": "context-bar" },
      { "id": "10", "type": "separator" },
      { "id": "11", "type": "cache-ttl" }
    ],
    [
      { "id": "12", "type": "usage-5h" },
      { "id": "13", "type": "separator" },
      { "id": "14", "type": "usage-7d" },
      { "id": "15", "type": "separator" },
      { "id": "16", "type": "usage-overage" }
    ],
    [
      { "id": "17", "type": "headroom-tokens" },
      { "id": "18", "type": "separator" },
      { "id": "19", "type": "headroom-compression" },
      { "id": "20", "type": "separator" },
      { "id": "21", "type": "headroom-cost" },
      { "id": "22", "type": "separator" },
      { "id": "23", "type": "headroom-cache-hit" }
    ]
  ]
}
```

### Example: minimal one-line layout

```json
{
  "version": 1,
  "lines": [
    [
      { "id": "1", "type": "model" },
      { "id": "2", "type": "separator" },
      { "id": "3", "type": "cost" },
      { "id": "4", "type": "separator" },
      { "id": "5", "type": "context-bar" }
    ]
  ]
}
```

### Example: coloured model widget

```json
{ "id": "5", "type": "model", "color": "cyan", "bold": true }
```

### Example: custom label

```json
{ "id": "99", "type": "custom-text", "customText": "🚀 dev" }
```

---

## Environment Variables

| Variable | Effect |
|----------|--------|
| `ANTHROPIC_BASE_URL` | When set to `http://127.0.0.1:8787` (or any `localhost:8787` URL), activates Headroom proxy widgets |
| `CLAUDE_CONFIG_DIR` | Overrides the directory where Claude stores its settings and credentials (default: `~/.claude`) |

---

## Plugin Registration

The plugin self-registers its `statusLine` command in `~/.claude/settings.json` when installed via the marketplace.  For a manual installation, add:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/ClaudeStatusLineWidgets/dist/index.js"
  }
}
```

Restart Claude Code after editing `settings.json`.

---

## Resetting

To restore the default 3-line layout:

1. Run `ccfooter-config` → **Reset to Defaults** in the Main Menu, **or**
2. Delete the settings file:

```bash
rm ~/.config/claude-statusline-widgets/settings.json
```
