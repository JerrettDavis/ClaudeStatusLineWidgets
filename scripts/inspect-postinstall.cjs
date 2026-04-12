const fs = require("fs");

const root = process.cwd();
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

console.error("[postinstall-debug] cwd=" + root);
try {
  console.error("[postinstall-debug] root entries=" + fs.readdirSync(root).join(","));
} catch (error) {
  console.error("[postinstall-debug] readdir failed: " + error.message);
}

for (const key of keys) {
  console.error("[postinstall-debug] env " + key + "=" + (process.env[key] || ""));
}

process.exit(1);
