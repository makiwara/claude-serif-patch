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
    const before = working;
    // Strip the style-element injector block (newer, anchor-independent form).
    working = working.replace(
      /\n?\/\* === local patch: Anthropic Serif[\s\S]*?\n\}\)\(\);\n?/,
      ''
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

  // The preload no longer exposes a webFrame.insertCSS(`...`) template literal
  // to splice into (removed upstream ~v1.14271). Inject a self-contained block
  // at end of file instead: a <style> element carrying snippet.css (kept as a
  // defence-in-depth fallback) plus the inline-style applier IIFE that actually
  // wins claude.ai's cascade. Both blocks close with `})();` on their own line
  // so the --force strip regexes above can find and remove them.
  const styleInjector =
    '/* === local patch: Anthropic Serif (style-element injector) === */\n' +
    '(function(){try{\n' +
    '  var css = ' + JSON.stringify(cssBody) + ';\n' +
    '  function add(){try{\n' +
    '    if(document.getElementById("__anthropicSerifPatch"))return;\n' +
    '    var s=document.createElement("style");\n' +
    '    s.id="__anthropicSerifPatch"; s.textContent=css;\n' +
    '    (document.head||document.documentElement).appendChild(s);\n' +
    '  }catch(e){}}\n' +
    '  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add);\n' +
    '  else add();\n' +
    '}catch(e){}\n' +
    '})();\n';

  const block = '\n' + styleInjector + jsBody + '\n';

  const smuRx = /\n\/\/# sourceMappingURL=[^\n]*\s*$/;
  const smu = working.match(smuRx);
  if (smu) {
    working = working.replace(smuRx, '\n' + block + smu[0]);
  } else {
    working = working.replace(/\s*$/, '\n' + block + '\n');
  }
  console.log('[patch.mjs] injected serif patch (style-element + applier)');
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
