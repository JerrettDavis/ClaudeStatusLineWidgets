# Automated Releases Design

**Date:** 2026-04-07
**Status:** Approved

## Overview

Every commit that lands on `main` triggers an automated release via semantic-release. Releases are convention-based (conventional commits), gated by CI, and gated by PRs for all contributors (owner can bypass branch protection but is encouraged to use PRs).

## Goals

- Fix `master` → `main` branch references in all workflows
- Automated version bumping across `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Auto-generated `CHANGELOG.md` and GitHub Release notes
- No manual tagging or version editing
- Convention-based: commit prefix determines release type

## Commit → Release Mapping

| Prefix | Bump | Notes |
|---|---|---|
| `fix:` | patch | Bug fixes |
| `feat:` | minor | New features |
| `feat!:` / `BREAKING CHANGE:` | major | Breaking changes |
| `chore:`, `docs:`, `ci:`, `refactor:`, `style:`, `test:` | none | No release triggered |

## Architecture

```
PR opened (branch → main)
  → ci.yml fires (build + smoke test on Node 18/20/22)
  → must pass to merge

Merge to main
  → release.yml fires
  → semantic-release runs:
      1. commit-analyzer   — determines version bump from commits
      2. release-notes-generator — drafts release notes
      3. changelog         — writes/updates CHANGELOG.md
      4. npm (npmPublish:false) — bumps package.json version
      5. exec              — runs scripts/sync-versions.js <version>
      6. git               — commits bumped files back [skip ci]
      7. github            — creates GitHub Release with notes
```

The `[skip ci]` tag on the version-bump commit prevents an infinite release loop.

## Files Changed

### `.github/workflows/ci.yml`
- Change `branches: [master]` → `branches: [main]` in both `push` and `pull_request` triggers

### `.github/workflows/release.yml`
Replace tag-triggered release with:
```yaml
on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write
```
Uses `GITHUB_TOKEN` — no extra secrets needed.

### `.releaserc.json`
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
      "assets": ["package.json", "CHANGELOG.md", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

### `scripts/sync-versions.js`
Plain Node.js (no deps). Accepts version as `process.argv[2]`. Writes to:
- `.claude-plugin/plugin.json` → `.version`
- `.claude-plugin/marketplace.json` → `.metadata.version` and `.plugins[0].version`

### `package.json`
Add dev dependencies:
- `semantic-release`
- `@semantic-release/changelog`
- `@semantic-release/git`
- `@semantic-release/exec`

(`@semantic-release/npm` and `@semantic-release/github` ship with semantic-release.)

## Documentation

### `CONTRIBUTING.md`
- Conventional commits guide with examples
- PR workflow: branch from `main`, open PR, CI must pass, merge
- What triggers a release vs. what doesn't
- Branch protection setup instructions for repo owner

### `AGENTS.md`
- AI-specific: always use conventional commits, always branch from `main`, never push directly to `main`
- Reference CONTRIBUTING.md for full commit format

### `CLAUDE.md` (append)
- Reference CONTRIBUTING.md for commit format conventions

## Branch Protection Settings (manual, GitHub UI)

To configure in **Settings → Branches → Branch protection rules** for `main`:
- [x] Require a pull request before merging
- [x] Require status checks to pass (select: `build` from ci.yml)
- [x] Require branches to be up to date before merging
- [ ] Add repo owner as a bypass actor (allows direct push when needed)

## What Does NOT Change

- No npm publishing (library is not on npm)
- No deploy steps
- Existing smoke test in CI stays as-is
