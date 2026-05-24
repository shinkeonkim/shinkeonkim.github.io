import fs from 'node:fs';
import path from 'node:path';
import { visit, SKIP } from 'unist-util-visit';

const COLLECTIONS = ['posts', 'wiki', 'notes'];
const CONTENT_DIR = path.resolve(process.cwd(), 'src/content');
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { title: undefined, aliases: [] };
  const fm = match[1];
  const titleMatch = fm.match(/^title:\s*["']?([^"'\n]+?)["']?\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  const aliases = [];
  const aliasInline = fm.match(/^aliases:\s*\[([^\]]*)\]/m);
  if (aliasInline) {
    aliasInline[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
      .forEach((a) => aliases.push(a));
  } else {
    const aliasBlock = fm.match(/^aliases:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (aliasBlock) {
      aliasBlock[1]
        .split('\n')
        .map((l) => l.match(/^\s*-\s*["']?(.+?)["']?\s*$/))
        .filter(Boolean)
        .forEach((m) => aliases.push(m[1].trim()));
    }
  }
  return { title, aliases };
}

function buildSlugMap() {
  const map = new Map();

  for (const collection of COLLECTIONS) {
    const dir = path.join(CONTENT_DIR, collection);
    if (!fs.existsSync(dir)) continue;

    const stack = [dir];
    while (stack.length) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!/\.(md|mdx)$/.test(entry.name)) continue;

        const rel = path.relative(dir, full).replace(/\\/g, '/');
        const slug = rel.replace(/\.(md|mdx)$/, '');
        const filename = path.basename(slug);

        const url = collection === 'notes' ? `/notes/#${slug}` : `/${collection}/${slug}/`;

        let title;
        let aliases = [];
        try {
          const raw = fs.readFileSync(full, 'utf-8');
          const fm = parseFrontmatter(raw);
          title = fm.title;
          aliases = fm.aliases;
        } catch {
          /* unreadable frontmatter - leave entry without title/aliases */
        }

        const keys = new Set(
          [slug, filename, title, ...aliases].filter(Boolean).map((k) => k.toLowerCase()),
        );
        for (const key of keys) {
          if (!map.has(key)) {
            map.set(key, { url, title: title ?? filename, collection, slug });
          }
        }
      }
    }
  }

  return map;
}

export default function remarkWikilink() {
  const slugMap = buildSlugMap();

  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      const text = node.value;
      if (!text.includes('[[')) return;

      WIKILINK_RE.lastIndex = 0;
      const parts = [];
      let last = 0;
      let m;
      let matched = false;

      while ((m = WIKILINK_RE.exec(text)) !== null) {
        matched = true;
        if (m.index > last) {
          parts.push({ type: 'text', value: text.slice(last, m.index) });
        }
        const target = m[1].trim();
        const heading = m[2]?.trim();
        const display = (m[3]?.trim() ?? target).replace(/\s+/g, ' ');
        const found = slugMap.get(target.toLowerCase());
        const broken = !found;
        const href = found
          ? heading
            ? `${found.url}#${heading.toLowerCase().replace(/\s+/g, '-')}`
            : found.url
          : '#';

        parts.push({
          type: 'link',
          url: href,
          title: found ? found.title : `${target} (페이지 없음)`,
          data: {
            hProperties: {
              className: broken ? ['wikilink', 'broken'] : ['wikilink'],
              'data-wikilink-target': target,
              ...(broken ? { 'aria-disabled': 'true' } : {}),
            },
          },
          children: [{ type: 'text', value: display }],
        });

        last = m.index + m[0].length;
      }

      if (!matched) return;
      if (last < text.length) {
        parts.push({ type: 'text', value: text.slice(last) });
      }
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    });
  };
}
