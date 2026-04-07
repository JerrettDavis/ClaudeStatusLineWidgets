# Claude StatusLine Widgets

A configurable statusline plugin marketplace for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that displays real-time session metrics in your terminal. Comes with an interactive TUI for visual configuration.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Installation

### From the Marketplace (recommended)

Inside a Claude Code session:

```
/plugin marketplace add JerrettDavis/ClaudeStatusLineWidgets
/plugin install cache-ttl-statusline@claude-statusline-widgets
```

Or from the CLI:

```bash
claude plugin marketplace add JerrettDavis/ClaudeStatusLineWidgets
claude plugin install cache-ttl-statusline@claude-statusline-widgets
```

### Standalone (without marketplace)

```bash
git clone https://github.com/JerrettDavis/ClaudeStatusLineWidgets.git
cd ClaudeStatusLineWidgets
npm install
npm run build
```

Then add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/ClaudeStatusLineWidgets/dist/index.js"
  }
}
```

Restart Claude Code. The statusline appears at the bottom of your terminal.

## Configuration

### Interactive TUI

Run the binary directly (not piped) to launch the TUI configurator:

```bash
node /path/to/ClaudeStatusLineWidgets/dist/index.js
```

The TUI provides:

- **Edit Lines** -- choose which widgets appear on each line, add/remove/reorder them
- **Edit Colors** -- set per-widget colors from the ANSI color palette
- **Live Preview** -- see your statusline update in real-time as you make changes
- **Reset to Defaults** -- restore the original 3-line layout

#### TUI Keyboard Shortcuts

| Context | Key | Action |
|---------|-----|--------|
| Global | `Ctrl+S` | Save settings |
| Global | `Ctrl+C` | Quit |
| Line Editor | `a` | Add a widget |
| Line Editor | `d` / `Delete` | Remove selected widget |
| Line Editor | `m` | Toggle move mode (reorder with arrow keys) |
| Line Editor | `x` | Delete entire line |
| Line Editor | `Esc` | Go back |
| Line Selector | `a` | Add a new line |
| Widget Picker | Arrow keys | Navigate widgets |
| Widget Picker | `Enter` | Select widget to add |
| Widget Picker | `Esc` | Cancel |

### Settings File

Settings are saved to `~/.config/claude-statusline-widgets/settings.json`. You can also edit this file directly. Example:

```json
{
  "version": 1,
  "lines": [
    [
      { "id": "1", "type": "model" },
      { "id": "2", "type": "separator" },
      { "id": "3", "type": "cost" },
      { "id": "4", "type": "separator" },
      { "id": "5", "type": "context-bar" },
      { "id": "6", "type": "separator" },
      { "id": "7", "type": "cache-ttl" }
    ],
    [
      { "id": "8", "type": "usage-5h" },
      { "id": "9", "type": "separator" },
      { "id": "10", "type": "usage-7d" }
    ]
  ]
}
```

Delete the file to reset to defaults.

## Default Layout

Out of the box, the statusline displays three lines:

**Line 1 -- Session Info**

```
/home/user/project | main | Opus | $0.45 | ████████ 72% | ⛓️ @ 3:42p
```

- Working directory and git branch
- Model name (Opus, Sonnet, Haiku, etc.)
- Running session cost in USD
- Context window usage (color-coded progress bar)
- Cache TTL countdown with expiry time

**Line 2 -- API Usage** *(shown when data is available)*

```
5h ██░░░ 35% | 7d █░░░░ 20% | +$5/$20 █░░░░ 25%
```

- 5-hour rate limit utilization
- 7-day rate limit utilization
- Overage spend tracking (if enabled)

**Line 3 -- Headroom Proxy** *(shown when proxy is active)*

```
⚖️ 491k tokens saved | 34% compressed | $0.12 saved | 78% cache hit
```

- Tokens saved by compression
- Compression percentage
- Cost savings
- Prefix cache hit rate

## Available Widgets

| Category | Type | Name | Description |
|----------|------|------|-------------|
| Session | `path` | Path | Working directory |
| Session | `branch` | Branch | Git branch name |
| Session | `model` | Model | Claude model name |
| Session | `cost` | Cost | Session cost in USD |
| Context | `context-bar` | Context Bar | Context window usage with progress bar |
| Context | `cache-ttl` | Cache TTL | Cache expiry countdown with color coding |
| Usage | `usage-5h` | 5h Usage | 5-hour rate limit utilization |
| Usage | `usage-7d` | 7d Usage | 7-day rate limit utilization |
| Usage | `usage-overage` | Overage | Extra usage / overage spend |
| Headroom | `headroom-tokens` | Tokens Saved | Headroom tokens saved count |
| Headroom | `headroom-compression` | Compression | Headroom compression percentage |
| Headroom | `headroom-cost` | Cost Saved | Headroom cost savings |
| Headroom | `headroom-cache-hit` | Cache Hit Rate | Headroom prefix cache hit rate |
| Layout | `separator` | Separator | Dim ` | ` between widgets |
| Layout | `custom-text` | Custom Text | Static text (set via `customText` field) |

### Cache TTL Color Coding

| Color | Meaning |
|-------|---------|
| Green | > 2 minutes remaining (5m tier) |
| Yellow | 1--2 minutes remaining |
| Red | < 1 minute remaining |
| Cyan | 1-hour tier cache active |
| Dim | Cache expired or not present |

## How It Works

Claude Code pipes a JSON payload to the statusline command via stdin on each render cycle. This plugin:

1. **Loads your settings** from `~/.config/claude-statusline-widgets/settings.json` (falls back to defaults)
2. **Parses the payload** for model, cost, context window, transcript path, and git info
3. **Renders each widget** in your configured layout via the widget registry
4. **Reads the session transcript** (JSONL) backwards to find the last cache write for TTL
5. **Fetches API usage data** in a detached background process (non-blocking, cached 60s)
6. **Shows Headroom proxy stats** if `ANTHROPIC_BASE_URL` points to localhost:8787

When run interactively (stdin is a TTY), it launches the React/Ink TUI configurator instead.

## Architecture

```
.claude-plugin/
  marketplace.json  -- Marketplace catalog
  plugin.json       -- Plugin manifest

src/
  index.ts          -- Entry point: TTY detection (TUI vs render mode)
  renderer.ts       -- Settings-driven multi-line renderer
  cache.ts          -- JSONL transcript parsing, TTL computation
  segments.ts       -- Low-level formatters for each segment type
  colors.ts         -- ANSI color/style helpers
  usage.ts          -- Background API usage fetcher with file-based caching
  headroom.ts       -- Headroom compression proxy stats integration

  widgets/
    types.ts        -- Widget interface, WidgetItem config, RenderContext
    registry.ts     -- Widget manifest and factory registry
    *.ts            -- One file per widget implementation

  config/
    schema.ts       -- Settings type, defaults, validation
    loader.ts       -- Load/save settings, config path, migrations

  tui/
    index.tsx       -- TUI entry point (runTUI)
    app.tsx         -- Main app with screen router and preview
    components/     -- MainMenu, LineSelector, ItemsEditor,
                       WidgetPicker, ColorMenu
```

## Development

```bash
npm install
npm run build        # Compile TypeScript
npm run dev          # Watch mode

# Test render mode with mock data
echo '{"model":{"display_name":"Opus"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":45},"git_branch":"main","cwd":"/home/user/project"}' | node dist/index.js

# Launch TUI configurator
node dist/index.js
```

## License

MIT
