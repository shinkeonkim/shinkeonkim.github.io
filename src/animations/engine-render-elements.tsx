import type {
  AnimationElement,
  AnimationEffect,
  Anchor,
  ArrowElement,
  CircleElement,
  ImageElement,
  LineElement,
  RectElement,
  SnapshotMap,
  TextElement,
} from './schema';
import { engineMarkerUrl } from './engine-markers';
import { elementCenterFromState } from './engine-phase-styles';

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
        <text x={cx} y={cy + r.labelSize + 8} textAnchor="middle" fontSize={10} fill={r.labelColor} opacity={0.7}>
          {r.subtitle}
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
        <text x={midX} y={midY + 4} textAnchor="middle" fontSize="12" fontFamily="ui-monospace, monospace" fill={a.labelColor}>
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
  const p = state as unknown as { x: number; y: number; d: string; fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string; opacity: number };
  const transform = p.x === 0 && p.y === 0 ? undefined : `translate(${p.x} ${p.y})`;
  return (
    <path
      d={p.d}
      transform={transform}
      fill={p.fill}
      stroke={p.stroke}
      strokeWidth={p.strokeWidth}
      strokeDasharray={p.strokeDasharray}
      opacity={p.opacity}
    />
  );
}

function RenderPolygon({ state }: { state: Record<string, unknown> }): React.ReactElement {
  const p = state as unknown as { points: string; fill: string; stroke: string; strokeWidth: number; opacity: number };
  return <polygon points={p.points} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} opacity={p.opacity} />;
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
