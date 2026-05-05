# Replace postinstall blob with proper script (GitHub URL installs)

## Problem

GitHub URL `npm install` tarballs (e.g. `npm install github:user/repo`) strip the `scripts/` directory, making `scripts/postinstall.js` unavailable post-install.

The current workaround encodes the entire postinstall logic as a base64 blob inside `package.json`'s `postinstall` field. This is:
- Unauditable (can't read the code without decoding)
- Unmaintainable (editing requires re-encoding)
- A bad security signal

## Solution

Move the install logic to a root-level JS file (`install-global.js`) and add it to `files`.

**Why this works:** npm's tarball construction for GitHub URL installs reliably includes:
- Files/dirs listed in `files` array
- Root-level JS files (unlike `scripts/` subdirectory)

The `files` array already lists `bin/`, `dist/`, `scripts/`, etc. Adding `install-global.js` at the project root to both `files` and the `postinstall` field places the logic outside the stripped `scripts/` directory.

## Changes

### `install-global.js` (new)
Readable ESM source — exact same logic currently encoded in the blob, moved to the project root.

### `package.json`
- `postinstall` field: replace base64 blob with `node install-global.js`
- `files` array: add `install-global.js`

### No changes needed
- `scripts/postinstall.js` — stays as-is for local/global npm installs (still works since `scripts/` is present in those contexts)
- `hooks/hooks.json` — unrelated to this change
- `scripts/configure-statusline.js` — runs via hook, not postinstall

## Testing

```bash
npm pack --dry-run  # verify install-global.js appears in tarball
# Then test a full GitHub URL install in a temp directory
```

## Commit

`fix(postinstall): replace base64 blob with readable install-global.js script`