import type { APIRoute } from 'astro';
import { notFoundResponse } from './api-utils';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import { codeToHtml } from 'shiki';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkWikilink from '../plugins/remark-wikilink.mjs';
import remarkMermaid from '../plugins/remark-mermaid.mjs';
import remarkMathLenient from '../plugins/remark-math-lenient.mjs';
import remarkUrlPreview from '../plugins/remark-url-preview.mjs';

export const prerender = false;

let processorPromise: Promise<Awaited<ReturnType<typeof createMarkdownProcessor>>> | null = null;
function getProcessor() {
  if (!processorPromise) {
    processorPromise = createMarkdownProcessor({
      gfm: true,
      smartypants: true,
      remarkPlugins: [remarkMermaid, remarkAlert, remarkWikilink, remarkMathLenient, remarkMath, remarkUrlPreview],
      rehypePlugins: [[rehypeKatex, { output: 'html', strict: 'ignore' }]],
      shikiConfig: {
        themes: { light: 'github-light', dark: 'one-dark-pro' },
        wrap: true,
      },
    });
  }
  return processorPromise;
}

const IMPORT_LINE_RE = /^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
const TAG_OPEN_RE = /<([A-Z][\w.]*)/;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function summarizeAttrs(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const stripped = trimmed.replace(/\s+/g, ' ');
  const escaped = escapeHtml(stripped);
  return escaped.length > 120 ? escaped.slice(0, 120) + '…' : escaped;
}

function placeholderHtml(name: string, attrs: string, inner?: string): string {
  const attrSummary = summarizeAttrs(attrs);
  const header = `<div class="mdx-component-placeholder__header"><span class="mdx-component-placeholder__name">&lt;${escapeHtml(name)}&gt;</span>${attrSummary ? ` <span class="mdx-component-placeholder__attrs">${attrSummary}</span>` : ''}</div>`;
  const body = inner !== undefined && inner.trim()
    ? `<div class="mdx-component-placeholder__body">${escapeHtml(inner.trim())}</div>`
    : '';
  return `\n\n<div class="mdx-component-placeholder" data-component="${escapeHtml(name)}">${header}${body}</div>\n\n`;
}

function findTagEnd(src: string, from: number): { end: number; selfClosing: boolean } | null {
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

function parseJsxAttrs(raw: string): Record<string, unknown> {
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

async function shiki(text: string, lang: string): Promise<string> {
  try {
    return await codeToHtml(text, {
      lang,
      themes: { light: 'github-light', dark: 'one-dark-pro' },
    });
  } catch {
    return `<pre><code>${escapeHtml(text)}</code></pre>`;
  }
}

interface Variant {
  label?: string;
  language?: string;
  code?: string;
}

async function renderCodeWithOutput(attrs: Record<string, unknown>): Promise<string> {
  const variantsRaw = Array.isArray(attrs.variants)
    ? (attrs.variants as Variant[])
    : attrs.code !== undefined && attrs.language !== undefined
      ? [
          {
            code: String(attrs.code),
            language: String(attrs.language),
            label: typeof attrs.label === 'string' ? attrs.label : undefined,
          },
        ]
      : [];
  if (variantsRaw.length === 0) return placeholderHtml('CodeWithOutput', '');

  const output = String(attrs.output ?? '');
  const outputLanguage = String(attrs.outputLanguage ?? 'text');
  const outputLabel = String(attrs.outputLabel ?? '결과');
  const title = typeof attrs.title === 'string' ? attrs.title : null;
  const codeWidth = typeof attrs.codeWidth === 'number' ? attrs.codeWidth : null;

  const variants = await Promise.all(
    variantsRaw.map(async (v) => {
      const code = String(v.code ?? '').trimEnd();
      const lang = String(v.language ?? 'text');
      return {
        label: v.label ?? lang,
        html: await shiki(code, lang),
      };
    }),
  );
  const outputHtml = await shiki(output.trimEnd(), outputLanguage);

  const headerLeft = variants.length > 1
    ? `<div class="cwo-tabs" role="tablist">${variants
        .map(
          (v, i) =>
            `<button type="button" class="cwo-tab${i === 0 ? ' is-active' : ''}" data-cwo-tab="${i}" aria-selected="${i === 0}">${escapeHtml(v.label)}</button>`,
        )
        .join('')}</div>`
    : `<span class="cwo-label">${escapeHtml(variants[0].label)}</span>`;

  const variantPanes = variants
    .map(
      (v, i) =>
        `<div class="cwo-variant${i === 0 ? ' is-active' : ''}" data-cwo-variant="${i}">${v.html}</div>`,
    )
    .join('');

  const vertical = codeWidth !== null && codeWidth >= 99;
  const style = codeWidth !== null
    ? ` style="--cwo-code-pct:${Math.max(0, Math.min(100, codeWidth))}%"`
    : '';

  return `\n\n<figure class="code-with-output not-prose" data-cwo data-vertical="${vertical}"${style}>
  ${title ? `<figcaption class="mb-2 text-sm font-medium" style="color:var(--color-fg-muted)">${escapeHtml(title)}</figcaption>` : ''}
  <div class="cwo-panes" data-cwo-panes>
    <div class="cwo-pane cwo-pane-code">
      <div class="cwo-header"><span class="cwo-dot cwo-dot-input"></span>${headerLeft}</div>
      <div class="cwo-body cwo-code-body">${variantPanes}</div>
    </div>
    <button type="button" class="cwo-splitter" aria-label="패널 너비 조절"><span class="cwo-splitter-grip"></span></button>
    <div class="cwo-pane cwo-pane-output">
      <div class="cwo-header"><span class="cwo-dot cwo-dot-output"></span><span class="cwo-label">${escapeHtml(outputLabel)}</span></div>
      <div class="cwo-body">${outputHtml}</div>
    </div>
  </div>
</figure>\n\n`;
}

type ComponentRenderer = (attrs: Record<string, unknown>, inner?: string) => Promise<string>;

const COMPONENT_RENDERERS: Record<string, ComponentRenderer> = {
  CodeWithOutput: renderCodeWithOutput,
};

async function transformJsx(src: string, seen: Set<string>): Promise<string> {
  const out: string[] = [];
  let cursor = 0;
  while (cursor < src.length) {
    const rest = src.slice(cursor);
    const m = TAG_OPEN_RE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    const tagStart = cursor + (m.index ?? 0);
    out.push(src.slice(cursor, tagStart));
    const name = m[1];
    const afterName = tagStart + m[0].length;
    const tagEnd = findTagEnd(src, afterName);
    if (!tagEnd) {
      out.push(src.slice(tagStart));
      break;
    }
    const attrsRaw = src.slice(
      afterName,
      tagEnd.selfClosing ? tagEnd.end - 2 : tagEnd.end - 1,
    );
    seen.add(name);

    let innerRaw: string | undefined = undefined;
    let consumeEnd = tagEnd.end;

    if (!tagEnd.selfClosing) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const closeRe = new RegExp(`</${escapedName}\\s*>`, 'g');
      closeRe.lastIndex = tagEnd.end;
      const close = closeRe.exec(src);
      if (close) {
        innerRaw = src.slice(tagEnd.end, close.index);
        consumeEnd = close.index + close[0].length;
      }
    }

    const renderer = COMPONENT_RENDERERS[name];
    if (renderer) {
      try {
        const attrs = parseJsxAttrs(attrsRaw);
        out.push(await renderer(attrs, innerRaw));
      } catch {
        out.push(placeholderHtml(name, attrsRaw, innerRaw));
      }
    } else {
      out.push(placeholderHtml(name, attrsRaw, innerRaw));
    }
    cursor = consumeEnd;
  }
  return out.join('');
}

async function preprocessMdx(content: string): Promise<{ transformed: string; componentNames: string[] }> {
  const seen = new Set<string>();
  const noImports = content.replace(IMPORT_LINE_RE, '');
  const transformed = await transformJsx(noImports, seen);
  return { transformed, componentNames: Array.from(seen) };
}

interface RenderBody {
  content?: string;
  ext?: string;
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return notFoundResponse();
  }

  let body: RenderBody;
  try {
    body = (await request.json()) as RenderBody;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const raw = typeof body.content === 'string' ? body.content : '';
  const ext = body.ext === '.mdx' ? '.mdx' : '.md';

  try {
    const parsed = parseFrontmatter(raw, { frontmatter: 'empty-with-spaces' });
    const fm = parsed.frontmatter;
    let markdown = parsed.content;
    let componentNames: string[] = [];

    if (ext === '.mdx') {
      const pre = await preprocessMdx(markdown);
      markdown = pre.transformed;
      componentNames = pre.componentNames;
    }

    const processor = await getProcessor();
    const result = await processor.render(markdown);

    return new Response(
      JSON.stringify({
        html: result.code,
        frontmatter: fm,
        componentNames,
        ext,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg, stack: err instanceof Error ? err.stack : undefined }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
