#!/usr/bin/env bun
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SCAN_DIRS = [
  { dir: 'src/content', exts: ['.md', '.mdx'] },
  { dir: 'src/shared/ui', exts: ['.astro', '.tsx'] },
  { dir: 'src/shared/analytics', exts: ['.astro'] },
  { dir: 'src/widgets', exts: ['.astro', '.tsx'] },
  { dir: 'src/features', exts: ['.astro', '.tsx'] },
  { dir: 'src/entities', exts: ['.astro', '.tsx'] },
  { dir: 'src/layouts', exts: ['.astro'] },
  { dir: 'src/pages', exts: ['.astro'] },
];

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const JSON_OUT = args.has('--json');
const VERBOSE = args.has('--verbose');

async function walk(dir, exts) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walk(full, exts)));
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

// Markdown image: ![alt](src "title?"), alt may be empty.
// Captures: 1=alt, 2=src
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// HTML <img …>, broad match, then inspect attributes.
const HTML_IMG_TAG_RE = /<img\b([^>]*?)\/?>/gi;
const ATTR_ALT_RE = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/i;
const ATTR_SRC_RE = /\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/i;

// JSX <Image …> from astro/integrations.
const JSX_IMAGE_TAG_RE = /<Image\b([^>]*?)\/?>/g;

function lineOf(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function matchAttr(attrs, re) {
  const m = re.exec(attrs);
  if (!m) return undefined;
  return m[1] ?? m[2] ?? m[3] ?? '';
}

function classify(altValue) {
  if (altValue === undefined) return 'MISSING';
  if (altValue.trim().length === 0) return 'EMPTY';
  return 'OK';
}

function isDataUri(src) {
  return src.startsWith('data:');
}

// Heuristic: site chrome icons that are decorative by intent.
const DECORATIVE_SRC_PATTERNS = [
  /apple-touch-icon/,
  /favicon/,
  /\.ico$/,
  /\/og\/.*\.png$/,
];

function looksDecorative(src) {
  if (!src) return true;
  return DECORATIVE_SRC_PATTERNS.some((re) => re.test(src));
}

async function scanFile(file) {
  const raw = await fs.readFile(file, 'utf-8');
  const findings = [];

  if (file.endsWith('.md') || file.endsWith('.mdx')) {
    const reMd = new RegExp(MD_IMAGE_RE.source, MD_IMAGE_RE.flags);
    let m;
    while ((m = reMd.exec(raw)) !== null) {
      const alt = m[1];
      const src = m[2];
      findings.push({
        kind: 'md-image',
        line: lineOf(raw, m.index),
        classification: classify(alt),
        alt,
        src,
        decorative: looksDecorative(src),
      });
    }
  }

  const reImg = new RegExp(HTML_IMG_TAG_RE.source, HTML_IMG_TAG_RE.flags);
  let mImg;
  while ((mImg = reImg.exec(raw)) !== null) {
    const attrs = mImg[1] ?? '';
    const alt = matchAttr(attrs, ATTR_ALT_RE);
    const src = matchAttr(attrs, ATTR_SRC_RE) ?? '';
    if (isDataUri(src)) continue;
    findings.push({
      kind: 'html-img',
      line: lineOf(raw, mImg.index),
      classification: classify(alt),
      alt,
      src,
      decorative: looksDecorative(src),
    });
  }

  if (file.endsWith('.astro') || file.endsWith('.tsx') || file.endsWith('.mdx')) {
    const reImage = new RegExp(JSX_IMAGE_TAG_RE.source, JSX_IMAGE_TAG_RE.flags);
    let mImage;
    while ((mImage = reImage.exec(raw)) !== null) {
      const attrs = mImage[1] ?? '';
      const alt = matchAttr(attrs, ATTR_ALT_RE);
      const src = matchAttr(attrs, ATTR_SRC_RE) ?? '';
      findings.push({
        kind: 'jsx-Image',
        line: lineOf(raw, mImage.index),
        classification: classify(alt),
        alt,
        src,
        decorative: looksDecorative(src),
      });
    }
  }

  return findings;
}

async function main() {
  const allFindings = [];
  for (const { dir, exts } of SCAN_DIRS) {
    const fullDir = path.join(REPO_ROOT, dir);
    const files = await walk(fullDir, exts);
    for (const file of files) {
      const findings = await scanFile(file);
      const rel = path.relative(REPO_ROOT, file);
      for (const f of findings) {
        allFindings.push({ file: rel, ...f });
      }
    }
  }

  const summary = {
    total: allFindings.length,
    ok: 0,
    empty: 0,
    missing: 0,
    decorativeEmpty: 0,
    nonDecorativeEmpty: 0,
  };
  for (const f of allFindings) {
    if (f.classification === 'OK') summary.ok++;
    else if (f.classification === 'EMPTY') {
      summary.empty++;
      if (f.decorative) summary.decorativeEmpty++;
      else summary.nonDecorativeEmpty++;
    } else if (f.classification === 'MISSING') summary.missing++;
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ summary, findings: allFindings }, null, 2));
    return;
  }

  console.log('Image alt audit\n');
  console.log(`Total image references : ${summary.total}`);
  console.log(`  OK (non-empty alt)   : ${summary.ok}`);
  console.log(`  EMPTY (alt="")       : ${summary.empty}`);
  console.log(`    decorative-looking : ${summary.decorativeEmpty}`);
  console.log(`    needs attention    : ${summary.nonDecorativeEmpty}`);
  console.log(`  MISSING (no alt attr): ${summary.missing}\n`);

  const attention = allFindings.filter(
    (f) =>
      f.classification === 'MISSING' ||
      (f.classification === 'EMPTY' && !f.decorative),
  );

  if (attention.length > 0) {
    console.log(`Findings needing attention (${attention.length}):\n`);
    const groupedByFile = new Map();
    for (const f of attention) {
      let list = groupedByFile.get(f.file);
      if (!list) {
        list = [];
        groupedByFile.set(f.file, list);
      }
      list.push(f);
    }
    const sorted = [...groupedByFile.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [file, list] of sorted) {
      console.log(`  ${file}  (${list.length})`);
      if (VERBOSE) {
        for (const f of list) {
          console.log(`    L${f.line}  [${f.classification}]  src=${f.src || '(none)'}`);
        }
      }
    }
  }

  if (STRICT && attention.length > 0) {
    console.error(`\nSTRICT mode: ${attention.length} alt issue(s) need attention.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
