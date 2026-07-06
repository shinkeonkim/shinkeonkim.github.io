#!/usr/bin/env bun
// Repo-wide lint, parses every ```mermaid``` fence in src/content/**/*.{md,mdx}
// via mermaid.parse() and fails on any syntax error.
//
// The blog renders Mermaid diagrams client-side (see
// src/features/mermaid/lib/mermaid-render.ts loading the CDN ESM build). A
// bad diagram silently falls back to an inline error box at runtime,
// which is easy to miss. This script catches the same errors at build
// time so a broken fence blocks the deploy the same way an em-dash does.
//
// Common failure patterns caught:
// - unquoted parentheses inside `[label]` (e.g. `A[foo (bar)]`)
// - unquoted `{}`, `<>`, `#`, `|`, `-` inside node labels
// - malformed edge syntax or arrow direction
// - unknown diagram type / typo in first token
//
// The mermaid npm package version MUST match the CDN version loaded in
// src/features/mermaid/lib/mermaid-render.ts (currently 11.6.0). If those
// drift, valid diagrams here can still break in the browser and vice
// versa.
//
// Usage:
//   bun scripts/validate-mermaid.mjs           # report + exit 1 if any
//   bun scripts/validate-mermaid.mjs --quiet   # exit code only
//   bun scripts/validate-mermaid.mjs --json    # machine-readable
//   bun scripts/validate-mermaid.mjs --file <path>  # single file

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Window } from 'happy-dom';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.startsWith('--file')));
const QUIET = flags.has('--quiet');
const JSON_OUT = flags.has('--json');
const fileIdx = args.indexOf('--file');
const SINGLE_FILE = fileIdx >= 0 ? args[fileIdx + 1] : null;

// Set up a minimal DOM so mermaid can import + parse. Mermaid probes
// several DOM globals at parse time (Element/Node for its DagreLayout
// wiring, MutationObserver for its themed re-render bookkeeping) even
// when we ask for parse-only. Without these it throws opaque
// "Element is not defined" errors for otherwise valid diagrams, which
// masks real syntax errors.
const window = new Window();
const g = /** @type {any} */ (globalThis);
g.window = window;
g.document = window.document;
g.navigator = window.navigator;
g.Element = window.Element;
g.HTMLElement = window.HTMLElement;
g.SVGElement = window.SVGElement;
g.Node = window.Node;
g.DocumentFragment = window.DocumentFragment;
g.MutationObserver = window.MutationObserver;
g.getComputedStyle = window.getComputedStyle?.bind(window);

const { default: mermaid } = await import('mermaid');
// initialize() writes into a shared config object; we call it once so
// parse() has a known baseline (securityLevel + suppressErrorRendering).
// This must not throw for well-known diagram types.
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true });

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(full, out);
    } else if (ent.isFile() && /\.(md|mdx)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

// Extract every fenced ```mermaid ...``` block with its 1-based start line.
// We deliberately handle only the common ``` fence, not ~~~. Blog convention
// uses ``` everywhere.
function extractBlocks(source) {
  const blocks = [];
  const lines = source.split('\n');
  let inBlock = false;
  let startLine = 0;
  let buf = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!inBlock) {
      // Opening fence must begin at column 0 to skip mermaid mentions
      // inside prose or nested inside indented lists (which mermaid does
      // not read as a fence anyway).
      const m = /^```mermaid\s*$/.exec(line);
      if (m) {
        inBlock = true;
        startLine = i + 2; // first content line (1-based)
        buf = [];
      }
    } else if (/^```\s*$/.test(line)) {
      blocks.push({ startLine, source: buf.join('\n') });
      inBlock = false;
      buf = [];
    } else {
      buf.push(line);
    }
  }
  return blocks;
}

// mermaid.parse() throws on syntax errors. It returns { diagramType }
// (or void in older releases). We only care whether it threw.
async function parseOne(src) {
  try {
    await mermaid.parse(src);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, msg };
  }
}

async function collectFiles() {
  if (SINGLE_FILE) {
    const abs = path.isAbsolute(SINGLE_FILE) ? SINGLE_FILE : path.join(REPO_ROOT, SINGLE_FILE);
    return [abs];
  }
  return walk(CONTENT_DIR, []);
}

async function main() {
  const files = await collectFiles();
  const failures = [];
  let totalBlocks = 0;

  for (const file of files) {
    let body;
    try {
      body = await readFile(file, 'utf-8');
    } catch {
      continue;
    }
    const blocks = extractBlocks(body);
    for (const block of blocks) {
      totalBlocks += 1;
      const res = await parseOne(block.source);
      if (!res.ok) {
        failures.push({
          file: path.relative(REPO_ROOT, file),
          line: block.startLine,
          message: res.msg,
          source: block.source,
        });
      }
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ total: failures.length, totalBlocks, failures }, null, 2));
  } else if (!QUIET) {
    for (const f of failures) {
      // First error line only + a short snippet keeps CI logs scannable.
      const firstLine = f.message.split('\n')[0];
      console.log(`\u001b[31m[mermaid]\u001b[0m ${f.file}:${f.line}: ${firstLine}`);
      const detail = f.message
        .split('\n')
        .slice(1, 4)
        .map((l) => `    ${l}`)
        .join('\n');
      if (detail) console.log(detail);
    }
    if (failures.length === 0) {
      console.log(`\u2713 all ${totalBlocks} mermaid diagram(s) parse across ${files.length} file(s).`);
    } else {
      console.log(
        `\n\u001b[31m${failures.length} mermaid diagram(s) failed to parse\u001b[0m across ${new Set(failures.map((f) => f.file)).size} file(s) (of ${totalBlocks} total).`,
      );
      console.log(`Fix each fence so mermaid.parse() succeeds, or the browser will render an inline error box.`);
    }
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
