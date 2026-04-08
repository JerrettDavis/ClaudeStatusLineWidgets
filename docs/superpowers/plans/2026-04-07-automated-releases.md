# Automated Releases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up semantic-release so every merge to `main` automatically bumps versions, generates a changelog, and creates a GitHub Release — with no manual tagging. Also remove `dist/` from the repo, auto-building it on install via the `prepare` lifecycle hook.

**Architecture:** semantic-release runs on push to `main`, analyzes conventional commits, bumps `package.json`, syncs versions to `plugin.json` and `marketplace.json` via a custom script, commits everything back with `[skip ci]`, then creates a GitHub Release.

**Tech Stack:** GitHub Actions, semantic-release + plugins (`@semantic-release/changelog`, `@semantic-release/git`, `@semantic-release/exec`), Node.js ESM scripts.

---

## Files Changed

| File | Action |
|---|---|
| `.github/workflows/ci.yml` | Modify — `master` → `main` |
| `.github/workflows/release.yml` | Rewrite — push-to-main trigger, semantic-release |
| `.releaserc.json` | Create — semantic-release plugin chain |
| `scripts/sync-versions.js` | Create — syncs version to plugin.json + marketplace.json |
| `package.json` | Modify — add semantic-release dev deps |
| `CONTRIBUTING.md` | Create — conventional commits guide, PR workflow |
| `AGENTS.md` | Create — AI agent contribution rules |
| `CLAUDE.md` | Modify — append commit format note |
| `.gitignore` | Modify — add `dist/` |
| `package.json` | Modify — `prepack` → `prepare` |

---

### Task 1: Fix CI workflow branch references

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update branch triggers**

Replace the contents of `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Verify bin entry point
        run: node bin/ccfooter-config.js --help 2>/dev/null || true
      - name: Test piped mode
        run: |
          echo '{"model":{"display_name":"Opus"},"cost":{"total_cost_usd":0.12},"context_window":{"used_percentage":45}}' \
            | node dist/index.js | grep -q "Opus"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: target main branch instead of master"
```

---

### Task 2: Install semantic-release dev dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install packages**

```bash
npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/exec
```

- [ ] **Step 2: Verify they appear in package.json devDependencies**

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(Object.keys(p.devDependencies||{}).filter(k=>k.includes('semantic')))"
```

Expected output includes: `semantic-release`, `@semantic-release/changelog`, `@semantic-release/git`, `@semantic-release/exec`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add semantic-release dev dependencies"
```

---

### Task 3: Create version sync script

**Files:**
- Create: `scripts/sync-versions.js`

- [ ] **Step 1: Create the script**

```js
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
```

- [ ] **Step 2: Smoke-test the script**

```bash
node scripts/sync-versions.js 9.9.9
node -e "const p=JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); console.assert(p.version==='9.9.9','plugin.json version wrong'); console.log('plugin.json OK')"
node -e "const m=JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); console.assert(m.metadata.version==='9.9.9'); console.assert(m.plugins[0].version==='9.9.9'); console.log('marketplace.json OK')"
```

Expected: `plugin.json OK` and `marketplace.json OK`

- [ ] **Step 3: Revert the test version**

```bash
node scripts/sync-versions.js 0.2.7
```

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-versions.js
git commit -m "feat: add sync-versions script for semantic-release"
```

---

### Task 4: Create `.releaserc.json`

**Files:**
- Create: `.releaserc.json`

- [ ] **Step 1: Create the config**

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { "npmPublish": false }],
    ["@semantic-release/exec", {
      "prepareCmd": "node scripts/sync-versions.js ${nextRelease.version}"
    }],
    ["@semantic-release/git", {
      "assets": [
        "package.json",
        "CHANGELOG.md",
        ".claude-plugin/plugin.json",
        ".claude-plugin/marketplace.json"
      ],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

- [ ] **Step 2: Validate it parses cleanly**

```bash
node -e "JSON.parse(require('fs').readFileSync('.releaserc.json','utf8')); console.log('valid JSON')"
```

Expected: `valid JSON`

- [ ] **Step 3: Commit**

```bash
git add .releaserc.json
git commit -m "ci: add semantic-release config"
```

---

### Task 5: Rewrite release workflow

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Replace the workflow**

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Smoke test
        run: |
          echo '{"model":{"display_name":"Opus"}}' | node dist/index.js | grep -q "Opus"
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

**Note on branch protection:** If branch protection is configured to require PRs from all actors (including Actions), semantic-release's git push will fail with GITHUB_TOKEN. In that case, create a PAT with `repo` scope, store it as the `GH_TOKEN` repository secret, and add `GH_TOKEN: ${{ secrets.GH_TOKEN }}` to the env block — semantic-release prefers `GH_TOKEN` over `GITHUB_TOKEN`. The owner bypass actor setting in branch protection also resolves this if set to the Actions bot.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: switch to semantic-release on push to main"
```

---

### Task 6: Create `CONTRIBUTING.md`

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create the file**

```markdown
# Contributing

## Branching

- `main` is the release branch — every merge triggers a release
- Work in feature branches: `feat/my-feature`, `fix/my-bug`, `chore/my-task`
- Open a PR against `main` when ready
- CI must pass before merging

## Commit Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/). The commit prefix determines the release type:

| Prefix | Release | When to use |
|---|---|---|
| `feat:` | minor | New feature or widget |
| `fix:` | patch | Bug fix |
| `feat!:` / `BREAKING CHANGE:` | major | Incompatible change |
| `chore:` | none | Maintenance, deps |
| `docs:` | none | Documentation only |
| `ci:` | none | Workflow changes |
| `refactor:` | none | Code restructure, no behavior change |
| `style:` | none | Formatting |
| `test:` | none | Test changes |

### Examples

```
feat: add HeadroomTokens widget
fix: correct cache TTL calculation when transcript is missing
chore: update ink to 6.9.0
docs: add branch widget to README
feat!: remove legacy segments.ts API
```

Multi-line body with breaking change footer:
```
feat!: redesign widget registry

BREAKING CHANGE: widget `render()` now receives `WidgetContext` instead of raw segments
```

## What Triggers a Release

A release is created when commits with `feat:` or `fix:` (or breaking) prefixes land on `main`. Commits with `chore:`, `docs:`, `ci:`, `refactor:`, `style:`, or `test:` prefixes do not trigger a release.

## Branch Protection

The `main` branch requires:
- A passing CI run (build + smoke test on Node 18/20/22)
- A pull request (non-owners have no bypass)

To configure in GitHub → Settings → Branches → Add rule for `main`:
- [x] Require a pull request before merging
- [x] Require status checks to pass (`build` job from CI)
- [x] Require branches to be up to date before merging
- Add repo owner as bypass actor for direct pushes when needed
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING with conventional commits guide"
```

---

### Task 7: Create `AGENTS.md`

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Create the file**

```markdown
# Agent Contribution Guidelines

Rules for AI agents (Claude, Copilot, etc.) working in this repository.

## Branch Strategy

- **Never push directly to `main`** — always create a feature branch and open a PR
- Branch naming: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`
- Keep branches focused: one logical change per PR

## Commit Format

All commits must use Conventional Commits format. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full table.

Quick reference:
- `feat: <description>` — new feature (triggers minor release)
- `fix: <description>` — bug fix (triggers patch release)
- `chore: <description>` — maintenance (no release)
- `docs: <description>` — docs only (no release)
- `ci: <description>` — workflow changes (no release)
- `refactor: <description>` — restructure without behavior change (no release)

## Pull Requests

- Target `main`
- Title should match the primary commit's conventional format
- Include a brief description of what changed and why
- Do not merge your own PR — wait for CI to pass

## What Not To Do

- Do not bump versions manually in `package.json`, `.claude-plugin/plugin.json`, or `.claude-plugin/marketplace.json` — semantic-release handles this automatically on merge
- Do not create git tags manually
- Do not edit `CHANGELOG.md` directly — it is auto-generated
- Do not use `--no-verify` to skip commit hooks
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add AGENTS.md for AI contributor guidelines"
```

---

### Task 8: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append commit format note**

Add to the end of `CLAUDE.md`:

```markdown
## Commit Format
Use Conventional Commits — see [CONTRIBUTING.md](CONTRIBUTING.md). Every merge to `main` is a release; `feat:` bumps minor, `fix:` bumps patch, `feat!:` bumps major. `chore:`, `docs:`, `ci:`, `refactor:` do not trigger a release. Never edit version numbers manually.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: reference CONTRIBUTING for commit format in CLAUDE.md"
```

---

### Task 9: Remove dist from repo, auto-build on install

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Add dist/ to .gitignore**

Append to `.gitignore`:

```
dist/
```

- [ ] **Step 2: Untrack the dist folder**

```bash
git rm -r --cached dist/
```

Expected: a list of `rm 'dist/...'` lines for every file currently tracked in dist.

- [ ] **Step 3: Change prepack → prepare in package.json**

In `package.json`, change `"prepack": "npm run build"` to `"prepare": "npm run build"`.

`prepare` runs on `npm install` and `npm ci` (not just before `npm publish`), so the plugin auto-builds dist when installed.

- [ ] **Step 4: Verify .gitignore works**

```bash
git status --short | grep dist
```

Expected: no `dist/` files appear as untracked (they should be ignored).

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json
git commit -m "chore: remove dist from repo, auto-build via prepare hook"
```

---

### Task 10: Push to main

- [ ] **Step 1: Verify all commits are clean**

```bash
git log --oneline -10
```

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Watch the Actions run**

Go to the GitHub Actions tab. The `Release` workflow should fire. Because commits like `docs:`, `ci:`, and `chore:` don't trigger a version bump, semantic-release will log "no release" on this first push — that is expected. The next `feat:` or `fix:` commit will produce the first automated release.
