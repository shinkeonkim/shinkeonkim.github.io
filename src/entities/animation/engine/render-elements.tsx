import type {
  AnimationElement,
  AnimationEffect,
  Anchor,
  ArrowElement,
  CircleElement,
  CodeElement,
  ImageElement,
  LineElement,
  RectElement,
  SnapshotMap,
  TextElement,
} from './schema';
import { engineMarkerUrl } from './markers';
import { elementCenterFromState } from './phase-styles';

export interface RenderProps {
  baseType: AnimationElement['type'];
  state: Record<string, unknown>;
  snap: SnapshotMap;
  elementMap: Map<string, AnimationElement>;
  effect: AnimationEffect | undefined;
  currentTime: number;
}

export function RenderElement({ baseType, state, snap, elementMap, effect, currentTime }: RenderProps): React.ReactElement | null {
  if (baseType === 'rect') return <RenderRect state={state} effect={effect} currentTime={currentTime} />;
  if (baseType === 'circle') return <RenderCircle state={state} effect={effect} currentTime={currentTime} />;
  if (baseType === 'line') return <RenderLine state={state} snap={snap} elementMap={elementMap} />;
  if (baseType === 'arrow') return <RenderArrow state={state} snap={snap} elementMap={elementMap} />;
  if (baseType === 'text') return <RenderText state={state} />;
  if (baseType === 'image') return <RenderImage state={state} />;
  if (baseType === 'path') return <RenderPath state={state} />;
  if (baseType === 'polygon') return <RenderPolygon state={state} />;
  if (baseType === 'code') return <RenderCode state={state} effect={effect} currentTime={currentTime} />;
  return null;
}

function applyEffectColor(stateColor: string | undefined, effect: AnimationEffect | undefined, defaultColor: string): string {
  if (effect && effect.type === 'highlight') return effect.color;
  return (stateColor as string) ?? defaultColor;
}

function applyEffectScale(effect: AnimationEffect | undefined, currentTime: number): number {
  if (effect && effect.type === 'pulse') {
    const elapsed = currentTime - effect.time;
    const t = Math.max(0, Math.min(1, elapsed / effect.duration));
    const pulse = Math.sin(t * Math.PI);
    return 1 + (effect.scale - 1) * pulse;
  }
  return 1;
}

function RenderRect({ state, effect, currentTime }: { state: Record<string, unknown>; effect: AnimationEffect | undefined; currentTime: number }): React.ReactElement {
  const r = state as unknown as RectElement;
  const scale = applyEffectScale(effect, currentTime);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const transform = `translate(${cx} ${cy}) rotate(${r.rotation}) scale(${scale}) translate(${-cx} ${-cy})`;
  return (
    <g transform={transform}>
      <rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        rx={r.cornerRadius}
        fill={applyEffectColor(r.fill, effect, '#a5b4fc')}
        stroke={r.stroke}
        strokeWidth={r.strokeWidth}
      />
      {r.label && (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={r.labelSize} fontWeight={600} fill={r.labelColor}>
          {r.label}
        </text>
      )}
      {r.subtitle && (
        <text x={cx} y={cy + r.labelSize + 8} textAnchor="middle" fontSize={r.subtitleSize ?? 10} fill={r.labelColor} opacity={0.7}>
          {r.subtitle.split('\n').map((line, i) => (
            <tspan key={i} x={cx} dy={i === 0 ? 0 : '1.2em'}>
              {line || '\u00A0'}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

function RenderCircle({ state, effect, currentTime }: { state: Record<string, unknown>; effect: AnimationEffect | undefined; currentTime: number }): React.ReactElement {
  const c = state as unknown as CircleElement;
  const scale = applyEffectScale(effect, currentTime);
  const transform = `translate(${c.cx} ${c.cy}) rotate(${c.rotation}) scale(${scale}) translate(${-c.cx} ${-c.cy})`;
  return (
    <g transform={transform}>
      <circle
        cx={c.cx}
        cy={c.cy}
        r={c.r}
        fill={applyEffectColor(c.fill, effect, '#a5b4fc')}
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
      {c.label && (
        <text x={c.cx} y={c.cy + 5} textAnchor="middle" fontSize={c.labelSize} fontWeight={600} fill={c.labelColor}>
          {c.label}
        </text>
      )}
    </g>
  );
}

function anchorOffset(el: AnimationElement, state: Record<string, unknown>, anchor: Anchor | undefined): { x: number; y: number } {
  const center = elementCenterFromState(el, state) ?? { x: 0, y: 0 };
  if (anchor === 'top') {
    if (el.type === 'rect' || el.type === 'image') return { x: center.x, y: state.y as number };
    if (el.type === 'circle') return { x: center.x, y: (state.cy as number) - (state.r as number) };
  }
  if (anchor === 'bottom') {
    if (el.type === 'rect' || el.type === 'image') return { x: center.x, y: (state.y as number) + (state.height as number) };
    if (el.type === 'circle') return { x: center.x, y: (state.cy as number) + (state.r as number) };
  }
  if (anchor === 'left') {
    if (el.type === 'rect' || el.type === 'image') return { x: state.x as number, y: center.y };
    if (el.type === 'circle') return { x: (state.cx as number) - (state.r as number), y: center.y };
  }
  if (anchor === 'right') {
    if (el.type === 'rect' || el.type === 'image') return { x: (state.x as number) + (state.width as number), y: center.y };
    if (el.type === 'circle') return { x: (state.cx as number) + (state.r as number), y: center.y };
  }
  if (anchor === 'top-left') {
    if (el.type === 'rect' || el.type === 'image') return { x: state.x as number, y: state.y as number };
  }
  if (anchor === 'top-right') {
    if (el.type === 'rect' || el.type === 'image') return { x: (state.x as number) + (state.width as number), y: state.y as number };
  }
  if (anchor === 'bottom-left') {
    if (el.type === 'rect' || el.type === 'image') return { x: state.x as number, y: (state.y as number) + (state.height as number) };
  }
  if (anchor === 'bottom-right') {
    if (el.type === 'rect' || el.type === 'image') return { x: (state.x as number) + (state.width as number), y: (state.y as number) + (state.height as number) };
  }
  return center;
}

export function resolveArrowCoords(
  el: ArrowElement | LineElement,
  snap: SnapshotMap,
  elementMap: Map<string, AnimationElement>,
): { x1: number; y1: number; x2: number; y2: number } | null {
  let x1: number | undefined;
  let y1: number | undefined;
  let x2: number | undefined;
  let y2: number | undefined;
  if (el.fromId) {
    const fromState = snap.get(el.fromId);
    const fromBase = elementMap.get(el.fromId);
    if (fromState && fromBase) {
      const p = anchorOffset(fromBase, fromState, el.fromAnchor);
      x1 = p.x;
      y1 = p.y;
    }
  } else {
    x1 = el.x1;
    y1 = el.y1;
  }
  if (el.toId) {
    const toState = snap.get(el.toId);
    const toBase = elementMap.get(el.toId);
    if (toState && toBase) {
      const p = anchorOffset(toBase, toState, el.toAnchor);
      x2 = p.x;
      y2 = p.y;
    }
  } else {
    x2 = el.x2;
    y2 = el.y2;
  }
  if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') return null;
  return { x1, y1, x2, y2 };
}

function RenderLine({ state, snap, elementMap }: { state: Record<string, unknown>; snap: SnapshotMap; elementMap: Map<string, AnimationElement> }): React.ReactElement | null {
  const l = state as unknown as LineElement;
  const coords = resolveArrowCoords(l, snap, elementMap);
  if (!coords) return null;
  return (
    <line
      x1={coords.x1}
      y1={coords.y1}
      x2={coords.x2}
      y2={coords.y2}
      stroke={l.stroke}
      strokeWidth={l.strokeWidth}
      strokeDasharray={l.strokeDasharray}
      markerStart={engineMarkerUrl(l.headStart, 'start')}
      markerEnd={engineMarkerUrl(l.headEnd, 'end')}
      style={{ color: l.stroke }}
    />
  );
}

function RenderArrow({ state, snap, elementMap }: { state: Record<string, unknown>; snap: SnapshotMap; elementMap: Map<string, AnimationElement> }): React.ReactElement | null {
  const a = state as unknown as ArrowElement;
  const coords = resolveArrowCoords(a, snap, elementMap);
  if (!coords) return null;
  const midX = (coords.x1 + coords.x2) / 2;
  const midY = (coords.y1 + coords.y2) / 2;
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const curve = a.curvature ?? 0;
  const cx = midX + nx * curve;
  const cy = midY + ny * curve;
  const d = curve === 0 ? `M ${coords.x1} ${coords.y1} L ${coords.x2} ${coords.y2}` : `M ${coords.x1} ${coords.y1} Q ${cx} ${cy} ${coords.x2} ${coords.y2}`;
  return (
    <g style={{ color: a.stroke }}>
      <path
        d={d}
        fill="none"
        stroke={a.stroke}
        strokeWidth={a.strokeWidth}
        strokeDasharray={a.strokeDasharray}
        markerStart={engineMarkerUrl(a.headStart, 'start')}
        markerEnd={engineMarkerUrl(a.headEnd, 'end')}
      />
      {a.label && (
        <text x={midX + (a.labelOffsetX ?? 0)} y={midY + (a.labelOffsetY ?? 4)} textAnchor="middle" fontSize="12" fontFamily="ui-monospace, monospace" fill={a.labelColor}>
          {a.label}
        </text>
      )}
    </g>
  );
}

function RenderText({ state }: { state: Record<string, unknown> }): React.ReactElement {
  const t = state as unknown as TextElement;
  return (
    <text
      x={t.x}
      y={t.y}
      fontSize={t.fontSize}
      fontWeight={t.fontWeight}
      fill={t.color}
      textAnchor={t.textAnchor}
      transform={t.rotation ? `rotate(${t.rotation} ${t.x} ${t.y})` : undefined}
    >
      {t.content}
    </text>
  );
}

function RenderImage({ state }: { state: Record<string, unknown> }): React.ReactElement {
  const im = state as unknown as ImageElement;
  return (
    <image
      x={im.x}
      y={im.y}
      width={im.width}
      height={im.height}
      href={im.src}
      preserveAspectRatio={im.preserveAspectRatio}
      opacity={im.opacity}
    />
  );
}

function RenderPath({ state }: { state: Record<string, unknown> }): React.ReactElement {
  const p = state as unknown as { x: number; y: number; d: string; fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string; opacity: number; rotation: number };
  const transform = [
    p.x !== 0 || p.y !== 0 ? `translate(${p.x} ${p.y})` : '',
    p.rotation ? `rotate(${p.rotation})` : '',
  ].filter(Boolean).join(' ');
  return (
    <path
      d={p.d}
      transform={transform || undefined}
      fill={p.fill}
      stroke={p.stroke}
      strokeWidth={p.strokeWidth}
      strokeDasharray={p.strokeDasharray}
      opacity={p.opacity}
    />
  );
}

function computePolygonCentroid(points: string): { x: number; y: number } {
  const pts = points.trim().split(/\s+/).map(pair => {
    const [x, y] = pair.split(',').map(Number);
    return { x, y };
  });
  if (pts.length === 0) return { x: 0, y: 0 };
  const sum = pts.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

function RenderPolygon({ state }: { state: Record<string, unknown> }): React.ReactElement {
  const p = state as unknown as { points: string; fill: string; stroke: string; strokeWidth: number; opacity: number; rotation: number };
  const centroid = computePolygonCentroid(p.points);
  const transform = p.rotation ? `rotate(${p.rotation} ${centroid.x} ${centroid.y})` : undefined;
  return <polygon points={p.points} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} opacity={p.opacity} transform={transform} />;
}

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

function tokenizeJsLine(line: string, palette: { keyword: string; string: string; comment: string; number: string; builtin: string; text: string }): CodeToken[] {
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

function RenderCode({ state, effect, currentTime }: { state: Record<string, unknown>; effect: AnimationEffect | undefined; currentTime: number }): React.ReactElement {
  const c = state as unknown as CodeElement;
  const scale = applyEffectScale(effect, currentTime);
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const transform = `translate(${cx} ${cy}) rotate(${c.rotation}) scale(${scale}) translate(${-cx} ${-cy})`;
  const lines = c.content.split('\n');
  const titleHeight = c.title ? 26 : 0;
  const padding = c.padding;
  const charWidth = c.fontSize * 0.6;
  const palette = {
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

export function FlowParticle({
  x1,
  y1,
  x2,
  y2,
  color,
  radius,
  offset,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  radius: number;
  offset: number;
}): React.ReactElement {
  const t = offset;
  const x = x1 + (x2 - x1) * t;
  const y = y1 + (y2 - y1) * t;
  return <circle cx={x} cy={y} r={radius} fill={color} opacity={0.85} />;
}
