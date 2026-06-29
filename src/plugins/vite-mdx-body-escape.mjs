/**
 * Vite plugin: escape MDX-hazardous characters in markdown/MDX body text only.
 *
 * Why this exists:
 *   MDX treats body `<word...` as a JSX tag attempt and body `{expr}` as a JSX
 *   expression. When wiki authors type math, set notation, or inline code
 *   snippets in prose (e.g. `c_{i+j}`, `<vector<int>>`, `H <= 10`), the
 *   compiler routes them through acorn-jsx which crashes on unsupported
 *   characters and on unbound identifiers.
 *
 *   The user wants to keep authoring prose freely; the build is responsible
 *   for keeping their content intact. So this plugin runs BEFORE the MDX
 *   compiler, escapes only the hazardous characters that MDX would otherwise
 *   try to parse, and leaves everything else untouched.
 *
 * What is left alone (so users keep authoring freely):
 *   - Fenced code blocks (``` ... ```), including the Shiki-highlighted code
 *     used by snippets in the wiki.
 *   - Inline backtick spans (`...`) within a line.
 *   - JSX components and their multi-line bodies, e.g. `<CodeWithOutput ... />`,
 *     including the template-literal `code={`...`}` props that hold C++/Java/
 *     Python source. These were the false positives that broke earlier
 *     auto-fixers.
 *   - YAML frontmatter at the top of the file.
 *   - Indented code blocks (4+ leading spaces / a leading tab).
 *
 * What gets escaped (in body text only, after the masks above):
 *   - `<` immediately followed by an ASCII letter and then `=`, `,`, `<`,
 *     `-`, or a space, i.e. body things that look like a JSX opening but
 *     are really prose (e.g. `H <= 10`, `vector<int, int>`, `<-> RB-Tree`).
 *     Escaped as `\<`.
 *   - `{` opening a `{...}` segment that contains math/set characters or
 *     spread operators that acorn-jsx cannot parse (`⊆`, `…`, `...`, Greek
 *     letters, comparison operators, etc.). Escaped as `\{`...`\}`.
 *
 * Effect:
 *   - The .mdx file on disk stays exactly as the user wrote it.
 *   - The compiled HTML still renders the visual characters (`<`, `{`) - the
 *     `\` is consumed by the markdown escape mechanism, not the output.
 *   - No source files are touched; this is a pure transform.
 */

const HAZARD_BRACE_CHARS = /[⊆⊂⊇⊃∈∉∪∩∅∀∃≤≥≠→←↔ΣΠαβγδεζηθικλμνξοπρστυφχψω∂∇∞≈≃≅⇔⇒⇐]/;

const HTML_INLINE_TAGS = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
  'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
  'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
  'em', 'embed',
  'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
  'i', 'iframe', 'img', 'input', 'ins',
  'kbd',
  'label', 'legend', 'li', 'link',
  'main', 'map', 'mark', 'meta', 'meter',
  'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output',
  'p', 'param', 'picture', 'pre', 'progress',
  'q',
  'rp', 'rt', 'ruby',
  's', 'samp', 'section', 'select', 'small', 'source', 'span', 'strong',
  'style', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead',
  'time', 'title', 'tr', 'track',
  'u', 'ul',
  'var', 'video',
  'wbr',
]);

function isFenceLine(line) {
  return /^\s*(?:```|~~~)/.test(line);
}

function isFrontmatterDelimiter(line) {
  return line === '---';
}

function isJsxLineStart(line) {
  return /^\s*<[A-Za-z][A-Za-z0-9._-]*/.test(line);
}

function isIndentedCode(line) {
  const m = line.match(/^([ \t]+)/);
  if (!m) return false;
  let cols = 0;
  for (const ch of m[1]) cols += ch === '\t' ? 4 : 1;
  return cols >= 4;
}

function maskInlineCode(line) {
  return line.replace(/`[^`\n]*`/g, (m) => '\x00'.repeat(m.length));
}

function escapeTablePipesInBackticks(line) {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith('|')) return line;
  let out = '';
  let i = 0;
  let inTick = false;
  while (i < line.length) {
    const c = line[i];
    if (c === '\\' && line[i + 1] !== undefined) {
      out += c + line[i + 1];
      i += 2;
      continue;
    }
    if (c === '`') {
      inTick = !inTick;
      out += c;
      i++;
      continue;
    }
    if (c === '|' && inTick) {
      out += '\\|';
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function escapeBodyLine(line) {
  line = escapeTablePipesInBackticks(line);
  const masked = maskInlineCode(line);
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (masked[i] === '\x00') {
      out += line[i];
      i++;
      continue;
    }

    if (line[i] === '\\') {
      out += line[i] + (line[i + 1] ?? '');
      i += 2;
      continue;
    }

    if (line[i] === '<') {
      const next = line[i + 1];
      if (next === '/') {
        let j = i + 2;
        while (j < line.length && /[a-zA-Z0-9-]/.test(line[j])) j++;
        const tag = line.slice(i + 2, j).toLowerCase();
        if (HTML_INLINE_TAGS.has(tag) || /^[A-Z]/.test(line[i + 2] ?? '')) {
          out += line[i];
          i++;
          continue;
        }
        out += '\\<';
        i++;
        continue;
      }
      if (next && /[a-z]/.test(next)) {
        let j = i + 1;
        while (j < line.length && /[a-zA-Z0-9-]/.test(line[j])) j++;
        const tag = line.slice(i + 1, j).toLowerCase();
        const after = line[j];
        const validBoundary =
          after === '>' ||
          after === '/' ||
          after === ' ' ||
          after === '\t' ||
          after === undefined;
        if (HTML_INLINE_TAGS.has(tag) && validBoundary) {
          out += line[i];
          i++;
          continue;
        }
        out += '\\<';
        i++;
        continue;
      }
      if (next && /[A-Z]/.test(next)) {
        let j = i + 1;
        while (j < line.length && /[A-Za-z0-9_-]/.test(line[j])) j++;
        const tagLen = j - i - 1;
        if (tagLen <= 2) {
          out += '\\<';
          i++;
          continue;
        }
        out += line[i];
        i++;
        continue;
      }
      if (next === '!' || next === '?') {
        out += line[i];
        i++;
        continue;
      }
      out += '\\<';
      i++;
      continue;
    }

    if (line[i] === '{' && masked[i] !== '\x00') {
      let depth = 1;
      let j = i + 1;
      let hasHazard = false;
      let hasContent = false;
      while (j < line.length && depth > 0) {
        const c = line[j];
        if (masked[j] === '\x00') {
          j++;
          continue;
        }
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (/[a-zA-Z]/.test(c)) {
          hasContent = true;
          hasHazard = true;
        } else if (HAZARD_BRACE_CHARS.test(c)) {
          hasContent = true;
          hasHazard = true;
        } else if (c === '.' && line[j + 1] === '.' && line[j + 2] === '.') {
          hasContent = true;
          hasHazard = true;
        } else if (c === '|' || c === ',' || c === ';') {
          hasContent = true;
          hasHazard = true;
        } else if (c !== ' ' && c !== '\t') {
          hasContent = true;
        }
        if (depth > 0) j++;
      }
      if (depth === 0 && (hasHazard || (!hasContent && j === i + 1))) {
        const inner = line.slice(i + 1, j);
        out += '\\{' + inner + '\\}';
        i = j + 1;
        continue;
      }
      out += line[i];
      i++;
      continue;
    }

    out += line[i];
    i++;
  }
  return out;
}

function processSource(source) {
  const lines = source.split(/\r?\n/);
  const eol = source.includes('\r\n') ? '\r\n' : '\n';

  let inFrontmatter = false;
  let inCode = false;
  let inJsx = false;
  let jsxDepth = 0;
  let inTemplateLiteral = false;

  const updateJsxDepth = (line) => {
    let depth = 0;
    let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (c === '\\' && line[i + 1] !== undefined) {
        i += 2;
        continue;
      }
      if (c === '`') {
        inTemplateLiteral = !inTemplateLiteral;
        i++;
        continue;
      }
      if (inTemplateLiteral) {
        i++;
        continue;
      }
      if (c === '<') {
        if (line[i + 1] === '/') {
          depth--;
        } else if (/[A-Za-z]/.test(line[i + 1])) {
          depth++;
        }
      } else if (c === '/' && line[i + 1] === '>') {
        depth--;
        i += 2;
        continue;
      }
      i++;
    }
    return depth;
  };

  return lines
    .map((line, idx) => {
      if (idx === 0 && isFrontmatterDelimiter(line)) {
        inFrontmatter = true;
        return line;
      }
      if (inFrontmatter) {
        if (isFrontmatterDelimiter(line)) inFrontmatter = false;
        return line;
      }

      if (isFenceLine(line)) {
        inCode = !inCode;
        return line;
      }
      if (inCode) return line;

      if (!inJsx && isJsxLineStart(line)) {
        inJsx = true;
        jsxDepth = updateJsxDepth(line);
        if (jsxDepth <= 0 && !inTemplateLiteral) {
          inJsx = false;
          jsxDepth = 0;
        }
        return line;
      }

      if (inJsx) {
        jsxDepth += updateJsxDepth(line);
        if (jsxDepth <= 0 && !inTemplateLiteral) {
          inJsx = false;
          jsxDepth = 0;
        }
        return line;
      }

      if (isIndentedCode(line)) return line;

      return escapeBodyLine(line);
    })
    .join(eol);
}

/**
 * @returns {import('vite').Plugin}
 */
export default function mdxBodyEscape() {
  return {
    name: 'mdx-body-escape',
    enforce: 'pre',
    transform(code, id) {
      if (!id) return null;
      const queryless = id.split('?')[0];
      if (!/\.(md|mdx)$/.test(queryless)) return null;
      if (queryless.includes('/node_modules/')) return null;
      const out = processSource(code);
      if (out === code) return null;
      return { code: out, map: null };
    },
  };
}
