#!/usr/bin/env node
// Usage: node patch.mjs <path-to-mainView.js> [--debug]
// Inserts our CSS into the existing webFrame.insertCSS(...) template literal,
// switches cssOrigin to "user", and appends the inline-style applier IIFE.
// With --debug: also appends the double-click inspect panel (inspect.js).
// Idempotent: exits 0 if the marker is already present.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const debug = args.includes('--debug');
const target = args.find(a => !a.startsWith('--'));

if (!target) { console.error('usage: patch.mjs <mainView.js> [--debug]'); process.exit(2); }

const src = fs.readFileSync(target, 'utf8');
const MARKER = '=== local patch: Anthropic Serif';

if (src.includes(MARKER)) {
  console.log('[patch.mjs] already patched — no-op');
  process.exit(0);
}

const cssBody = fs.readFileSync(path.join(HERE, 'snippet.css'), 'utf8').trimEnd();
const jsBody  = fs.readFileSync(path.join(HERE, 'snippet.js'),  'utf8').trimEnd();

let extra = '';
if (debug) {
  extra = '\n' + fs.readFileSync(path.join(HERE, 'inspect.js'), 'utf8').trimEnd() + '\n';
  console.log('[patch.mjs] --debug: inspect panel will be included');
}

// Match: <ident>||<ident>.webFrame.insertCSS(`<body>`,{cssOrigin:"<origin>"});
// Tolerant to optional parens around the call.
const rx = /(\w+)\|\|\(?(\w+)\.webFrame\.insertCSS\(`([\s\S]*?)`,\s*\{\s*cssOrigin\s*:\s*"(\w+)"\s*\}\)\)?;/;
const m = src.match(rx);
if (!m) {
  console.error('[patch.mjs] could not locate webFrame.insertCSS anchor; aborting');
  process.exit(1);
}

const [full, guard, target_ident, origBody] = m;
const mergedBody = origBody.replace(/\n+$/, '') + '\n\n' + cssBody + '\n';
const rebuilt =
  `${guard}||${target_ident}.webFrame.insertCSS(\`${mergedBody}\`,{cssOrigin:"user"});\n` +
  jsBody + '\n' +
  extra;

const out = src.replace(rx, () => rebuilt);
if (out === src) {
  console.error('[patch.mjs] replacement produced no change; aborting');
  process.exit(1);
}

fs.writeFileSync(target, out);
console.log('[patch.mjs] patched');
