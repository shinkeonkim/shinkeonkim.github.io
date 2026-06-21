#!/usr/bin/env node
// Migrate "## 참고" / "## 참고자료" markdown sections in wiki pages
// to frontmatter `references:` array (inline format).
// Known doc domains are converted to id-based references.

import fs from 'node:fs';
import path from 'node:path';

const WIKI_DIR = path.resolve(process.cwd(), 'src/content/wiki');
const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_DIR = process.argv.find((a) => a.startsWith('--dir='))?.slice(6);

// Domain → source id mapping for id-based references
const DOMAIN_TO_SOURCE = [
  // Order matters - longer/more specific first
  { pattern: /^https:\/\/docs\.python\.org\//, id: 'python-docs' },
  { pattern: /^https:\/\/peps\.python\.org\//, id: 'python-peps' },
  { pattern: /^https:\/\/docs\.djangoproject\.com\//, id: 'django-docs' },
  { pattern: /^https:\/\/docs\.spring\.io\//, id: 'spring-docs' },
  { pattern: /^https:\/\/guides\.rubyonrails\.org\//, id: 'rails-guides' },
  { pattern: /^https:\/\/api\.rubyonrails\.org\//, id: 'rails-api' },
  { pattern: /^https:\/\/www\.django-rest-framework\.org\//, id: 'drf-docs' },
  { pattern: /^https:\/\/www\.postgresql\.org\/docs/, id: 'postgresql-docs' },
  { pattern: /^https:\/\/dev\.mysql\.com\/doc/, id: 'mysql-docs' },
  { pattern: /^https:\/\/developer\.mozilla\.org\//, id: 'mdn-web-docs' },
  { pattern: /^https:\/\/pandas\.pydata\.org\/docs/, id: 'pandas-docs' },
];

function matchSource(url) {
  for (const { pattern, id } of DOMAIN_TO_SOURCE) {
    if (pattern.test(url)) return id;
  }
  return null;
}

// Parse the references markdown section into structured items
function parseReferenceLine(line) {
  // Match: - [Title](URL) optional description
  const m = line.match(/^\s*-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*[-:]\s*(.+))?$/);
  if (!m) return null;
  const [, title, url, description] = m;
  return {
    title: title.trim(),
    url: url.trim(),
    description: description?.trim(),
  };
}

function parseWikilink(line) {
  // Match: - [[wikilink]] optional description (separator: - or : or ,)
  const m = line.match(/^\s*-\s*\[\[([^\]]+)\]\](?:\s*[-:,]\s*(.+))?$/);
  if (!m) return null;
  return { wikilink: m[1].trim(), description: m[2]?.trim() };
}

function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return null;
  return {
    raw: fmMatch[0],
    fm: fmMatch[1],
    body: content.slice(fmMatch[0].length),
  };
}

function frontmatterHasReferences(fm) {
  return /^references:\s*$/m.test(fm) || /^references:\s*\[/m.test(fm);
}

function processFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');

  const parsed = parseFrontmatter(content);
  if (!parsed) return { skipped: 'no-frontmatter' };

  // Skip if already has references field (django.mdx, signals-internal already converted)
  if (frontmatterHasReferences(parsed.fm)) return { skipped: 'has-references' };

  // Find "## 참고" or "## 참고자료" section (last occurrence)
  // It must be at the end of the file (only references inside)
  const sectionRe = /\n##\s*(참고(?:자료)?)\s*\n([\s\S]*?)$/;
  const sectionMatch = parsed.body.match(sectionRe);
  if (!sectionMatch) return { skipped: 'no-section' };

  const sectionBody = sectionMatch[2];
  const lines = sectionBody.split('\n').filter((l) => l.trim() !== '');

  const inlineRefs = [];
  const wikilinkLines = [];
  const unknownLines = [];

  for (const line of lines) {
    const ref = parseReferenceLine(line);
    if (ref) {
      // Filter: if URL is not HTTP(S), treat as wikilink-style internal link
      if (!/^https?:\/\//.test(ref.url)) {
        wikilinkLines.push(`- [[${ref.url}]]${ref.description ? ` - ${ref.description}` : ''}`);
        continue;
      }
      const sourceId = matchSource(ref.url);
      if (sourceId) {
        // id-based: include specific URL in note for context
        const noteBase = ref.description ? `${ref.title} (${ref.description})` : ref.title;
        const note = `${noteBase}: ${ref.url}`;
        inlineRefs.push({ id: sourceId, note });
      } else {
        // inline
        const obj = { title: ref.title, url: ref.url };
        if (ref.description) obj.note = ref.description;
        inlineRefs.push(obj);
      }
      continue;
    }
    const wl = parseWikilink(line);
    if (wl) {
      wikilinkLines.push(line);
      continue;
    }
    // Unknown line - probably a paragraph or continuation
    unknownLines.push(line);
  }

  if (inlineRefs.length === 0) {
    // Section had only wikilinks or unknown content - skip
    return { skipped: 'no-external-refs', wikilinkCount: wikilinkLines.length };
  }

  // Build new frontmatter
  const refsYaml = buildReferencesYaml(inlineRefs);

  // Insert references: into frontmatter
  let newFm = parsed.fm.trimEnd();
  newFm = `${newFm}\nreferences:\n${refsYaml}`;
  const newFrontmatter = `---\n${newFm}\n---\n`;

  // Remove the section from body
  let newBody = parsed.body.replace(sectionRe, '');
  // Trim trailing whitespace
  newBody = newBody.replace(/\s+$/, '\n');

  // If we still have wikilinks/unknown content, add them back as a "## 관련 위키" section
  if (wikilinkLines.length > 0 || unknownLines.length > 0) {
    const sectionName = wikilinkLines.length > 0 ? '관련 위키' : '관련';
    const keepLines = [...wikilinkLines, ...unknownLines];
    newBody = `${newBody}\n## ${sectionName}\n\n${keepLines.join('\n')}\n`;
  }

  const newContent = newFrontmatter + newBody;

  return {
    changed: true,
    inlineRefsCount: inlineRefs.length,
    wikilinkCount: wikilinkLines.length,
    unknownCount: unknownLines.length,
    newContent,
  };
}

function buildReferencesYaml(refs) {
  return refs
    .map((ref) => {
      const lines = [];
      if (ref.id) {
        lines.push(`  - id: ${ref.id}`);
        if (ref.note) {
          lines.push(`    note: ${yamlString(ref.note)}`);
        }
      } else {
        lines.push(`  - title: ${yamlString(ref.title)}`);
        lines.push(`    url: ${yamlString(ref.url)}`);
        if (ref.note) {
          lines.push(`    note: ${yamlString(ref.note)}`);
        }
      }
      return lines.join('\n');
    })
    .join('\n');
}

function yamlString(str) {
  // Always quote to be safe
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function walk(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile() && /\.(mdx?|md)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function main() {
  const baseDir = TARGET_DIR ? path.join(WIKI_DIR, TARGET_DIR) : WIKI_DIR;
  if (!fs.existsSync(baseDir)) {
    console.error(`Directory not found: ${baseDir}`);
    process.exit(1);
  }

  const files = walk(baseDir);
  console.log(`Found ${files.length} files in ${path.relative(process.cwd(), baseDir)}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
  console.log();

  let changed = 0;
  let skipped = 0;
  const skipReasons = {};

  for (const file of files) {
    const result = processFile(file);
    const rel = path.relative(WIKI_DIR, file);

    if (result.changed) {
      changed += 1;
      console.log(
        `[CHANGE] ${rel} (+${result.inlineRefsCount} refs, ${result.wikilinkCount} wikilinks, ${result.unknownCount} other)`,
      );
      if (!DRY_RUN) {
        fs.writeFileSync(file, result.newContent, 'utf-8');
      }
    } else if (result.skipped) {
      skipped += 1;
      skipReasons[result.skipped] = (skipReasons[result.skipped] ?? 0) + 1;
    }
  }

  console.log();
  console.log(`Changed: ${changed}`);
  console.log(`Skipped: ${skipped}`);
  for (const [reason, count] of Object.entries(skipReasons)) {
    console.log(`  ${reason}: ${count}`);
  }
}

main();
