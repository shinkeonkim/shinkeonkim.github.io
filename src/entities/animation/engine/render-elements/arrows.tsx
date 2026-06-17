import type {
  Anchor,
  AnimationElement,
  ArrowElement,
  LineElement,
  SnapshotMap,
} from '../schema';
import { elementCenterFromState } from '../phase-styles';
import { engineMarkerUrl } from '../markers';

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

interface ConnectorProps {
  state: Record<string, unknown>;
  snap: SnapshotMap;
  elementMap: Map<string, AnimationElement>;
}

export function RenderLine({ state, snap, elementMap }: ConnectorProps): React.ReactElement | null {
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

export function RenderArrow({ state, snap, elementMap }: ConnectorProps): React.ReactElement | null {
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
  const d = curve === 0
    ? `M ${coords.x1} ${coords.y1} L ${coords.x2} ${coords.y2}`
    : `M ${coords.x1} ${coords.y1} Q ${cx} ${cy} ${coords.x2} ${coords.y2}`;
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
