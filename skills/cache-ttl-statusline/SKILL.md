---
name: cache-ttl-statusline
description: Set up and configure the cache TTL statusline in Claude Code. Use this skill when the user wants to install, configure, or customize the statusline that shows cache TTL countdown, model, cost, context usage, and API rate limits.
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
