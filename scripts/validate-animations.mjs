#!/usr/bin/env bun
// Repo-wide lint, parses every animation JSON under public/animations/ against
// the runtime zod schema and reports drift.
//
// Motivation: the animation loader (`src/entities/animation/engine/loader.ts`)
// silently returns `null` when a JSON file fails the schema, and the caller
// falls back to "animation not found". A subtle regex violation like
// uppercase IDs (see articulation.json before the fix) meant a shipped
// animation never rendered, and nobody noticed. This script catches those
// at build time.
//
// The schema is the single source of truth. We import it directly so this
// stays in sync with the engine.
//
// Beyond schema parse we also enforce:
// - Duplicate ID detection across `elements[].id`, `chapters[].id`, `effects[].id`
//   (within their own namespaces)
// - Referential integrity: `arrow/line.fromId/toId`, `group.childIds`,
//   `effects[].elementId` must resolve to a real element.
// - Temporal bounds: every `time`, `start`, `end` must be `0..duration`, and
//   `appearance.start < appearance.end`.
//
// Usage:
//   bun scripts/validate-animations.mjs            # report + exit 1 if any
//   bun scripts/validate-animations.mjs --quiet    # exit code only
//   bun scripts/validate-animations.mjs --json     # machine-readable
//   bun scripts/validate-animations.mjs --file <path>   # single JSON

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { animationDefSchema } from '../src/entities/animation/engine/schema/index.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ANIM_DIR = path.join(REPO_ROOT, 'public/animations');

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const JSON_OUT = args.includes('--json');
const fileIdx = args.indexOf('--file');
const SINGLE_FILE = fileIdx >= 0 ? args[fileIdx + 1] : null;

// Push a violation. We tag with severity so the summary can count separately.
function pushErr(bag, file, message) {
  bag.push({ severity: 'error', file, message });
}

// Zod's `issues` array is easier to read one issue per line than the default
// pretty-print. Each issue has `path` (array) + `message`. We collapse to
// `<path>: <message>`.
function formatZodIssues(err) {
  return err.issues.map((i) => {
    const p = Array.isArray(i.path) && i.path.length > 0 ? i.path.join('.') : '<root>';
    return `${p}: ${i.message}`;
  });
}

// Post-schema semantic checks. Runs only if zod parse succeeded, so we can
// assume the structure is well-typed.
function semanticChecks(def, file, bag) {
  const elementIds = new Set();
  const dupElements = new Set();
  for (const el of def.elements) {
    if (elementIds.has(el.id)) dupElements.add(el.id);
    elementIds.add(el.id);
  }
  for (const id of dupElements) pushErr(bag, file, `duplicate element id "${id}"`);

  const chapterIds = new Set();
  for (const ch of def.chapters) {
    if (chapterIds.has(ch.id)) pushErr(bag, file, `duplicate chapter id "${ch.id}"`);
    chapterIds.add(ch.id);
  }

  const effectIds = new Set();
  for (const fx of def.effects) {
    if (effectIds.has(fx.id)) pushErr(bag, file, `duplicate effect id "${fx.id}"`);
    effectIds.add(fx.id);
  }

  // Referential integrity: any ID that points at another element must resolve.
  // `line`/`arrow` accept absolute coordinates OR a fromId/toId; we only
  // validate when the ID form is used.
  for (const el of def.elements) {
    if (el.type === 'line' || el.type === 'arrow') {
      if (el.fromId && !elementIds.has(el.fromId)) {
        pushErr(bag, file, `${el.type} "${el.id}" references unknown fromId "${el.fromId}"`);
      }
      if (el.toId && !elementIds.has(el.toId)) {
        pushErr(bag, file, `${el.type} "${el.id}" references unknown toId "${el.toId}"`);
      }
    }
    if (el.type === 'group') {
      for (const cid of el.childIds ?? []) {
        if (!elementIds.has(cid)) {
          pushErr(bag, file, `group "${el.id}" references unknown childId "${cid}"`);
        }
      }
    }
  }
  for (const fx of def.effects) {
    if (!elementIds.has(fx.elementId)) {
      pushErr(bag, file, `effect "${fx.id}" (${fx.type}) references unknown elementId "${fx.elementId}"`);
    }
  }

  // Temporal bounds. `duration = 0` is legal (still frame) but then no time
  // value may exceed 0. We treat that as a strict bound.
  const D = def.duration;
  const timeInBounds = (t) => t >= 0 && t <= D;
  for (const el of def.elements) {
    for (const [i, ap] of (el.appearances ?? []).entries()) {
      if (!timeInBounds(ap.start)) pushErr(bag, file, `${el.type} "${el.id}" appearance[${i}].start=${ap.start} outside [0, ${D}]`);
      if (!timeInBounds(ap.end)) pushErr(bag, file, `${el.type} "${el.id}" appearance[${i}].end=${ap.end} outside [0, ${D}]`);
      if (ap.start >= ap.end) pushErr(bag, file, `${el.type} "${el.id}" appearance[${i}] has start >= end (${ap.start} >= ${ap.end})`);
    }
    for (const [ti, tr] of (el.tracks ?? []).entries()) {
      let prev = -1;
      for (const [ki, kf] of tr.keyframes.entries()) {
        if (!timeInBounds(kf.time)) {
          pushErr(bag, file, `${el.type} "${el.id}" track[${ti}] (${tr.property}) keyframe[${ki}].time=${kf.time} outside [0, ${D}]`);
        }
        if (kf.time < prev) {
          pushErr(bag, file, `${el.type} "${el.id}" track[${ti}] (${tr.property}) keyframes not time-sorted at index ${ki}`);
        }
        prev = kf.time;
      }
    }
  }
  for (const ch of def.chapters) {
    if (!timeInBounds(ch.time)) pushErr(bag, file, `chapter "${ch.id}" time=${ch.time} outside [0, ${D}]`);
  }
  for (const fx of def.effects) {
    if (!timeInBounds(fx.time)) pushErr(bag, file, `effect "${fx.id}" time=${fx.time} outside [0, ${D}]`);
  }

  // File id should match filename. Filename comes from the caller.
  if (file && def.id) {
    const stem = path.basename(file, '.json');
    if (stem !== def.id) {
      pushErr(bag, file, `filename "${stem}.json" does not match document id "${def.id}"`);
    }
  }
}

async function collectFiles() {
  if (SINGLE_FILE) {
    const abs = path.isAbsolute(SINGLE_FILE) ? SINGLE_FILE : path.join(REPO_ROOT, SINGLE_FILE);
    return [abs];
  }
  try {
    const entries = await readdir(ANIM_DIR);
    return entries.filter((n) => n.endsWith('.json')).map((n) => path.join(ANIM_DIR, n));
  } catch {
    return [];
  }
}

async function main() {
  const files = await collectFiles();
  const violations = [];

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    let json;
    try {
      const text = await readFile(file, 'utf-8');
      json = JSON.parse(text);
    } catch (err) {
      pushErr(violations, rel, `json parse error: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const parsed = animationDefSchema.safeParse(json);
    if (!parsed.success) {
      for (const line of formatZodIssues(parsed.error)) {
        pushErr(violations, rel, `schema: ${line}`);
      }
      continue;
    }
    semanticChecks(parsed.data, rel, violations);
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ total: violations.length, totalFiles: files.length, violations }, null, 2));
  } else if (!QUIET) {
    // Group by file for readable output.
    const byFile = new Map();
    for (const v of violations) {
      const b = byFile.get(v.file) ?? [];
      b.push(v.message);
      byFile.set(v.file, b);
    }
    for (const [file, msgs] of byFile) {
      console.log(`\u001b[31m[animation]\u001b[0m ${file}`);
      for (const m of msgs) console.log(`    ${m}`);
    }
    if (violations.length === 0) {
      console.log(`\u2713 all ${files.length} animation(s) pass schema + semantic checks.`);
    } else {
      console.log(
        `\n\u001b[31m${violations.length} violation(s)\u001b[0m across ${byFile.size} file(s) (of ${files.length} total).`,
      );
    }
  }

  process.exit(violations.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
