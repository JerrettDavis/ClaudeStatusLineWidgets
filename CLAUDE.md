# Claude StatusLine Widgets

Configurable statusline plugin for Claude Code with interactive TUI.

## Build
npm run build

## Test piped mode (statusline rendering)
echo '{"model":{"id":"claude-opus-4-6","display_name":"Opus"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":45,"context_window_size":200000},"transcript_path":"path/to/session.jsonl"}' | node dist/index.js

## Launch TUI configurator
node dist/index.js

## Architecture
- src/index.ts — entry point: TTY → TUI, piped → render statusline
- src/renderer.ts — settings-driven multi-line renderer using widget registry
- src/widgets/ — widget type system, registry, and 15 widget implementations
- src/config/ — settings schema + load/save to ~/.config/claude-statusline-widgets/settings.json
- src/tui/ — React/Ink interactive configurator (add/remove/reorder widgets, colors, preview)
- src/cache.ts — reads JSONL transcript, finds last cache write, computes TTL
- src/segments.ts — low-level formatters for each statusline segment
- src/colors.ts — ANSI color/style helpers
- src/usage.ts — background API usage fetcher with file-based caching
- src/headroom.ts — Headroom compression proxy stats integration

## Commit Format
Use Conventional Commits — see [CONTRIBUTING.md](CONTRIBUTING.md). Every merge to `main` is a release; `feat:` bumps minor, `fix:` bumps patch, `feat!:` bumps major. `chore:`, `docs:`, `ci:`, `refactor:` do not trigger a release. Never edit version numbers manually.
