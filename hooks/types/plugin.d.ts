/**
 * Public types contract for the cache-ttl-statusline plugin.
 *
 * Declares the keys this plugin reads and writes to `$.state`. Other
 * mods that depend on this plugin see these shapes via the manifest's
 * `types` field, which points to this file.
 */

declare module "claude-code" {
  interface PluginState {
    "cache-ttl-statusline": {
      transcript_path: string;
    };
  }
}