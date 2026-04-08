import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import type { WidgetExtension } from "./types.js";

/**
 * The keyword that extension packages must declare in their `package.json`
 * `keywords` array so that the loader can discover them.
 */
export const EXTENSION_KEYWORD = "claude-statusline-widget";

/**
 * Resolves the global `node_modules` directory by asking npm.
 * Falls back to platform-conventional paths when npm is unavailable.
 */
function resolveGlobalNodeModules(): string[] {
  const candidates: string[] = [];

  // 1. Ask npm directly — most reliable.
  try {
    const root = execFileSync("npm", ["root", "-g"], { encoding: "utf-8", timeout: 5000 }).trim();
    if (root) candidates.push(root);
  } catch {
    // npm not available or failed — continue with fallbacks.
  }

  // 2. NODE_PATH may contain extra search roots.
  const nodePath = process.env.NODE_PATH;
  if (nodePath) {
    for (const p of nodePath.split(process.platform === "win32" ? ";" : ":")) {
      if (p) candidates.push(p);
    }
  }

  // 3. Conventional locations relative to the node executable.
  const nodeExec = process.execPath; // e.g. /usr/local/bin/node
  if (process.platform === "win32") {
    // Windows: <node_dir>\node_modules
    candidates.push(join(nodeExec, "..", "node_modules"));
  } else {
    // Unix: <prefix>/lib/node_modules  (node is at <prefix>/bin/node)
    candidates.push(join(nodeExec, "..", "..", "lib", "node_modules"));
  }

  // Deduplicate while preserving order.
  return [...new Set(candidates)];
}

/**
 * Checks whether a directory under `nodeModulesDir` is an extension package
 * by reading its `package.json` and looking for {@link EXTENSION_KEYWORD}
 * in the `keywords` array.
 */
function isExtensionPackage(packageDir: string): boolean {
  const pkgPath = join(packageDir, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { keywords?: unknown };
    return Array.isArray(pkg.keywords) && (pkg.keywords as unknown[]).includes(EXTENSION_KEYWORD);
  } catch {
    return false;
  }
}

/**
 * Finds the main entry point for a package directory by reading `package.json`.
 * Returns the resolved absolute path, or `null` if it cannot be determined.
 */
function resolvePackageMain(packageDir: string): string | null {
  const pkgPath = join(packageDir, "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      exports?: unknown;
      main?: string;
    };

    // Prefer the "exports" default export when present and is a plain string.
    if (pkg.exports) {
      if (typeof pkg.exports === "string") return join(packageDir, pkg.exports);
      if (typeof pkg.exports === "object" && pkg.exports !== null) {
        const exp = pkg.exports as Record<string, unknown>;
        const def = exp["."];
        if (typeof def === "string") return join(packageDir, def);
        if (typeof def === "object" && def !== null) {
          const cond = def as Record<string, unknown>;
          const entry = cond["import"] ?? cond["default"] ?? cond["require"];
          if (typeof entry === "string") return join(packageDir, entry);
        }
      }
    }

    // Fall back to "main".
    if (typeof pkg.main === "string") return join(packageDir, pkg.main);

    // Convention: index.js
    return join(packageDir, "index.js");
  } catch {
    return null;
  }
}

/**
 * Attempts to load a `WidgetExtension` from an extension package directory.
 * The package must export either a named `extension` export or a default export
 * that conforms to the {@link WidgetExtension} interface.
 *
 * Returns `null` if loading fails or the export is not a valid extension.
 */
async function loadExtensionFromDir(packageDir: string): Promise<WidgetExtension | null> {
  const entryPath = resolvePackageMain(packageDir);
  if (!entryPath || !existsSync(entryPath)) return null;

  try {
    // Dynamic import — works with both CJS and ESM packages.
    const mod = await import(entryPath) as Record<string, unknown>;
    const ext = (mod["extension"] ?? mod["default"]) as WidgetExtension | undefined;

    if (
      ext &&
      typeof ext === "object" &&
      Array.isArray((ext as WidgetExtension).widgets)
    ) {
      return ext as WidgetExtension;
    }
    return null;
  } catch {
    // Silently ignore broken extensions so the main app keeps running.
    return null;
  }
}

/**
 * Discovers and loads all extension packages installed globally.
 *
 * Extension packages must:
 * 1. Be installed in the npm global `node_modules`.
 * 2. Include `"claude-statusline-widget"` in their `package.json` `keywords`.
 * 3. Export a `WidgetExtension` as `export { extension }` or `export default`.
 */
export async function discoverExtensions(): Promise<WidgetExtension[]> {
  const extensions: WidgetExtension[] = [];
  const searchRoots = resolveGlobalNodeModules();

  for (const nodeModulesDir of searchRoots) {
    if (!existsSync(nodeModulesDir)) continue;

    let entries: string[];
    try {
      entries = readdirSync(nodeModulesDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      // Handle scoped packages (e.g. @org/pkg).
      const dirsToCheck: string[] = [];
      if (entry.startsWith("@")) {
        const scopeDir = join(nodeModulesDir, entry);
        try {
          for (const scoped of readdirSync(scopeDir)) {
            dirsToCheck.push(join(scopeDir, scoped));
          }
        } catch {
          // ignore unreadable scoped dirs
        }
      } else {
        dirsToCheck.push(join(nodeModulesDir, entry));
      }

      for (const packageDir of dirsToCheck) {
        if (!isExtensionPackage(packageDir)) continue;
        const ext = await loadExtensionFromDir(packageDir);
        if (ext) extensions.push(ext);
      }
    }
  }

  return extensions;
}
