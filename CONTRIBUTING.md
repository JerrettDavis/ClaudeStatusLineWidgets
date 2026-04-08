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

BREAKING CHANGE: widget render() now receives WidgetContext instead of raw segments
```

## What Triggers a Release

A release is created when commits with `feat:` or `fix:` (or breaking) prefixes land on `main`. Commits with `chore:`, `docs:`, `ci:`, `refactor:`, `style:`, or `test:` prefixes do not trigger a release.

The release workflow automatically:
1. Bumps the version (patch/minor/major) in `package.json`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`
2. Updates `CHANGELOG.md`
3. Creates a GitHub Release with generated notes

Never bump versions or edit `CHANGELOG.md` manually.

## Branch Protection

The `main` branch requires:
- A passing CI run (build + smoke test on Node 18/20/22)
- A pull request before merging

### Setup (repo owner, one-time)

In GitHub → **Settings → Branches → Add rule** for `main`:

- [x] Require a pull request before merging
- [x] Require status checks to pass → select the `build` job
- [x] Require branches to be up to date before merging
- Under "Allow specific actors to bypass" → add yourself for direct-push access when needed
