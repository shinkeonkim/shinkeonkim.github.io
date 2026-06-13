import type {
  AnimationElement,
  Anchor,
  ArrowElement,
  LineElement,
  SnapshotMap,
} from '../../animations/schema';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function cssAttrEscape(s: string): string {
  return s.replace(/["\\]/g, (m) => `\\${m}`);
}

export function centerOfElement(
  baseEl: AnimationElement,
  state: Record<string, unknown>,
): { x: number; y: number } | null {
  if (baseEl.type === 'rect' || baseEl.type === 'image') {
    return {
      x: (state.x as number) + (state.width as number) / 2,
      y: (state.y as number) + (state.height as number) / 2,
    };
  }
  if (baseEl.type === 'circle') return { x: state.cx as number, y: state.cy as number };
  if (baseEl.type === 'text') return { x: state.x as number, y: state.y as number };
  if (baseEl.type === 'polygon') {
    const bbox = polygonBoundingBox(String(state.points ?? ''));
    if (bbox) return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
  }
  if (baseEl.type === 'path') {
    // Use x,y position as center for paths
    const x = state.x as number;
    const y = state.y as number;
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }
  return null;
}

export function anchorPointsOf(
  baseEl: AnimationElement,
  state: Record<string, unknown>,
): { x: number; y: number; anchor: Anchor }[] {
  if (baseEl.type === 'rect' || baseEl.type === 'image') {
    const x = state.x as number;
    const y = state.y as number;
    const w = state.width as number;
    const h = state.height as number;
    return [
      { x: x + w / 2, y, anchor: 'top' },
      { x: x + w, y: y + h / 2, anchor: 'right' },
      { x: x + w / 2, y: y + h, anchor: 'bottom' },
      { x, y: y + h / 2, anchor: 'left' },
    ];
  }
  if (baseEl.type === 'circle') {
    const cx = state.cx as number;
    const cy = state.cy as number;
    const r = state.r as number;
    return [
      { x: cx, y: cy - r, anchor: 'top' },
      { x: cx + r, y: cy, anchor: 'right' },
      { x: cx, y: cy + r, anchor: 'bottom' },
      { x: cx - r, y: cy, anchor: 'left' },
    ];
  }
  return [];
}

export function anchorPointOf(
  el: AnimationElement,
  state: Record<string, unknown>,
  anchor: Anchor,
): { x: number; y: number } | null {
  if (el.type === 'rect' || el.type === 'image') {
    const x = state.x as number;
    const y = state.y as number;
    const w = state.width as number;
    const h = state.height as number;
    const cx = x + w / 2;
    const cy = y + h / 2;
    switch (anchor) {
      case 'top': return { x: cx, y };
      case 'right': return { x: x + w, y: cy };
      case 'bottom': return { x: cx, y: y + h };
      case 'left': return { x, y: cy };
      case 'center':
      case 'auto':
      default: return { x: cx, y: cy };
    }
  }
  if (el.type === 'circle') {
    const cx = state.cx as number;
    const cy = state.cy as number;
    const r = state.r as number;
    switch (anchor) {
      case 'top': return { x: cx, y: cy - r };
      case 'right': return { x: cx + r, y: cy };
      case 'bottom': return { x: cx, y: cy + r };
      case 'left': return { x: cx - r, y: cy };
      default: return { x: cx, y: cy };
    }
  }
  if (el.type === 'text') return { x: state.x as number, y: state.y as number };
  return null;
}

export function pickAutoAnchorTowardPoint(
  el: AnimationElement,
  state: Record<string, unknown>,
  point: { x: number; y: number },
): Anchor {
  const candidates: Anchor[] = ['top', 'right', 'bottom', 'left'];
  let best: Anchor = 'right';
  let bestDist = Infinity;
  for (const a of candidates) {
    const p = anchorPointOf(el, state, a);
    if (!p) continue;
    const d = Math.hypot(p.x - point.x, p.y - point.y);
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}

export function pickAutoAnchorPair(
  fromEl: AnimationElement,
  fromState: Record<string, unknown>,
  toEl: AnimationElement,
  toState: Record<string, unknown>,
): { from: Anchor; to: Anchor } {
  const candidates: Anchor[] = ['top', 'right', 'bottom', 'left'];
  let bestPair: { from: Anchor; to: Anchor } = { from: 'right', to: 'left' };
  let bestDist = Infinity;
  for (const fa of candidates) {
    for (const ta of candidates) {
      const fp = anchorPointOf(fromEl, fromState, fa);
      const tp = anchorPointOf(toEl, toState, ta);
      if (!fp || !tp) continue;
      const d = Math.hypot(tp.x - fp.x, tp.y - fp.y);
      if (d < bestDist) {
        bestDist = d;
        bestPair = { from: fa, to: ta };
      }
    }
  }
  return bestPair;
}

export function firstPolygonPoint(points: string): { x: number; y: number } | null {
  const first = points.trim().split(/\s+/)[0];
  if (!first) return null;
  const [x, y] = first.split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function shiftPolygonPoints(points: string, dx: number, dy: number): string {
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) return `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`;
      return pair;
    })
    .join(' ');
}

export function polygonBoundingBox(points: string): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let any = false;
  for (const pair of points.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    any = true;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!any) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function pathBBoxOnCanvas(
  canvasEl: SVGSVGElement | null,
  elementId: string,
): { x: number; y: number; w: number; h: number } | null {
  if (!canvasEl) return null;
  const g = canvasEl.querySelector<SVGGElement>(`[data-elem-id="${cssAttrEscape(elementId)}"]`);
  if (!g) return null;
  try {
    const bbox = g.getBBox();
    return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height };
  } catch {
    return null;
  }
}

export function textBBoxOnCanvas(
  canvasEl: SVGSVGElement | null,
  elementId: string,
): { x: number; y: number; w: number; h: number } | null {
  if (!canvasEl) return null;
  const g = canvasEl.querySelector<SVGGElement>(`[data-elem-id="${cssAttrEscape(elementId)}"]`);
  if (!g) return null;
  const textEl = g.querySelector('text');
  if (!textEl) return null;
  try {
    const bbox = textEl.getBBox();
    return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height };
  } catch {
    return null;
  }
}

export function resolveArrowCoords(
  a: ArrowElement,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const fromFixed = typeof a.x1 === 'number' && typeof a.y1 === 'number'
    ? { x: a.x1, y: a.y1 } : null;
  const toFixed = typeof a.x2 === 'number' && typeof a.y2 === 'number'
    ? { x: a.x2, y: a.y2 } : null;
  const fromEl = a.fromId ? byId.get(a.fromId) : null;
  const toEl = a.toId ? byId.get(a.toId) : null;
  const fromState = a.fromId ? snap.get(a.fromId) : null;
  const toState = a.toId ? snap.get(a.toId) : null;
  const fromConnected = !!(fromEl && fromState);
  const toConnected = !!(toEl && toState);

  if (!fromConnected && !fromFixed) return null;
  if (!toConnected && !toFixed) return null;

  let fromAnchor: Anchor = a.fromAnchor ?? 'auto';
  let toAnchor: Anchor = a.toAnchor ?? 'auto';

  let p1: { x: number; y: number } | null = null;
  let p2: { x: number; y: number } | null = null;

  if (fromConnected && toConnected) {
    if (fromAnchor === 'auto' || toAnchor === 'auto') {
      const picked = pickAutoAnchorPair(fromEl!, fromState!, toEl!, toState!);
      if (fromAnchor === 'auto') fromAnchor = picked.from;
      if (toAnchor === 'auto') toAnchor = picked.to;
    }
    p1 = anchorPointOf(fromEl!, fromState!, fromAnchor);
    p2 = anchorPointOf(toEl!, toState!, toAnchor);
  } else if (fromConnected && toFixed) {
    if (fromAnchor === 'auto') fromAnchor = pickAutoAnchorTowardPoint(fromEl!, fromState!, toFixed);
    p1 = anchorPointOf(fromEl!, fromState!, fromAnchor);
    p2 = toFixed;
  } else if (fromFixed && toConnected) {
    if (toAnchor === 'auto') toAnchor = pickAutoAnchorTowardPoint(toEl!, toState!, fromFixed);
    p1 = fromFixed;
    p2 = anchorPointOf(toEl!, toState!, toAnchor);
  } else if (fromFixed && toFixed) {
    p1 = fromFixed;
    p2 = toFixed;
  }

  if (!p1 || !p2) return null;
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}

export function resolveLineCoords(
  l: LineElement,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const fromFixed = typeof l.x1 === 'number' && typeof l.y1 === 'number'
    ? { x: l.x1, y: l.y1 } : null;
  const toFixed = typeof l.x2 === 'number' && typeof l.y2 === 'number'
    ? { x: l.x2, y: l.y2 } : null;
  const fromEl = l.fromId ? byId.get(l.fromId) : null;
  const toEl = l.toId ? byId.get(l.toId) : null;
  const fromState = l.fromId ? snap.get(l.fromId) : null;
  const toState = l.toId ? snap.get(l.toId) : null;
  const fromConnected = !!(fromEl && fromState);
  const toConnected = !!(toEl && toState);
  if (!fromConnected && !fromFixed) return null;
  if (!toConnected && !toFixed) return null;

  let fromAnchor: Anchor = l.fromAnchor ?? 'auto';
  let toAnchor: Anchor = l.toAnchor ?? 'auto';

  let p1: { x: number; y: number } | null = null;
  let p2: { x: number; y: number } | null = null;

  if (fromConnected && toConnected) {
    if (fromAnchor === 'auto' || toAnchor === 'auto') {
      const picked = pickAutoAnchorPair(fromEl!, fromState!, toEl!, toState!);
      if (fromAnchor === 'auto') fromAnchor = picked.from;
      if (toAnchor === 'auto') toAnchor = picked.to;
    }
    p1 = anchorPointOf(fromEl!, fromState!, fromAnchor);
    p2 = anchorPointOf(toEl!, toState!, toAnchor);
  } else if (fromConnected && toFixed) {
    if (fromAnchor === 'auto') fromAnchor = pickAutoAnchorTowardPoint(fromEl!, fromState!, toFixed);
    p1 = anchorPointOf(fromEl!, fromState!, fromAnchor);
    p2 = toFixed;
  } else if (fromFixed && toConnected) {
    if (toAnchor === 'auto') toAnchor = pickAutoAnchorTowardPoint(toEl!, toState!, fromFixed);
    p1 = fromFixed;
    p2 = anchorPointOf(toEl!, toState!, toAnchor);
  } else if (fromFixed && toFixed) {
    p1 = fromFixed;
    p2 = toFixed;
  }

  if (!p1 || !p2) return null;
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}
