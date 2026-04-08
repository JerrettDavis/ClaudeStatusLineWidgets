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
- Do not commit the `dist/` folder — it is auto-built via the `prepare` hook on `npm install`
