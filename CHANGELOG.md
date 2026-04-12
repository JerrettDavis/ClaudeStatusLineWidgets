## [1.1.6](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.1.5...v1.1.6) (2026-04-12)


### Bug Fixes

* add createRequire banner to fix dynamic require in ESM bundle ([#21](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/issues/21)) ([3649acb](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/3649acb7e546b32ed3d817def6070f215724ad77))

## [1.1.5](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.1.4...v1.1.5) (2026-04-12)


### Bug Fixes

* Windows GitHub URL install recovery via npm cache tarball ([#20](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/issues/20)) ([bc04580](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/bc045809732a1de46332eceff777da094df3aecf))

## [1.1.4](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.1.3...v1.1.4) (2026-04-12)


### Bug Fixes

* add missing scripts to git, fix Windows .cmd shim CRLF, add cross-platform e2e tests ([#19](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/issues/19)) ([77210a5](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/77210a51252c1879c8b6c530fb56a97a80b6eb9d))

## [1.1.3](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.1.2...v1.1.3) (2026-04-12)


### Bug Fixes

* inline Windows runtime staging ([85cca29](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/85cca295b4be0d5aa5319c59849514d70baf38a4))
* support github installs on Windows ([dd383fc](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/dd383fc227f65e63a350213a299607023c793e9e))

## [1.1.2](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.1.1...v1.1.2) (2026-04-12)


### Bug Fixes

* bootstrap stable Windows shims ([e036e65](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/e036e65544fba30de07c1106f9a47d186ec24dcc))
* make postinstall shell-safe ([78895c3](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/78895c3492bd8e90aab30c5e8aac06145bbaf0d4))
* own global launcher creation ([d9466ae](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/d9466ae056372895ce310c6d90ba2761c993b4c0))
* ship bundled runtime output ([c752e98](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/c752e98e6cd6c688dc40b89791acab7546256747))
* stabilize Windows GitHub installs ([8f09664](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/8f096647953793a6b94304f11896f6cb57fce95d))

## [1.1.1](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.1.0...v1.1.1) (2026-04-10)


### Bug Fixes

* apply item.color in renderer and add color helpers + tests ([b4178b8](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/b4178b8788802711cf4cd813b751f8d3994828ad))

# [1.1.0](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.0.2...v1.1.0) (2026-04-10)


### Features

* add extension framework for third-party widget packages ([d6a9e17](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/d6a9e17d97a71c6f1999338e42c8a7536b049309))
* add weighted token equivalent metric to session-tracking window records ([fdc3a8e](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/fdc3a8e28d2e649accbd8c55cfe8ce09ffced6da))
* expand widget catalog and variants ([ad49c6e](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/ad49c6e5418178f6614ba767172fabde87e8f08f))
* extend session-tracking data with API stats and per-model token breakdown ([eb7dab2](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/eb7dab2ed1f9c60a99b2452488bb0b2552797179))

## [1.0.2](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.0.1...v1.0.2) (2026-04-08)


### Bug Fixes

* graceful prepare fallback and commit dist/ in release ([ba648ba](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/ba648baeca77ff3b0f0273bb5164e3b2038519b9))

## [1.0.1](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/compare/v1.0.0...v1.0.1) (2026-04-08)


### Bug Fixes

* add files field to control package distribution and exclude secrets ([d67c599](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/d67c59911d405f962007020c5ceb931afaeded6a))

# 1.0.0 (2026-04-08)


### Bug Fixes

* add trailing blank line to cover Claude Code UI chrome ([d7956f1](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/d7956f13cdf6142d31101a386368308a6b8de163))
* align plugin repo structure with Claude Code plugin spec ([aa81651](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/aa81651210babf3fdee97a7c65fedb2e6fbd2785))
* avoid ANSI escape collision in model context label ([f8203ef](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/f8203ef9b6d3c9bcd044f5944da49fdf44214e62))
* blank separator slot when not in a git repo ([22bd87f](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/22bd87fb94678a3784a0d8ae45abbdf619f9a7ef))
* commit package-lock.json for CI reproducibility ([1b0b892](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/1b0b892028fde688aa1658114dfa2b9757a3f214))
* compact model format to avoid duplication ([b6d7daf](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/b6d7daf3c22066b8bdc92be3376f08121696ee68))
* correct plugin manifest schema. ([0039729](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/00397294ad4e65b3bcfb3b5bdb551385054a7250))
* correct skills field in plugin.json manifest from string to array ([881ef0e](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/881ef0e4ce9dae0bfb4e404be4e4e73f8f19f253))
* detect terminal width cross-platform for proper auto-wrap ([c2ed2d6](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/c2ed2d6ac394911d355051efacdf35e43f054f04))
* move build dependencies from devDependencies to dependencies ([55df9f2](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/55df9f2009583d627aa9444771e588693eb7d79a))
* move marketplace.json back to .claude-plugin/ (undo PR [#3](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/issues/3) damage) ([4682c0d](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/4682c0dd6f5614d36aa78a82bb208a9e6a7789c4))
* pass through model display_name without adding context size ([c7ac299](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/c7ac2994ba78872dcc6f72999563f56de56f0731))
* replace prepare with prepack to prevent build on npm install ([b3d9e00](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/b3d9e000a3fb8f3beaa8d631b036f0d470509640))
* self-cleanup statusLine when plugin is disabled ([ec381dd](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/ec381ddc2e0d837047fd7943b0e20ef3808ee1e5))


### Features

* add ANSI color helper functions ([79d3558](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/79d35589d9884e1a062095cf4ca21edf100344f1))
* add CacheTokensWidget with session cache reads, writes, and break tracking ([07932d2](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/07932d2bcc021dc0611b70731bdb8b6c4554558a))
* add ccfooter-config CLI command for TUI launcher ([fe82dc2](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/fe82dc2739ae1ecdf105b5c24890b654ebec37de))
* add interactive TUI configurator and widget system ([68e2ed2](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/68e2ed254f43a7885515cf588e629456ff8d299a))
* add SessionStart hook and configure-statusline script; bump versions ([e48f607](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/e48f607a7317c5ea6b1d338a40c30e71dee8835f))
* add sync-versions script for semantic-release ([a374709](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/a374709a1bcdf54b6e8121d9cfe7c243e656012b))
* async usage API widget with background fetch ([83992d7](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/83992d7738abf2a93a2284282814a004dc382978))
* auto-wrap segments across multiple lines ([692dc95](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/692dc95563ef0e1ef558503d928a55ac32e969af))
* cache TTL computation from session JSONL transcript ([243f370](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/243f3707c78c22684245ca14c8b82fac6f36efbb))
* compact statusline with path, branch, model context size ([51759ce](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/51759ce5f904760637ccbdbb95857895eae09844))
* extend session window tracking with centralized token aggregation ([285a403](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/285a403e0ed77476aff3ac7dc409cfc3488b2903))
* optional Headroom proxy stats on line 3 ([55591f0](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/55591f00b983033ac6c2f4bd3e22c1121f0b572b))
* plugin manifest and setup skill ([c503d9d](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/c503d9df385f2d231ed5a1ed5e757f161aae3ee7))
* progress bars for 5h, 7d, and overage usage ([7dd414d](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/7dd414d38faf42bfe3bd4fc4197ea26d60bcb3a1))
* project scaffolding with TypeScript build setup ([98e370b](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/98e370bde8dec7568feb58eb981295582d4aa703))
* set up as Claude Code plugin marketplace ([ffe2a34](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/ffe2a34e24beaad85eb903ab05e7c9925d9b4ac4))
* show absolute expiry time instead of countdown ([eacf84e](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/eacf84ec3ff2ae6c8cc09e1c09e9265286bce55a))
* statusline entry point — reads stdin, outputs formatted segments ([1e69855](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/1e69855879d11e716a6835cb9a143ec1dc29f990))
* statusline segment formatters (cache, model, cost, context) ([e14aab7](https://github.com/JerrettDavis/ClaudeStatusLineWidgets/commit/e14aab7ac3e52f6f0262b2ac21a0112f56d8e8c9))
