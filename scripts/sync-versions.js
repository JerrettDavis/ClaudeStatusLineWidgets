#!/usr/bin/env node
// Syncs the version from package.json into plugin.json and marketplace.json.
// Called by semantic-release via @semantic-release/exec:
//   prepareCmd: "node scripts/sync-versions.js ${nextRelease.version}"

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const version = process.argv[2];
if (!version) {
  process.stderr.write("Usage: sync-versions.js <version>\n");
  process.exit(1);
}

function updateJson(filePath, updater) {
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  updater(data);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// .claude-plugin/plugin.json — top-level .version
updateJson(resolve(root, ".claude-plugin/plugin.json"), (data) => {
  data.version = version;
});

// .claude-plugin/marketplace.json — .metadata.version and .plugins[0].version
updateJson(resolve(root, ".claude-plugin/marketplace.json"), (data) => {
  data.metadata.version = version;
  data.plugins[0].version = version;
});

console.log(`Synced version ${version} to plugin.json and marketplace.json`);
