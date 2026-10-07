/**
 * CLI-only extension loader.
 *
 * The dynamic `import()` lives here, *not* in the mod's import chain.
 * `widgets/registry.ts` re-exports `loadExtensions` from this file. The mod
 * path imports `renderTokensFor` from `widgets/registry.js` but never
 * calls `loadExtensions`, so the dynamic import is never evaluated in
 * the mod runtime.
 */
import { registerExtension } from "../widgets/registry.js";
import type { WidgetExtension } from "./types.js";

export async function loadExtensionsCli(): Promise<WidgetExtension[]> {
  const { discoverExtensions } = await import("./loader.js");
  return discoverExtensions();
}

/**
 * Discover + register all globally-installed extensions. CLI-only.
 */
export async function loadExtensions(): Promise<void> {
  const extensions = await loadExtensionsCli();
  for (const ext of extensions) {
    registerExtension(ext);
  }
}