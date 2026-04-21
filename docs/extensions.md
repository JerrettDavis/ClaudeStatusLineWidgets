# Writing Extension Widgets

The extension framework lets you publish custom widgets as a standalone npm package. Once installed globally, `claude-statusline-widgets` automatically discovers and loads them.

## Quick-start

### 1. Create a new package

```bash
mkdir my-statusline-widget && cd my-statusline-widget
npm init -y
npm install --save-dev typescript
npm install --save-peer claude-statusline-widgets
```

### 2. Add the discovery keyword to `package.json`

The loader identifies extension packages by the `claude-statusline-widget` keyword.

```jsonc
// package.json
{
  "name": "my-statusline-widget",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "keywords": ["claude-statusline-widget"],  // ← required
  "peerDependencies": {
    "claude-statusline-widgets": ">=1.1.0"
  }
}
```

### 3. Implement your widget

```ts
// src/MyWidget.ts
import type { Widget, WidgetItem, RenderContext } from "claude-statusline-widgets/extension-api";

export class MyWidget implements Widget {
  getDisplayName() { return "My Widget"; }
  getDescription() { return "Shows something useful."; }
  getCategory()    { return "My Org"; }
  getDefaultColor() { return "cyan"; }
  supportsColors() { return true; }

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (ctx.isPreview) return "preview-value";
    const value = ctx.payload.model?.display_name;
    return value ?? null;
  }
}
```

### 4. Export the extension manifest

The loader looks for a **named export `extension`** (or a default export) that conforms to `WidgetExtension`.

```ts
// src/index.ts
import type { WidgetExtension } from "claude-statusline-widgets/extension-api";
import { MyWidget } from "./MyWidget.js";

const extension: WidgetExtension = {
  widgets: [
    // Use a namespaced type string to avoid clashing with built-ins.
    { type: "my-org.my-widget", create: () => new MyWidget() },
  ],
};

export { extension };
export default extension;  // also export as default for maximum compatibility
```

### 5. Build and publish

```bash
tsc
npm publish
```

### 6. Install and use

```bash
npm install -g my-statusline-widget
# Restart a Claude Code session — the widget will appear in ccfooter-config
ccfooter-config
```

## Multiple widgets per package

A single extension package can contribute any number of widgets:

```ts
const extension: WidgetExtension = {
  widgets: [
    { type: "my-org.widget-a", create: () => new WidgetA() },
    { type: "my-org.widget-b", create: () => new WidgetB() },
    { type: "my-org.widget-c", create: () => new WidgetC() },
  ],
};
```

## Discovery rules

| Rule | Details |
|------|---------|
| **Keyword** | `package.json` must include `"claude-statusline-widget"` in `keywords` |
| **Export** | Package main must export `extension` (named) **or** a default export that is a `WidgetExtension` |
| **Type prefix** | Namespacing types (e.g. `"my-org.my-widget"`) is strongly recommended to avoid collisions with built-in types |
| **Built-in protection** | A type that already exists in the built-in registry is silently skipped |
| **Graceful failure** | A broken extension (import error, invalid shape) is silently ignored so the rest of the app continues working |

## Widget groups (data keys)

Extension widgets can opt into the TUI's group-based picker by implementing the optional `getDataKey()` method:

```ts
export class MyContextWidget implements Widget {
  getDisplayName() { return "My Context View"; }
  getDescription() { return "Alternative context visualization."; }
  getCategory()    { return "Context"; }
  getDefaultColor() { return "cyan"; }
  supportsColors() { return true; }
  getDataKey()     { return "context-usage"; }  // ← group with built-in context widgets

  render(item: WidgetItem, ctx: RenderContext): string | null {
    // ...
  }
}
```

Returning a built-in data key (e.g. `"context-usage"`) places your widget alongside the built-in context widgets in the picker. Returning a novel key creates a new group automatically. Omitting `getDataKey()` keeps the widget ungrouped (legacy behavior).

See [widgets.md](widgets.md#widget-groups-data-keys) for the full list of built-in data keys.

---

## Available types

Import from `claude-statusline-widgets/extension-api`:

| Type | Description |
|------|------------|
| `Widget` | Interface your widget class must implement |
| `WidgetItem` | Configuration item passed to `render()` |
| `RenderContext` | Runtime data (payload, cache TTL, usage, etc.) passed to `render()` |
| `StatusLinePayload` | Shape of the JSON piped in from Claude Code |
| `WidgetExtension` | Shape your package's main export must conform to |
| `WidgetRegistration` | Single `{ type, create }` entry inside `WidgetExtension.widgets` |
