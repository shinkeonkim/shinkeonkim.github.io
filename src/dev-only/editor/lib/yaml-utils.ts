export type ReferenceItem = Record<string, string | number | boolean>;

const UNQUOTED_SCALAR_RE = /^[\w\-./:가-힣\u3040-\u30ff\u3400-\u9fff_]+$/u;
const RESERVED_RE = /^(true|false|null|yes|no|~|on|off)$/i;
const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

export function yamlScalar(value: string | number | boolean): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value);
  if (s === '') return '""';
  if (UNQUOTED_SCALAR_RE.test(s) && !RESERVED_RE.test(s) && !NUMERIC_RE.test(s)) {
    return s;
  }
  return JSON.stringify(s);
}

export function serializeReferencesBlock(items: ReferenceItem[]): string {
  if (items.length === 0) return '';
  const lines = ['references:'];
  for (const item of items) {
    const entries = Object.entries(item).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) continue;
    const [firstKey, firstVal] = entries[0];
    lines.push(`  - ${firstKey}: ${yamlScalar(firstVal)}`);
    for (const [k, v] of entries.slice(1)) {
      lines.push(`    ${k}: ${yamlScalar(v)}`);
    }
  }
  return lines.join('\n');
}

const FM_RE = /^---\n([\s\S]*?)\n---(\n|$)/;

interface YamlListSlice {
  start: number;
  end: number;
}

function findListSlice(fm: string, key: string): YamlListSlice | null {
  const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
  const m = re.exec(fm);
  if (!m) return null;
  const after = m[1];
  const lineStart = m.index;
  const lineEnd = m.index + m[0].length;
  if (/^\[.*\]\s*$/.test(after) || after.trim() !== '') {
    return { start: lineStart, end: lineEnd };
  }
  const lines = fm.slice(lineEnd + 1).split('\n');
  let consumed = 0;
  for (const ln of lines) {
    if (ln.startsWith(' ') || ln.startsWith('\t')) {
      consumed += ln.length + 1;
      continue;
    }
    break;
  }
  return { start: lineStart, end: lineEnd + 1 + Math.max(0, consumed - 1) };
}

export function upsertReferencesInFrontmatter(content: string, items: ReferenceItem[]): string {
  const fmMatch = content.match(FM_RE);
  const block = serializeReferencesBlock(items);
  if (!fmMatch) {
    const body = content;
    if (items.length === 0) return body;
    return `---\n${block}\n---\n\n${body.replace(/^\n+/, '')}`;
  }
  const fm = fmMatch[1];
  const fmStart = fmMatch[0];
  const slice = findListSlice(fm, 'references');
  let newFm: string;
  if (items.length === 0) {
    if (!slice) return content;
    newFm = (fm.slice(0, slice.start) + fm.slice(slice.end))
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+|\n+$/g, '');
  } else if (slice) {
    newFm = fm.slice(0, slice.start) + block + fm.slice(slice.end);
  } else {
    newFm = fm.replace(/\n*$/, '') + '\n' + block;
  }
  return content.replace(fmStart, `---\n${newFm}\n---\n`);
}

export interface ParsedFrontmatterReferences {
  refs: ReferenceItem[];
  fmText: string;
}

export function parseReferencesFromFrontmatter(content: string): ParsedFrontmatterReferences {
  const fmMatch = content.match(FM_RE);
  if (!fmMatch) return { refs: [], fmText: '' };
  const fm = fmMatch[1];
  const slice = findListSlice(fm, 'references');
  if (!slice) return { refs: [], fmText: fm };
  const sliceText = fm.slice(slice.start, slice.end).trimEnd();
  const refs: ReferenceItem[] = [];
  const lines = sliceText.split('\n');
  if (lines.length === 0) return { refs: [], fmText: fm };
  const firstLineMatch = lines[0].match(/^references:\s*(.*)$/);
  if (firstLineMatch && firstLineMatch[1].startsWith('[') && firstLineMatch[1].endsWith(']')) {
    try {
      const arr = JSON.parse(firstLineMatch[1]);
      if (Array.isArray(arr)) {
        for (const a of arr) if (a && typeof a === 'object') refs.push(a as ReferenceItem);
      }
    } catch {
      return { refs: [], fmText: fm };
    }
    return { refs, fmText: fm };
  }
  let current: ReferenceItem | null = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*-\s+/.test(line)) {
      if (current) refs.push(current);
      current = {};
      const rest = line.replace(/^\s*-\s+/, '');
      const kv = rest.match(/^([\w-]+):\s*(.*)$/);
      if (kv) current[kv[1]] = parseScalar(kv[2]);
      continue;
    }
    const kv = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (kv && current) current[kv[1]] = parseScalar(kv[2]);
  }
  if (current) refs.push(current);
  return { refs, fmText: fm };
}

function parseScalar(raw: string): string | number | boolean {
  const s = raw.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return s.replace(/^["']|["']$/g, '');
}
