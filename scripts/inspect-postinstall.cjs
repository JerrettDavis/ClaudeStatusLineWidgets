const fs = require("fs");
const os = require("os");
const path = require("path");

const root = process.cwd();
const logPath = path.join(os.tmpdir(), "ccsw-postinstall-runs.log");
const keys = [
  "INIT_CWD",
  "npm_package_json",
  "npm_package_from",
  "npm_package_resolved",
  "npm_package_integrity",
  "npm_package_name",
  "npm_package_version",
  "npm_config_cache",
  "npm_config_prefix",
];

const lines = [
  "=== run ===",
  "cwd=" + root,
];

try {
  lines.push("root entries=" + fs.readdirSync(root).join(","));
} catch (error) {
  lines.push("readdir failed=" + error.message);
}

for (const key of keys) {
  lines.push("env " + key + "=" + (process.env[key] || ""));
}

fs.appendFileSync(logPath, lines.join("\n") + "\n");
console.error("[postinstall-debug] logged to " + logPath);
