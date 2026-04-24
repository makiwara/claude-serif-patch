#!/usr/bin/env bash
# Restore the Anthropic-Serif patch to Claude Desktop after an update.
# Idempotent: safe to run any number of times.
# Prereqs: node, codesign, PlistBuddy. First run: `npm install` in this dir.
set -euo pipefail

DEBUG=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --debug) DEBUG=1 ;;
    --force) FORCE=1 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="/Applications/Claude.app"
ASAR="$APP/Contents/Resources/app.asar"
PLIST="$APP/Contents/Info.plist"

[ -f "$ASAR" ]  || { echo "error: $ASAR not found" >&2; exit 1; }
[ -f "$PLIST" ] || { echo "error: $PLIST not found" >&2; exit 1; }
command -v node     >/dev/null || { echo "error: node not on PATH" >&2; exit 1; }
command -v codesign >/dev/null || { echo "error: codesign not on PATH" >&2; exit 1; }

ASAR_LIB="$HERE/node_modules/@electron/asar"
ASAR_BIN="$ASAR_LIB/bin/asar.js"

if [ ! -x "$ASAR_BIN" ] && [ ! -f "$ASAR_BIN" ]; then
  echo "note: @electron/asar not installed locally. Running 'npm install'…"
  ( cd "$HERE" && npm install --silent )
fi

WORK="$(mktemp -d -t claude-serif-patch.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

echo "[1/9] extracting asar"
node "$ASAR_BIN" extract "$ASAR" "$WORK/app"

MAINVIEW="$WORK/app/.vite/build/mainView.js"
[ -f "$MAINVIEW" ] || { echo "error: mainView.js missing after extract" >&2; exit 1; }

# Short-circuit: if all requested injections are already present, skip everything.
# --force bypasses this (used to re-inject with updated snippets).
if [ "$FORCE" -eq 0 ] && grep -q "=== local patch: Anthropic Serif" "$MAINVIEW"; then
  if [ "$DEBUG" -eq 0 ] || grep -q "=== diagnostic panel" "$MAINVIEW"; then
    echo "       already patched — no changes needed. exiting."
    exit 0
  fi
fi

echo "[2/9] patching mainView.js"
PATCH_ARGS=()
[ "$DEBUG" -eq 1 ] && PATCH_ARGS+=(--debug)
[ "$FORCE" -eq 1 ] && PATCH_ARGS+=(--force)
node "$HERE/patch.mjs" "$MAINVIEW" ${PATCH_ARGS[@]+"${PATCH_ARGS[@]}"}

echo "[3/9] JS syntax check"
node --check "$MAINVIEW"

echo "[4/9] quitting Claude if running"
pkill -x Claude 2>/dev/null || true

echo "[5/9] repacking asar"
node "$ASAR_BIN" pack "$WORK/app" "$WORK/app.asar.new" --unpack "{**/*.node,**/spawn-helper}"

echo "[6/9] computing new ASAR header hash"
NEW_HASH="$(node -e "
  const a = require('$ASAR_LIB/lib/asar.js');
  const c = require('crypto');
  console.log(c.createHash('sha256').update(a.getRawHeader('$WORK/app.asar.new').headerString).digest('hex'));
")"
echo "       hash=$NEW_HASH"

echo "[7/9] installing asar + updating Info.plist"
cp "$WORK/app.asar.new" "$ASAR"
/usr/libexec/PlistBuddy -c \
  "Set :ElectronAsarIntegrity:Resources/app.asar:hash $NEW_HASH" "$PLIST"

echo "[8/9] re-signing ad-hoc + clearing quarantine"
codesign --force --deep --sign - "$APP" >/dev/null 2>&1
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true

echo "[9/9] verifying signature"
codesign --verify --deep "$APP"

echo "done. Launch Claude normally."
