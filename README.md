# Claude StatusLine Widgets

A TypeScript statusline plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that displays real-time session metrics directly in your terminal.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## What It Shows

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

## Quick Start

### As a Claude Code Plugin

```bash
# Install the plugin
claude plugin add /path/to/ClaudeStatusLineWidgets

# Or link from a git clone
git clone https://github.com/JerrettDavis/ClaudeStatusLineWidgets.git
claude plugin add ./ClaudeStatusLineWidgets
```

### Standalone

```bash
git clone https://github.com/JerrettDavis/ClaudeStatusLineWidgets.git
cd ClaudeStatusLineWidgets
npm install
npm run build
```

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/ClaudeStatusLineWidgets/dist/index.js"
  }
}
```

## How It Works

Claude Code pipes a JSON payload to the statusline command via stdin on each render cycle. This plugin:

1. **Parses the payload** for model, cost, context window, and transcript path
2. **Reads the session transcript** (JSONL) backwards to find the last cache write event
3. **Determines TTL tier** -- Anthropic's API uses 5-minute and 1-hour cache tiers
4. **Computes remaining time** and formats it with color-coded ANSI output
5. **Fetches API usage data** in a background process (non-blocking) to show rate limits
6. **Optionally shows Headroom proxy stats** if running through the compression proxy

### Cache TTL Color Coding

| Color  | Meaning                        |
|--------|--------------------------------|
| Green  | > 2 minutes remaining (5m tier)|
| Yellow | 1-2 minutes remaining          |
| Red    | < 1 minute remaining           |
| Cyan   | 1-hour tier cache active       |
| Dim    | Cache expired or not present   |

## Architecture

```
src/
  index.ts      -- Entry point: reads stdin JSON, orchestrates output
  cache.ts      -- Reads JSONL transcript, finds last cache write, computes TTL
  segments.ts   -- Formatters for each statusline segment
  colors.ts     -- ANSI color/style helpers
  usage.ts      -- Background API usage fetcher with file-based caching
  headroom.ts   -- Headroom compression proxy stats integration
```

## Development

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode

# Test with mock data
echo '{"model":{"id":"claude-opus-4-6","display_name":"Opus"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":45,"context_window_size":200000},"transcript_path":"path/to/session.jsonl"}' | node dist/index.js
```

## License

MIT
