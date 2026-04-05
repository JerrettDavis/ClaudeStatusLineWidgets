---
name: setup
description: Configure the cache TTL statusline in Claude Code settings
---

# Setup Cache TTL StatusLine

Add this to your Claude Code settings (`~/.claude/settings.json` or `.claude/settings.json`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_ROOT}/dist/index.js"
  }
}
```

Or if installed standalone (not as plugin), use the absolute path:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/ClaudeCacheTTLStatusLine/dist/index.js"
  }
}
```

After adding, restart Claude Code. The statusline will show:

- **Cache TTL countdown** — green/yellow/red timer, or "expired" when cache is cold
- **Model name** — current model in use
- **Session cost** — running USD total
- **Context usage** — visual bar with percentage
