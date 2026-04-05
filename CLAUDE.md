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
