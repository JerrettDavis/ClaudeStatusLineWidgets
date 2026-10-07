# Claude StatusLine Widgets

A configurable native **Claude Code Mod** that owns the status line below the prompt and displays real-time session metrics — model, cost, context window, cache TTL, API usage, git state, Headroom stats, and more. The existing 62-widget renderer and interactive TUI remain intact; the Mod replaces the old settings-file statusLine bootstrap.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## What it looks like

![Full default layout](docs/images/statusline-full.svg)

The default layout renders three lines below your Claude Code prompt:

| Line | Content |
|------|---------|
| **1 — Session** | Working directory · git branch · model · cost · context bar · cache TTL |
| **2 — Usage** | 5-hour and 7-day rate-limit bars · overage spend *(hidden when unavailable)* |
| **3 — Headroom** | Tokens saved · compression % · cost saved · cache hit rate *(hidden unless proxy is active)* |

### Context window color coding

The context bar changes color as you approach the limit:

![High context warning](docs/images/statusline-context-high.svg)

### Cache TTL color coding

The cache TTL indicator turns from green → yellow → red as expiry approaches:

![Cache TTL states](docs/images/statusline-cache-states.svg)

---

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

Restart Claude Code, or run `/reload-plugins` in an already-open session. The default `hook` mode registers the classic status line; see below for the native Mod mode.

### Local development / standalone

```bash
git clone https://github.com/JerrettDavis/ClaudeStatusLineWidgets.git
cd ClaudeStatusLineWidgets
npm install
npm run build
claude --plugin-dir .
```

To inspect the Mod before loading it:

```bash
claude plugin validate .
```

The Mod is declared by `hooks/hooks.json` and `hooks/statusline.tsx`. It renders in-process from the native session APIs (no subprocess) and draws the result as a coloured band via `ui.render`; `ui.status` is plain-text only.

### Choose how the status line is drawn

One plugin, one renderer, two install modes. Switch with `ccfooter-config mode <hook|mod>` (or `node scripts/mode.js set <mode>`), then restart Claude Code or run `/reload-plugins`:

| Mode | How it is drawn | Trade-offs |
| --- | --- | --- |
| `hook` (default) | Classic `statusLine` command written to `settings.json` at SessionStart | Full ANSI colour and every row, **below** the prompt |
| `mod` | Native Claude Code Mod, no `settings.json` entry | Coloured rows drawn **above** the prompt (`ui.status` is plain text only); needs Claude Code 2.1.287+ |

Inside Claude Code, `/statusline-mode` shows the current mode and `/statusline-mode hook|mod` switches it. Switching to `mod` takes effect immediately; switching to `hook` needs a restart to load the classic line.

The mode is stored in `~/.config/claude-statusline-widgets/mode.json`; `CCFOOTER_MODE` overrides it. Switching only ever adds or removes this plugin's own `statusLine` entry, never a custom one.

### Install the `ccfooter-config` CLI globally

Requires Node.js 22.12 or newer and npm. npm creates the platform-specific
`ccfooter-config` launchers, including CMD and PowerShell shims on Windows.

```bash
# From a local clone
npm install -g .

# Directly from GitHub
npm install -g github:JerrettDavis/ClaudeStatusLineWidgets
```

Ensure npm's global executable directory is on your `PATH` (`npm prefix -g`
on Windows, or `$(npm prefix -g)/bin` on macOS/Linux). To verify installation
without opening the TUI, run `ccfooter-config mode get`.

If upgrading from an older Windows install, remove the unused
`%LOCALAPPDATA%\claude-statusline-widgets\global-runtime` directory after
verifying the new CLI works. Do not disable TLS certificate verification;
configure npm's trusted CA certificates if your network requires them.

---

## Configuration

### Interactive TUI

Launch the TUI configurator with:

```bash
ccfooter-config
```

![TUI configurator](docs/images/tui-preview.svg)

The TUI lets you:

- **Add / remove / reorder** widgets on each line
- **Cycle display variants** for widgets that support multiple representations
- **Pick colors** from the full ANSI palette with a live preview
- Toggle a **global minimalist mode** for label-light output
- **Add or delete entire lines**
- **Reset** to the factory 3-line layout
- See a **live preview** that updates as you make changes

#### Keyboard shortcuts

| Context | Key | Action |
|---------|-----|--------|
| Global | `Ctrl+S` | Save settings |
| Global | `Ctrl+C` | Quit |
| Line Editor | `a` | Add a widget |
| Line Editor | `v` | Cycle the selected widget's display variant |
| Line Editor | `d` / `Delete` | Remove selected widget |
| Line Editor | `m` | Toggle move mode (reorder with arrow keys) |
| Line Editor | `x` | Delete entire line |
| Line Editor | `Esc` | Go back |
| Line Selector | `a` | Add a new line |
| Widget Picker | Arrow keys | Navigate widgets |
| Widget Picker | `Enter` | Select widget to add |
| Widget Picker | `Esc` | Cancel |

### Settings file

Settings are saved to `~/.config/claude-statusline-widgets/settings.json`. You can also edit this file directly. Example:

```json
{
  "version": 2,
  "minimalistMode": false,
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

Delete the settings file to reset to defaults.

For the full configuration reference (all options, environment variables, color names) see **[docs/configuration.md](docs/configuration.md)**.

---

## Available Widgets

Claude StatusLine Widgets now ships with **62 built-in widgets** across seven categories, plus **variants** for context, cache, usage, and skills widgets.

| Category | Included widgets |
|----------|------------------|
| Session | `path`, `branch`, `model`, `cost`, `session-id`, `version`, `output-style`, `session-clock`, `session-elapsed`, `account-email`, `thinking-effort`, `vim-mode`, `skills` |
| Context | `context-bar`, `context-percent`, `context-length`, `cache-ttl`, `cache-tokens` |
| Usage | `usage-5h`, `usage-7d`, `usage-overage`, `usage-reset-5h`, `usage-reset-7d` |
| Tokens | `tokens-input`, `tokens-output`, `tokens-total`, `input-speed`, `output-speed`, `total-speed` |
| Git | `git-status`, `git-changes`, `git-staged`, `git-unstaged`, `git-untracked`, `git-ahead-behind`, `git-conflicts`, `git-sha`, `git-root`, `git-insertions`, `git-deletions`, `git-origin-owner`, `git-origin-repo`, `git-origin-owner-repo`, `git-upstream-owner`, `git-upstream-repo`, `git-upstream-owner-repo`, `git-is-fork`, `git-worktree-mode`, `git-worktree-name`, `git-worktree-branch`, `git-worktree-original-branch` |
| Headroom | `headroom-tokens`, `headroom-compression`, `headroom-cost`, `headroom-cache-hit` |
| Environment | `terminal-width`, `memory-usage` |
| Layout | `separator`, `custom-text`, `custom-symbol`, `link`, `custom-command` |

Shared widget variants include:

- `context-bar`: `bar`, `percent`, `remaining`
- `context-percent`: `percent`, `bar`, `remaining`
- `cache-ttl`: `time`, `countdown`, `badge`
- `usage-5h` / `usage-7d`: `bar`, `percent`, `countdown`
- `usage-overage`: `bar`, `percent`
- `skills`: `count`, `list`

For per-widget documentation, examples, and configuration options see **[docs/widgets.md](docs/widgets.md)**.

---

## API Usage tracking

![API usage line](docs/images/statusline-usage.svg)

The usage line shows your real-time Anthropic rate-limit utilisation. Data is fetched in a background process every 60 seconds using your OAuth credentials from `~/.claude/.credentials.json` — no extra configuration needed if you are logged in to Claude Code.

---

## Headroom proxy integration

![Headroom stats line](docs/images/statusline-headroom.svg)

Set `ANTHROPIC_BASE_URL` to your Headroom proxy base URL (for example `http://127.0.0.1:8787`) to activate the Headroom widgets. The statusline first probes `<base>/health`; when healthy, it queries `<base>/stats` and displays token savings, compression ratio, cost savings, and cache hit rate.

---

## How it works

The plugin loads a Claude Code Mod from `hooks/statusline.tsx` (in `mod` mode; in `hook` mode the classic `statusLine` command runs `dist/index.js` instead):

1. **Observes native session lifecycle and measurement events** such as `session.start`, `session.measure`, and `turn.complete`.
2. **Reads session state through the Mod API** including model, cwd, session id, context usage, version, and transcript metadata.
3. **Renders in-process**: reads the transcript, caches and git state through the Mod's `$.fs`/`$.process`/`$.http`, then builds the configured widget tree with native `Box`/`Text` elements.
4. **Draws the tree in the `AbovePrompt` band**; it stays inert unless the install mode is `mod`. In `hook` mode no Mod rendering happens and `settings.json` holds the classic `statusLine` command.
5. **Keeps the existing widget registry, settings file, transcript-based cache TTL logic, API usage cache, Headroom integration, and TUI configurator** unchanged.
6. **Refreshes on session measurements, completed turns, session changes, and a low-frequency timer** so countdown-style widgets continue to move while idle.

Running `dist/index.js` interactively still launches the React/Ink TUI configurator, and its piped-input mode remains available as a legacy/standalone renderer.

---

## Architecture

```
.claude-plugin/
  marketplace.json  — Marketplace catalog
  plugin.json       — Plugin manifest

hooks/
  hooks.json        — Mod module declaration
  statusline.tsx    — Native Claude Code Mod (in-process renderer, mode gate, /statusline-mode)

src/
  index.ts          — Entry point: TTY detection (TUI vs render mode)
  renderer.ts       — Settings-driven multi-line renderer
  cache.ts          — JSONL transcript parsing, TTL computation
  segments.ts       — Low-level formatters for each segment type
  colors.ts         — ANSI color/style helpers
  usage.ts          — Background API usage fetcher with file-based caching
  headroom.ts       — Headroom compression proxy stats integration

  widgets/
    types.ts        — Widget interface, WidgetItem config, RenderContext
    registry.ts     — Widget manifest and factory registry
    *.ts            — One file per widget implementation

  config/
    schema.ts       — Settings type, defaults, validation
    loader.ts       — Load/save settings, config path, migrations

  tui/
    index.tsx       — TUI entry point (runTUI)
    app.tsx         — Main app with screen router and preview
    components/     — MainMenu, LineSelector, ItemsEditor,
                       WidgetPicker, ColorMenu
```

---

## Development

```bash
npm install
npm run build        # Compile TypeScript
npm run dev          # Watch mode

# Test render mode with mock data
echo '{"model":{"display_name":"Opus"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":45},"git_branch":"main","cwd":"/home/user/project"}' | node dist/index.js

# Launch TUI configurator
ccfooter-config
# Or without global install:
node dist/index.js

# Regenerate docs screenshots
npm run build && node scripts/capture-screenshots.js
```

Screenshots in `docs/images/` are auto-regenerated by [the screenshots workflow](.github/workflows/screenshots.yml) whenever `src/` changes on `main`.

---

## License

MIT
