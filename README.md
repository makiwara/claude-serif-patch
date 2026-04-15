# claude-serif-patch

Restores the Anthropic-Serif patch for Claude Desktop's Claude Code tab after a software update overwrites `app.asar`.

## What it does

Claude Desktop renders the Claude Code tab (`/epitaxy/*` route) in Anthropic Sans 13px. This patch switches the main prose to Anthropic Serif 15 / 400 / 1.7 and caps the chat column at 1000 px. Implementation:

- `snippet.css` — CSS rules injected into the existing `webFrame.insertCSS(...)` call in `mainView.js` (webview preload). Left as a fallback; does not win the cascade against claude.ai's utility classes by itself.
- `snippet.js` — IIFE appended after the insertCSS call. Uses `element.style.setProperty(k, v, 'important')` to apply styles inline — beats any stylesheet. A MutationObserver reapplies when claude.ai re-renders.

## One-time setup

```bash
cd ~/makiwara/claude-serif-patch
npm install              # fetches @electron/asar
```

## Restore after an update

```bash
~/makiwara/claude-serif-patch/patch.sh
```

Idempotent: if the patch marker is already in `mainView.js`, exits cleanly. Otherwise:

1. Extracts `/Applications/Claude.app/Contents/Resources/app.asar`
2. Runs `patch.mjs` to inject CSS + append the IIFE
3. Repacks the asar (native binaries stay unpacked)
4. Recomputes the ASAR header SHA-256 and writes it into `Info.plist:ElectronAsarIntegrity:Resources/app.asar:hash`
5. Re-signs the bundle ad-hoc (`codesign --force --deep --sign -`)
6. Clears the quarantine xattr
7. Verifies the signature

## Files

- `patch.sh` — driver, run this
- `patch.mjs` — Node script that edits `mainView.js` in place
- `snippet.css` — CSS injected into `webFrame.insertCSS(...)`
- `snippet.js` — IIFE appended after the insertCSS statement
- `package.json` — declares `@electron/asar` dependency

## When it might break

- Anthropic changes the `text-assistant-primary` / `text-body.text-pretty` / `.epitaxy-chat-column` class names. Selectors in `snippet.js` need updating.
- Bundler restructures `mainView.js` so the regex in `patch.mjs` no longer matches the `webFrame.insertCSS` call. `patch.mjs` will exit non-zero without touching the bundle.
- Electron adds per-file (not just per-asar-header) integrity verification at launch. Current Claude Desktop uses a single top-level hash, which this script updates.
- Claude is re-signed with a newer Developer-ID and something in the app depends on the original signature (e.g. keychain items scoped to the team ID). Ad-hoc re-signing loses notarisation; any such features stop working. No workaround short of Anthropic shipping the change upstream.

## Rollback

Reinstall Claude Desktop from the DMG; the installer overwrites `app.asar`, `Info.plist`, and the signature in one shot. Or, if you still have the per-run backup files:

```bash
cp /Applications/Claude.app/Contents/Resources/app.asar.backup2 /Applications/Claude.app/Contents/Resources/app.asar
cp /Applications/Claude.app/Contents/Info.plist.backup          /Applications/Claude.app/Contents/Info.plist
codesign --force --deep --sign - /Applications/Claude.app
```
