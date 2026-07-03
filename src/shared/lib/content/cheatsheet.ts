export interface CheatsheetSection {
  title: string | null;
  items: string[];
}

export interface CheatsheetResult {
  sections: CheatsheetSection[];
  source: 'fence' | 'heuristic' | 'empty';
}

const FENCE_RE = /^```cheatsheet\s*\n([\s\S]*?)\n```/gm;
const MAX_SECTIONS = 15;
const MAX_ITEM_LENGTH = 200;

function stripInline(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/\[\[[^\]|#]+(?:\|([^\]]+))?\]\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .trim();
}

function trimItem(raw: string): string {
  const stripped = stripInline(raw);
  if (stripped.length <= MAX_ITEM_LENGTH) return stripped;
  return stripped.slice(0, MAX_ITEM_LENGTH - 1) + '…';
}

function parseBullets(body: string): CheatsheetSection[] {
  const sections: CheatsheetSection[] = [];
  let current: CheatsheetSection | null = null;
  const lines = body.split('\n');
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { title: stripInline(heading[1].trim()), items: [] };
      sections.push(current);
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) {
      if (!current) {
        current = { title: null, items: [] };
        sections.push(current);
      }
      current.items.push(trimItem(bullet[1].trim()));
    }
  }
  return sections.filter((s) => s.items.length > 0).slice(0, MAX_SECTIONS);
}

function extractFence(body: string): CheatsheetSection[] {
  const re = new RegExp(FENCE_RE.source, FENCE_RE.flags);
  let match: RegExpExecArray | null;
  const all: CheatsheetSection[] = [];
  while ((match = re.exec(body)) !== null) {
    for (const s of parseBullets(match[1] ?? '')) all.push(s);
    if (all.length >= MAX_SECTIONS) break;
  }
  return all.slice(0, MAX_SECTIONS);
}

function heuristicSections(body: string): CheatsheetSection[] {
  const withoutFrontmatter = body.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const withoutFences = withoutFrontmatter.replace(/```[\s\S]*?```/g, '');
  const sections: CheatsheetSection[] = [];
  const lines = withoutFences.split('\n');
  let current: { title: string; buffer: string[] } | null = null;

  function flush(): void {
    if (!current) return;
    const items = extractHighlightsFromBuffer(current.buffer);
    if (items.length > 0) {
      sections.push({ title: current.title, items });
    }
    current = null;
  }

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      current = { title: stripInline(heading[1].trim()), buffer: [] };
      continue;
    }
    if (current) current.buffer.push(line);
  }
  flush();
  return sections.slice(0, MAX_SECTIONS);
}

function extractHighlightsFromBuffer(buffer: string[]): string[] {
  const items: string[] = [];
  const boldRe = /\*\*([^*]+)\*\*/g;
  const bulletLines: string[] = [];
  const firstNonEmptyIdx = buffer.findIndex((l) => l.trim().length > 0);
  const firstSentence = firstNonEmptyIdx >= 0 ? firstSentenceOf(buffer[firstNonEmptyIdx]) : '';
  if (firstSentence) items.push(trimItem(firstSentence));

  for (const line of buffer) {
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) bulletLines.push(bullet[1].trim());
    let boldMatch: RegExpExecArray | null;
    while ((boldMatch = boldRe.exec(line)) !== null) {
      const text = trimItem(boldMatch[1] ?? '');
      if (text && text.length >= 2 && !items.includes(text)) items.push(text);
    }
  }
  for (const bullet of bulletLines.slice(0, 3)) {
    const t = trimItem(bullet);
    if (t && !items.includes(t)) items.push(t);
  }
  return items.slice(0, 4);
}

function firstSentenceOf(line: string): string {
  const stripped = stripInline(line);
  const match = stripped.match(/^(.+?[.!?])(\s|$)/);
  if (match) return match[1];
  return stripped;
}

export function buildCheatsheet(body: string): CheatsheetResult {
  const fenceSections = extractFence(body);
  if (fenceSections.length > 0) {
    return { sections: fenceSections, source: 'fence' };
  }
  const heuristic = heuristicSections(body);
  if (heuristic.length > 0) {
    return { sections: heuristic, source: 'heuristic' };
  }
  return { sections: [], source: 'empty' };
}
