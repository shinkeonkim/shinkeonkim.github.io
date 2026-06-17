import type { AnimationEffect, CodeElement } from '../schema';
import { applyEffectColor, applyEffectScale } from './effects';

const JS_KEYWORDS = new Set([
  'async', 'await', 'function', 'return', 'const', 'let', 'var', 'if', 'else',
  'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch',
  'finally', 'throw', 'new', 'class', 'extends', 'super', 'this', 'import',
  'export', 'from', 'default', 'as', 'typeof', 'instanceof', 'in', 'of',
  'yield', 'true', 'false', 'null', 'undefined', 'void', 'delete',
]);
const JS_BUILTINS = new Set([
  'Promise', 'console', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'Math', 'JSON', 'Map', 'Set', 'Symbol', 'Error', 'TypeError', 'Date',
  'document', 'window', 'globalThis', 'process',
]);

interface CodeToken {
  text: string;
  color: string;
}

interface Palette {
  keyword: string;
  string: string;
  comment: string;
  number: string;
  builtin: string;
  text: string;
}

function tokenizeJsLine(line: string, palette: Palette): CodeToken[] {
  const tokens: CodeToken[] = [];
  const commentIdx = line.search(/\/\//);
  let codePart = line;
  let commentPart = '';
  if (commentIdx >= 0) {
    codePart = line.slice(0, commentIdx);
    commentPart = line.slice(commentIdx);
  }
  const re = /(`[^`]*`|"[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)|([^\w`"']+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(codePart)) !== null) {
    if (m[1]) tokens.push({ text: m[1], color: palette.string });
    else if (m[2]) tokens.push({ text: m[2], color: palette.number });
    else if (m[3]) {
      if (JS_KEYWORDS.has(m[3])) tokens.push({ text: m[3], color: palette.keyword });
      else if (JS_BUILTINS.has(m[3])) tokens.push({ text: m[3], color: palette.builtin });
      else tokens.push({ text: m[3], color: palette.text });
    }
    else if (m[4]) tokens.push({ text: m[4], color: palette.text });
  }
  if (commentPart) tokens.push({ text: commentPart, color: palette.comment });
  return tokens;
}

interface CodeProps {
  state: Record<string, unknown>;
  effect: AnimationEffect | undefined;
  currentTime: number;
}

export function RenderCode({ state, effect, currentTime }: CodeProps): React.ReactElement {
  const c = state as unknown as CodeElement;
  const scale = applyEffectScale(effect, currentTime);
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const transform = `translate(${cx} ${cy}) rotate(${c.rotation}) scale(${scale}) translate(${-cx} ${-cy})`;
  const lines = c.content.split('\n');
  const titleHeight = c.title ? 26 : 0;
  const padding = c.padding;
  const charWidth = c.fontSize * 0.6;
  const palette: Palette = {
    keyword: '#c084fc',
    string: '#86efac',
    comment: '#94a3b8',
    number: '#fbbf24',
    builtin: '#7dd3fc',
    text: c.textColor,
  };
  const lineNumberWidth = c.showLineNumbers ? String(lines.length).length * charWidth + 12 : 0;
  return (
    <g transform={transform}>
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={c.cornerRadius}
        fill={applyEffectColor(c.fill, effect, '#1e293b')}
        stroke="rgba(148, 163, 184, 0.2)"
        strokeWidth={1}
      />
      {c.title && (
        <g>
          <rect
            x={c.x}
            y={c.y}
            width={c.width}
            height={titleHeight}
            rx={c.cornerRadius}
            fill="rgba(148, 163, 184, 0.12)"
          />
          <text
            x={c.x + padding}
            y={c.y + 17}
            fontSize={11}
            fontFamily="ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace"
            fontWeight={600}
            fill="#cbd5e1"
            letterSpacing="0.05em"
          >
            {c.title.toUpperCase()}
          </text>
        </g>
      )}
      <text
        x={c.x + padding + lineNumberWidth}
        y={c.y + padding + titleHeight + c.fontSize}
        fontSize={c.fontSize}
        fontFamily="ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace"
        fill={c.textColor}
        xmlSpace="preserve"
      >
        {lines.map((line, i) => {
          const tokens = tokenizeJsLine(line, palette);
          return (
            <tspan
              key={i}
              x={c.x + padding + lineNumberWidth}
              dy={i === 0 ? 0 : '1.4em'}
              xmlSpace="preserve"
            >
              {tokens.length === 0 ? '\u00A0' : tokens.map((t, j) => (
                <tspan key={j} fill={t.color} xmlSpace="preserve">{t.text}</tspan>
              ))}
            </tspan>
          );
        })}
      </text>
      {c.showLineNumbers && (
        <text
          x={c.x + padding}
          y={c.y + padding + titleHeight + c.fontSize}
          fontSize={c.fontSize}
          fontFamily="ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace"
          fill="#64748b"
          textAnchor="end"
        >
          {lines.map((_, i) => (
            <tspan key={i} x={c.x + padding + lineNumberWidth - 8} dy={i === 0 ? 0 : '1.4em'}>
              {i + 1}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}
