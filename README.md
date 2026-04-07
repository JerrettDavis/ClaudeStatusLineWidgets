# Claude StatusLine Widgets

A plugin marketplace for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) statusline widgets that display real-time session metrics directly in your terminal.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Installation

### From the Marketplace

```bash
# Add the marketplace
/plugin marketplace add JerrettDavis/ClaudeStatusLineWidgets

# Install the statusline plugin
/plugin install cache-ttl-statusline@claude-statusline-widgets
```

### From CLI

```bash
claude plugin marketplace add JerrettDavis/ClaudeStatusLineWidgets
claude plugin install cache-ttl-statusline@claude-statusline-widgets
```

## Configuration

Run the statusline binary directly (not piped) to launch the interactive TUI configurator:

```bash
node dist/index.js
```

The TUI lets you:
- **Edit Lines** -- choose which widgets appear on each line, add/remove/reorder
- **Edit Colors** -- set per-widget colors from the ANSI palette
- **Live Preview** -- see changes in real-time before saving
- **Reset** -- restore the default layout

Settings are saved to `~/.config/claude-statusline-widgets/settings.json`.

## Available Plugins

### cache-ttl-statusline

A multi-line statusline showing real-time session metrics.

**Line 1 -- Session Info**
- Working directory and git branch
- Model name (Opus, Sonnet, Haiku, etc.)
- Running session cost in USD
- Context window usage (color-coded progress bar)
- Cache TTL countdown with expiry time

**Line 2 -- API Usage** *(when available)*
- 5-hour rate limit utilization
- 7-day rate limit utilization
- Overage spend tracking (if enabled)

**Line 3 -- Headroom Proxy** *(optional)*
- Token compression percentage
- Tokens saved count
- Cost savings from compression
- Cache hit rate

### Cache TTL Color Coding

| Color  | Meaning                        |
|--------|--------------------------------|
| Green  | > 2 minutes remaining (5m tier)|
| Yellow | 1-2 minutes remaining          |
| Red    | < 1 minute remaining           |
| Cyan   | 1-hour tier cache active       |
| Dim    | Cache expired or not present   |

## How It Works

Claude Code pipes a JSON payload to the statusline command via stdin on each render cycle. This plugin:

1. **Parses the payload** for model, cost, context window, and transcript path
2. **Reads the session transcript** (JSONL) backwards to find the last cache write event
3. **Determines TTL tier** -- Anthropic's API uses 5-minute and 1-hour cache tiers
4. **Computes remaining time** and formats it with color-coded ANSI output
5. **Fetches API usage data** in a background process (non-blocking) to show rate limits
6. **Optionally shows Headroom proxy stats** if running through the compression proxy

### Available Widgets

| Category | Widget | Description |
|----------|--------|-------------|
| Session | Path, Branch, Model, Cost | Working directory, git branch, model name, session cost |
| Context | Context Bar, Cache TTL | Context window usage bar, cache expiry countdown |
| Usage | 5h Usage, 7d Usage, Overage | API rate limit utilization and overage tracking |
| Headroom | Tokens Saved, Compression, Cost Saved, Cache Hit Rate | Headroom proxy metrics |
| Layout | Separator, Custom Text | Visual separator and static text |

## Architecture

```
.claude-plugin/
  marketplace.json  -- Marketplace catalog listing available plugins
  plugin.json       -- Plugin manifest for cache-ttl-statusline
src/
  index.ts          -- Entry point: TTY detection (TUI vs render mode)
  renderer.ts       -- Settings-driven multi-line renderer
  cache.ts          -- JSONL transcript parsing, TTL computation
  segments.ts       -- Low-level formatters for each segment
  colors.ts         -- ANSI color/style helpers
  usage.ts          -- Background API usage fetcher
  headroom.ts       -- Headroom compression proxy stats
  widgets/          -- Widget type system, registry, and implementations
  config/           -- Settings schema, load/save, migrations
  tui/              -- React/Ink interactive configurator
```

## Development

```bash
npm install
npm run build        # Compile TypeScript
npm run dev          # Watch mode

# Test with mock data
echo '{"model":{"id":"claude-opus-4-6","display_name":"Opus"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":45,"context_window_size":200000},"transcript_path":"path/to/session.jsonl"}' | node dist/index.js
```

## Standalone Usage

If you prefer not to use the marketplace, you can configure the statusline directly in your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/ClaudeStatusLineWidgets/dist/index.js"
  }
}
```

## License

MIT
