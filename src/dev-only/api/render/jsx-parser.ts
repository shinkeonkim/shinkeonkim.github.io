export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function summarizeAttrs(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const stripped = trimmed.replace(/\s+/g, ' ');
  const escaped = escapeHtml(stripped);
  return escaped.length > 120 ? escaped.slice(0, 120) + '…' : escaped;
}

export function placeholderHtml(name: string, attrs: string, inner?: string): string {
  const attrSummary = summarizeAttrs(attrs);
  const header = `<div class="mdx-component-placeholder__header"><span class="mdx-component-placeholder__name">&lt;${escapeHtml(name)}&gt;</span>${attrSummary ? ` <span class="mdx-component-placeholder__attrs">${attrSummary}</span>` : ''}</div>`;
  const body =
    inner !== undefined && inner.trim()
      ? `<div class="mdx-component-placeholder__body">${escapeHtml(inner.trim())}</div>`
      : '';
  return `\n\n<div class="mdx-component-placeholder" data-component="${escapeHtml(name)}">${header}${body}</div>\n\n`;
}

export function findTagEnd(src: string, from: number): { end: number; selfClosing: boolean } | null {
  let i = from;
  let depth = 0;
  let inStr: string | null = null;
  while (i < src.length) {
    const c = src[i];
    const prev = i > 0 ? src[i - 1] : '';
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
    } else {
      if (c === '"' || c === "'" || c === '`') inStr = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (depth === 0) {
        if (c === '/' && src[i + 1] === '>') return { end: i + 2, selfClosing: true };
        if (c === '>') return { end: i + 1, selfClosing: false };
      }
    }
    i++;
  }
  return null;
}

function unescapeTemplate(s: string): string {
  const SENTINEL = '\uE000';
  return s
    .replace(/\\\\/g, SENTINEL)
    .replace(/\\`/g, '`')
    .replace(/\\\$/g, '$')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(new RegExp(SENTINEL, 'g'), '\\');
}

function interpretExpr(expr: string): unknown {
  const trimmed = expr.trim();
  if (trimmed === '') return undefined;
  if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
    return unescapeTemplate(trimmed.slice(1, -1));
  }
  if (/^"(?:[^"\\]|\\.)*"$/.test(trimmed) || /^'(?:[^'\\]|\\.)*'$/.test(trimmed)) {
    return trimmed.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === 'undefined') return null;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return parseArrayLiteral(trimmed);
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return parseObjectLiteral(trimmed.slice(1, -1));
  }
  return trimmed;
}

function splitTopLevel(raw: string, separator: ',' | ';'): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr: string | null = null;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    const prev = i > 0 ? raw[i - 1] : '';
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
    } else {
      if (c === '"' || c === "'" || c === '`') inStr = c;
      else if (c === '{' || c === '[' || c === '(') depth++;
      else if (c === '}' || c === ']' || c === ')') depth--;
      else if (c === separator && depth === 0) {
        out.push(raw.slice(start, i));
        start = i + 1;
      }
    }
  }
  out.push(raw.slice(start));
  return out;
}

function parseArrayLiteral(raw: string): unknown[] {
  const inner = raw.slice(1, -1).trim();
  if (!inner) return [];
  return splitTopLevel(inner, ',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(interpretExpr);
}

function parseObjectLiteral(inner: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!inner.trim()) return result;
  const items = splitTopLevel(inner, ',');
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    let keyEnd = -1;
    let depth = 0;
    let inStr: string | null = null;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      const prev = i > 0 ? trimmed[i - 1] : '';
      if (inStr) {
        if (c === inStr && prev !== '\\') inStr = null;
      } else {
        if (c === '"' || c === "'" || c === '`') inStr = c;
        else if (c === '{' || c === '[' || c === '(') depth++;
        else if (c === '}' || c === ']' || c === ')') depth--;
        else if (c === ':' && depth === 0) {
          keyEnd = i;
          break;
        }
      }
    }
    if (keyEnd < 0) continue;
    let key = trimmed.slice(0, keyEnd).trim();
    if (/^["'].*["']$/.test(key)) key = key.slice(1, -1);
    const value = trimmed.slice(keyEnd + 1).trim();
    result[key] = interpretExpr(value);
  }
  return result;
}

export function parseJsxAttrs(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let i = 0;
  const len = raw.length;
  while (i < len) {
    while (i < len && /\s/.test(raw[i])) i++;
    if (i >= len) break;
    const nameStart = i;
    while (i < len && /[\w-]/.test(raw[i])) i++;
    const name = raw.slice(nameStart, i);
    if (!name) {
      i++;
      continue;
    }
    while (i < len && /\s/.test(raw[i])) i++;
    if (raw[i] !== '=') {
      result[name] = true;
      continue;
    }
    i++;
    while (i < len && /\s/.test(raw[i])) i++;
    const ch = raw[i];
    if (ch === '"' || ch === "'") {
      i++;
      let val = '';
      while (i < len && raw[i] !== ch) {
        if (raw[i] === '\\' && i + 1 < len) {
          val += raw[i + 1];
          i += 2;
        } else {
          val += raw[i++];
        }
      }
      result[name] = val;
      if (i < len) i++;
    } else if (ch === '{') {
      i++;
      const valStart = i;
      let depth = 1;
      let inStr: string | null = null;
      while (i < len && depth > 0) {
        const c = raw[i];
        const prev = i > 0 ? raw[i - 1] : '';
        if (inStr) {
          if (c === inStr && prev !== '\\') inStr = null;
        } else {
          if (c === '"' || c === "'" || c === '`') inStr = c;
          else if (c === '{') depth++;
          else if (c === '}') {
            depth--;
            if (depth === 0) break;
          }
        }
        i++;
      }
      result[name] = interpretExpr(raw.slice(valStart, i));
      if (i < len) i++;
    } else {
      break;
    }
  }
  return result;
}
