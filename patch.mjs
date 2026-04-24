#!/usr/bin/env node
// Usage: node patch.mjs <path-to-mainView.js> [--debug] [--force]
// Inserts our CSS into the existing webFrame.insertCSS(...) template literal,
// switches cssOrigin to "user", and appends the inline-style applier IIFE.
// With --debug, also appends inspect.js (double-click element inspector).
// With --force, strips any prior injection first, then re-injects.
// Idempotent: each injection is marker-guarded.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--'));
const DEBUG = args.includes('--debug');
const FORCE = args.includes('--force');

if (!target) { console.error('usage: patch.mjs <mainView.js> [--debug] [--force]'); process.exit(2); }

const MARKER_SERIF   = '=== local patch: Anthropic Serif';
const MARKER_INSPECT = '=== diagnostic panel: double-click';

let working = fs.readFileSync(target, 'utf8');
let hadSerif   = working.includes(MARKER_SERIF);
let hadInspect = working.includes(MARKER_INSPECT);

if (FORCE) {
  if (hadSerif) {
    // Strip appended CSS from inside the insertCSS template literal.
    const before = working;
    working = working.replace(
      /\n\n\/\* === local patch: Anthropic Serif[\s\S]*?(`,\s*\{\s*cssOrigin\s*:\s*")user("\s*\}\)\)?;)/,
      '$1author$2'
    );
    // Strip the following inline-style applier IIFE.
    working = working.replace(
      /\n?\/\* === local patch: inline-style[\s\S]*?\n\}\)\(\);\n?/,
      ''
    );
    if (working !== before) {
      console.log('[patch.mjs] stripped prior serif injection');
      hadSerif = false;
    }
  }
  if (hadInspect) {
    const before = working;
    working = working.replace(
      /\n?\/\* === diagnostic panel[\s\S]*?\n\}\)\(\);\n?/,
      ''
    );
    if (working !== before) {
      console.log('[patch.mjs] stripped prior inspector injection');
      hadInspect = false;
    }
  }
}

const needSerif   = !hadSerif;
const needInspect = DEBUG && !hadInspect;

if (!needSerif && !needInspect) {
  console.log('[patch.mjs] already patched — no-op');
  process.exit(0);
}

if (needSerif) {
  const cssBody = fs.readFileSync(path.join(HERE, 'snippet.css'), 'utf8').trimEnd();
  const jsBody  = fs.readFileSync(path.join(HERE, 'snippet.js'),  'utf8').trimEnd();

  // Match: <ident>||<ident>.webFrame.insertCSS(`<body>`,{cssOrigin:"<origin>"});
  const rx = /(\w+)\|\|\(?(\w+)\.webFrame\.insertCSS\(`([\s\S]*?)`,\s*\{\s*cssOrigin\s*:\s*"(\w+)"\s*\}\)\)?;/;
  const m = working.match(rx);
  if (!m) {
    console.error('[patch.mjs] could not locate webFrame.insertCSS anchor; aborting');
    process.exit(1);
  }
  const [, guard, target_ident, origBody] = m;
  const mergedBody = origBody.replace(/\n+$/, '') + '\n\n' + cssBody + '\n';
  const rebuilt =
    `${guard}||${target_ident}.webFrame.insertCSS(\`${mergedBody}\`,{cssOrigin:"user"});\n` +
    jsBody + '\n';

  const next = working.replace(rx, () => rebuilt);
  if (next === working) {
    console.error('[patch.mjs] serif replacement produced no change; aborting');
    process.exit(1);
  }
  working = next;
  console.log('[patch.mjs] injected serif patch');
}

if (needInspect) {
  const inspectBody = fs.readFileSync(path.join(HERE, 'inspect.js'), 'utf8').trimEnd();
  // Prefer inserting just before the sourceMappingURL comment; else append.
  const smuRx = /\n\/\/# sourceMappingURL=[^\n]*\s*$/;
  const smu = working.match(smuRx);
  if (smu) {
    working = working.replace(smuRx, '\n' + inspectBody + smu[0]);
  } else {
    working = working.replace(/\s*$/, '\n' + inspectBody + '\n');
  }
  console.log('[patch.mjs] injected inspector');
}

fs.writeFileSync(target, working);
console.log('[patch.mjs] patched');
