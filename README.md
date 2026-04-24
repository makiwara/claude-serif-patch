# claude-serif-patch

Restores the Anthropic-Serif patch for Claude Desktop's Claude Code tab after a software update overwrites `app.asar`.

![Example: Claude Code tab with Anthropic Serif](example.jpg)

## What it does

Claude Desktop renders the Claude Code tab (`/epitaxy/*` route) in Anthropic Sans 13px. This patch switches the main prose to Anthropic Serif 15 / 400 / 1.7 and caps the chat column at 1000 px. Implementation:

- `snippet.css` — CSS rules injected into the existing `webFrame.insertCSS(...)` call in `mainView.js` (webview preload). Left as a fallback; does not win the cascade against claude.ai's utility classes by itself.
- `snippet.js` — IIFE appended after the insertCSS call. Uses `element.style.setProperty(k, v, 'important')` to apply styles inline — beats any stylesheet. A `childList` MutationObserver coalesces work into one `requestAnimationFrame`-scheduled scan per frame, so React hydration and streaming don't pile up work. No attribute observer, no setInterval — both were causing the window to hang during hydration.

Selectors target `.epitaxy-markdown` (prose wrapper around assistant turns) and `.epitaxy-chat-column` (the centered column that gets capped at 1000 px).

## One-time setup

```bash
cd ~/makiwara/claude-serif-patch
npm install              # fetches @electron/asar
```

## Restore after an update

```bash
~/makiwara/claude-serif-patch/patch.sh
```

Flags:

- `--debug` — also inject `inspect.js` (yellow diagnostic panel, double-click any element to see 10 ancestor levels with computed font + classes). Use when selectors stop matching after an Anthropic UI change.
- `--force` — strip any prior injection and re-inject. Use after editing `snippet.js` / `snippet.css` to re-apply without reinstalling from DMG.

Idempotent by default: if the patch marker is already in `mainView.js`, exits cleanly. Otherwise:

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
- `inspect.js` — double-click element inspector, injected with `patch.sh --debug`
- `package.json` — declares `@electron/asar` dependency

## Element inspector

`inspect.js` adds a yellow panel to the top-right of the Claude window. Double-click any element on the page to see 10 ancestor levels with tag, computed font-family / font-size / line-height, and class list.

Use it when the prose stops picking up serif (Anthropic changed class names):

```bash
~/makiwara/claude-serif-patch/patch.sh --force --debug  # inject inspector alongside the serif patch
# double-click the unstyled element in Claude
# update selectors in snippet.js
~/makiwara/claude-serif-patch/patch.sh --force          # re-inject without inspector
```

## When it might break

- Anthropic changes the `.epitaxy-markdown` / `.epitaxy-chat-column` class names. Selectors in `snippet.js` need updating — use `--debug` to find the new ones.
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
