#!/usr/bin/env bun
// One-off codemod: wrap unquoted mermaid node/edge labels that contain
// parentheses (or other tokens mermaid's flowchart parser rejects) in
// double quotes.
//
// Motivation: `A[foo (bar)]` is not valid mermaid, but the mistake is
// invisible during authoring because we render diagrams client-side via
// CDN, and the browser silently falls back to an inline error box. See
// scripts/validate-mermaid.mjs for the detection side of this loop.
//
// Approach: for each ```mermaid``` fenced block, scan each line for
//   - `X[label]` node shapes (rectangle)
//   - `X{label}` diamond nodes
//   - `X([label])` stadium / round nodes are already quoted by users
//     when needed; we skip anything that already starts with a quote.
//   - `-->|label|` edge labels
// If the raw label text contains an unescaped `(` or `)` (or any other
// hazardous token) and the label is not already wrapped in `"..."`, we
// wrap it in double quotes. Any pre-existing `"` in the label is
// replaced with the mermaid HTML entity `#quot;` so the wrapping is
// well-formed.
//
// After the codemod, re-run `bun scripts/validate-mermaid.mjs`. Any
// remaining failures need manual attention (e.g. genuinely malformed
// arrows, unknown diagram type).
//
// Usage:
//   bun scripts/fix-mermaid-labels.mjs           # apply in place
//   bun scripts/fix-mermaid-labels.mjs --dry     # print diff, don't write
//   bun scripts/fix-mermaid-labels.mjs --file <path>

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const fileIdx = args.indexOf('--file');
const SINGLE_FILE = fileIdx >= 0 ? args[fileIdx + 1] : null;

// Tokens mermaid's flowchart parser rejects inside an unquoted label.
// - `(` / `)` open a shape (`(text)` = stadium, `((text))` = circle),
//   so a raw `(` mid-label is treated as a shape delimiter.
// - `{` / `}` are DIAMOND shape delimiters; a raw `{` mid-label
//   triggers `DIAMOND_START` errors (redis-sets.mdx line 117).
// - `"` starts a string literal; a bare `"` mid-label triggers `STR`
//   parser errors like slo-sli-error-budget.mdx line 24.
// We deliberately leave labels alone that only contain safe punctuation
// (`.`, `,`, `/`, etc.) since quoting those would be pure churn.
function labelNeedsQuotes(raw) {
  return /[(){}"]/.test(raw);
}

// Wrap the label in `"..."`, encoding any inner `"` as `#quot;` (the
// mermaid HTML entity for a double quote inside a quoted label).
function quoteLabel(raw) {
  const inner = raw.replace(/"/g, '#quot;');
  return `"${inner}"`;
}

// Match `[label]`, `{label}`, `|label|` where the label is not already
// wrapped in `"..."`. We do not touch `[(...)]` (cylinder DB shape,
// mermaid parses the inner `(...)` as its shape), `[[...]]`, or
// `[/.../]`. Regex-based transforms are per-line to avoid matching
// across fences.
const NODE_BRACKET_RE = /(\w)\[([^\][]+)\]/g;        // A[label]
const NODE_BRACE_RE = /(\w)\{([^{}]+)\}/g;           // A{label}
const EDGE_PIPE_RE = /\|([^|\n]+)\|/g;               // ...|label|...

function looksAlreadyQuoted(text) {
  return /^"[\s\S]*"$/.test(text.trim());
}

function transformLine(line) {
  // Skip lines that look like they are inside a subgraph header, class
  // definition, or comment. Those don't take our shape syntax.
  const stripped = line.trim();
  if (
    stripped.startsWith('%%') ||
    stripped.startsWith('classDef') ||
    stripped.startsWith('linkStyle') ||
    stripped.startsWith('style ')
  ) {
    return line;
  }

  // Process brackets/braces FIRST, then hide the resulting spans behind
  // placeholders so the pipe scan cannot look inside them. This matters
  // when a *quoted* label contains `|` (e.g. `["a|b|c"]` in
  // b-plus-tree-internals): without shielding, the pipe regex sees a
  // stray `|b|` and wraps it as an edge label, corrupting the diagram.
  const shelved = [];
  const PLACEHOLDER = (i) => `\uE000${i}\uE001`;

  let out = line.replace(NODE_BRACKET_RE, (m, prefix, inner) => {
    let replaced;
    // Cylinder DB: `[(text)]`. The `(...)` here is the shape, not a
    // literal label token. Leave alone.
    if (inner.startsWith('(') && inner.endsWith(')')) replaced = m;
    else if (looksAlreadyQuoted(inner)) replaced = m;
    else if (!labelNeedsQuotes(inner)) replaced = m;
    else replaced = `${prefix}[${quoteLabel(inner)}]`;
    shelved.push(replaced);
    return PLACEHOLDER(shelved.length - 1);
  });

  out = out.replace(NODE_BRACE_RE, (m, prefix, inner) => {
    let replaced;
    if (looksAlreadyQuoted(inner)) replaced = m;
    else if (!labelNeedsQuotes(inner)) replaced = m;
    else replaced = `${prefix}{${quoteLabel(inner)}}`;
    shelved.push(replaced);
    return PLACEHOLDER(shelved.length - 1);
  });

  out = out.replace(EDGE_PIPE_RE, (m, inner) => {
    if (looksAlreadyQuoted(inner)) return m;
    if (!labelNeedsQuotes(inner)) return m;
    return `|${quoteLabel(inner)}|`;
  });

  // Restore shelved node shapes.
  out = out.replace(/\uE000(\d+)\uE001/g, (_, idx) => shelved[Number(idx)]);
  return out;
}

function transformBlock(blockSource) {
  return blockSource
    .split('\n')
    .map((line) => transformLine(line))
    .join('\n');
}

// Replace every ```mermaid ...``` block in the file with a transformed
// version. Non-mermaid content is preserved byte-for-byte.
function transformFile(source) {
  const lines = source.split('\n');
  const out = [];
  let inBlock = false;
  let buf = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!inBlock) {
      out.push(line);
      if (/^```mermaid\s*$/.test(line)) {
        inBlock = true;
        buf = [];
      }
    } else if (/^```\s*$/.test(line)) {
      const transformed = transformBlock(buf.join('\n'));
      out.push(transformed);
      out.push(line);
      inBlock = false;
      buf = [];
    } else {
      buf.push(line);
    }
  }
  return out.join('\n');
}

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

async function main() {
  const files = SINGLE_FILE
    ? [path.isAbsolute(SINGLE_FILE) ? SINGLE_FILE : path.join(REPO_ROOT, SINGLE_FILE)]
    : await walk(CONTENT_DIR, []);

  let changed = 0;
  for (const file of files) {
    let body;
    try {
      body = await readFile(file, 'utf-8');
    } catch {
      continue;
    }
    // Skip files with no mermaid fence.
    if (!body.includes('```mermaid')) continue;
    const next = transformFile(body);
    if (next !== body) {
      changed += 1;
      const rel = path.relative(REPO_ROOT, file);
      if (DRY) {
        console.log(`--- ${rel} (would change)`);
        // Print a small unified-ish diff so a reviewer can eyeball it.
        const oldLines = body.split('\n');
        const newLines = next.split('\n');
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i += 1) {
          if (oldLines[i] !== newLines[i]) {
            console.log(`  - ${oldLines[i] ?? ''}`);
            console.log(`  + ${newLines[i] ?? ''}`);
          }
        }
      } else {
        await writeFile(file, next, 'utf-8');
        console.log(`\u2713 ${rel}`);
      }
    }
  }
  console.log(`\n${changed} file(s) ${DRY ? 'would be' : 'were'} modified.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
