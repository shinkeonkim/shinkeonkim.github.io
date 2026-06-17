import { findTagEnd, parseJsxAttrs, placeholderHtml } from './jsx-parser';
import { COMPONENT_RENDERERS } from './component-renderers';

const IMPORT_LINE_RE = /^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
const TAG_OPEN_RE = /<([A-Z][\w.]*)/;

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
    const attrsRaw = src.slice(afterName, tagEnd.selfClosing ? tagEnd.end - 2 : tagEnd.end - 1);
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

export async function preprocessMdx(
  content: string,
): Promise<{ transformed: string; componentNames: string[] }> {
  const seen = new Set<string>();
  const noImports = content.replace(IMPORT_LINE_RE, '');
  const transformed = await transformJsx(noImports, seen);
  return { transformed, componentNames: Array.from(seen) };
}
