import type {
  AnimationElement,
  Anchor,
  ArrowElement,
  LineElement,
  SnapshotMap,
} from '../../animations/schema';
import {
  SVG_NS,
  escapeXml,
  centerOfElement,
  anchorPointsOf,
  polygonBoundingBox,
  pathBBoxOnCanvas,
  textBBoxOnCanvas,
  resolveLineCoords,
  resolveArrowCoords,
} from './canvas-utils';
import { getAnchorPoints } from './anchor-system';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export function renderResizeHandles(
  canvasEl: SVGSVGElement | null,
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  let box: { x: number; y: number; w: number; h: number };
  let handles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  if (baseEl.type === 'rect' || baseEl.type === 'image') {
    box = { x: state.x as number, y: state.y as number, w: state.width as number, h: state.height as number };
  } else if (baseEl.type === 'circle') {
    const r = state.r as number;
    box = { x: (state.cx as number) - r, y: (state.cy as number) - r, w: r * 2, h: r * 2 };
    handles = ['n', 'e', 's', 'w'];
  } else if (baseEl.type === 'text') {
    const bbox = textBBoxOnCanvas(canvasEl, elId);
    if (!bbox) return null;
    box = bbox;
    handles = ['se'];
  } else {
    return null;
  }
  const positions: Record<ResizeHandle, { x: number; y: number; cursor: string }> = {
    nw: { x: box.x, y: box.y, cursor: 'nwse-resize' },
    n: { x: box.x + box.w / 2, y: box.y, cursor: 'ns-resize' },
    ne: { x: box.x + box.w, y: box.y, cursor: 'nesw-resize' },
    e: { x: box.x + box.w, y: box.y + box.h / 2, cursor: 'ew-resize' },
    se: { x: box.x + box.w, y: box.y + box.h, cursor: 'nwse-resize' },
    s: { x: box.x + box.w / 2, y: box.y + box.h, cursor: 'ns-resize' },
    sw: { x: box.x, y: box.y + box.h, cursor: 'nesw-resize' },
    w: { x: box.x, y: box.y + box.h / 2, cursor: 'ew-resize' },
  };
  const g = document.createElementNS(SVG_NS, 'g');
  const rotation = (state.rotation as number) || 0;
  if (rotation && (baseEl.type === 'rect' || baseEl.type === 'image' || baseEl.type === 'circle')) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    g.setAttribute('transform', `rotate(${rotation} ${cx} ${cy})`);
  }
  let html = '';
  for (const h of handles) {
    const p = positions[h];
    html += `<rect x="${p.x - 5}" y="${p.y - 5}" width="10" height="10"
      fill="white" stroke="var(--color-accent)" stroke-width="2" rx="2"
      data-resize-handle="${h}" data-elem-id="${escapeXml(elId)}" style="cursor: ${p.cursor}" />`;
  }
  g.innerHTML = html;
  return g;
}

export function renderRotationHandle(
  canvasEl: SVGSVGElement | null,
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  const center = centerOfElement(baseEl, state);
  if (!center) return null;
  let topY: number | null = null;
  if (baseEl.type === 'rect' || baseEl.type === 'image') {
    topY = (state.y as number) - 24;
  } else if (baseEl.type === 'circle') {
    topY = (state.cy as number) - (state.r as number) - 24;
  } else if (baseEl.type === 'text') {
    const bbox = textBBoxOnCanvas(canvasEl, elId);
    if (bbox) topY = bbox.y - 24;
  } else if (baseEl.type === 'polygon') {
    const bbox = polygonBoundingBox(String(state.points ?? ''));
    if (bbox) topY = bbox.y - 24;
  } else if (baseEl.type === 'path') {
    const bbox = pathBBoxOnCanvas(canvasEl, elId);
    if (bbox) topY = bbox.y - 24;
  }
  if (topY === null) return null;

  const g = document.createElementNS(SVG_NS, 'g');
  const rotation = (state.rotation as number) || 0;
  if (rotation) g.setAttribute('transform', `rotate(${rotation} ${center.x} ${center.y})`);
  g.innerHTML = `
    <line x1="${center.x}" y1="${center.y}" x2="${center.x}" y2="${topY + 8}" stroke="var(--color-accent)" stroke-width="1.5" stroke-dasharray="3 2" pointer-events="none" />
    <circle cx="${center.x}" cy="${topY}" r="8" fill="var(--color-accent)" stroke="white" stroke-width="2" data-rotate-handle="${escapeXml(elId)}" style="cursor: grab" />
    <text x="${center.x + 14}" y="${topY + 4}" font-size="10" fill="var(--color-accent)" font-family="ui-monospace, monospace" pointer-events="none">${Math.round(rotation)}°</text>
  `;
  return g;
}

export function renderAnchorDots(
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  if (baseEl.type !== 'rect' && baseEl.type !== 'circle' && baseEl.type !== 'image') return null;
  const points = anchorPointsOf(baseEl, state);
  const g = document.createElementNS(SVG_NS, 'g');
  for (const p of points) {
    g.innerHTML += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="white" stroke="#6366f1" stroke-width="2"
      data-anchor-handle data-elem-id="${escapeXml(elId)}" data-anchor="${p.anchor}" style="cursor: crosshair" />`;
  }
  return g;
}

export function renderLineEndpointHandles(
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  if (baseEl.type !== 'line' && baseEl.type !== 'arrow') return null;
  const coords = baseEl.type === 'line'
    ? resolveLineCoords(state as unknown as LineElement, snap, byId)
    : resolveArrowCoords(state as unknown as ArrowElement, snap, byId);
  if (!coords) return null;
  const midX = (coords.x1 + coords.x2) / 2;
  const midY = (coords.y1 + coords.y2) / 2;
  const g = document.createElementNS(SVG_NS, 'g');
  g.innerHTML = `
    <rect x="${coords.x1 - 6}" y="${coords.y1 - 6}" width="12" height="12" rx="2"
      fill="white" stroke="var(--color-accent)" stroke-width="2"
      data-endpoint-handle="start" data-elem-id="${escapeXml(elId)}" style="cursor: grab" />
    <rect x="${coords.x2 - 6}" y="${coords.y2 - 6}" width="12" height="12" rx="2"
      fill="white" stroke="var(--color-accent)" stroke-width="2"
      data-endpoint-handle="end" data-elem-id="${escapeXml(elId)}" style="cursor: grab" />
    <circle cx="${midX}" cy="${midY}" r="6"
      fill="var(--color-accent)" stroke="white" stroke-width="2"
      data-line-mid-handle data-elem-id="${escapeXml(elId)}" style="cursor: move" />
  `;
  return g;
}

export function renderPolygonVertexHandles(
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  if (baseEl.type !== 'polygon') return null;
  const points = String(state.points ?? '').trim().split(/\s+/);
  const parsed: { x: number; y: number; i: number }[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i].split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    parsed.push({ x, y, i });
  }
  const g = document.createElementNS(SVG_NS, 'g');
  let html = '';
  if (parsed.length >= 2) {
    for (let i = 0; i < parsed.length; i += 1) {
      const a = parsed[i];
      const b = parsed[(i + 1) % parsed.length];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      html += `<g data-vertex-add data-elem-id="${escapeXml(elId)}" data-after-index="${a.i}" style="cursor: copy">
        <circle cx="${mx}" cy="${my}" r="6" fill="rgba(99, 102, 241, 0.15)" stroke="var(--color-accent)" stroke-width="1.5" stroke-dasharray="2 2" />
        <text x="${mx}" y="${my + 3}" text-anchor="middle" font-size="10" fill="var(--color-accent)" font-weight="700" pointer-events="none">+</text>
      </g>`;
    }
  }
  for (const p of parsed) {
    const removable = parsed.length > 3;
    html += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="white" stroke="var(--color-accent)" stroke-width="2"
      data-vertex-handle data-elem-id="${escapeXml(elId)}" data-vertex-index="${p.i}"
      style="cursor: grab" >
      <title>${removable ? '드래그=이동, 우클릭=삭제' : '드래그=이동'}</title>
    </circle>`;
  }
  g.innerHTML = html;
  return g;
}

export function renderSnapTargets(
  draggingElementId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
  activeSnapTarget: { elementId: string; anchor: Anchor } | null,
): SVGElement | null {
  const g = document.createElementNS(SVG_NS, 'g');
  let html = '';
  for (const baseEl of byId.values()) {
    if (baseEl.id === draggingElementId) continue;
    // Skip lines/arrows — only show snap targets on shapes
    if (baseEl.type === 'line' || baseEl.type === 'arrow') continue;
    const state = snap.get(baseEl.id);
    if (!state || !state.visible) continue;
    const points = getAnchorPoints(baseEl, state as Record<string, unknown>);
    for (const p of points) {
      const isActive =
        activeSnapTarget?.elementId === baseEl.id &&
        activeSnapTarget?.anchor === p.anchor;
      if (isActive) {
        // Prominent snap indicator: larger circle with accent fill
        html += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="var(--color-accent)" stroke="white" stroke-width="2" opacity="0.85" pointer-events="none" />`;
        // Outer pulse ring for visual emphasis
        html += `<circle cx="${p.x}" cy="${p.y}" r="12" fill="none" stroke="var(--color-accent)" stroke-width="1.5" opacity="0.4" pointer-events="none" />`;
      } else {
        // Small dot for available snap points
        html += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="white" stroke="var(--color-accent)" stroke-width="1.5" opacity="0.5" pointer-events="none" />`;
      }
    }
  }
  g.innerHTML = html;
  return g;
}

export function renderSelectionOutline(
  canvasEl: SVGSVGElement | null,
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  let box: { x: number; y: number; w: number; h: number } | null = null;
  if (baseEl.type === 'rect' || baseEl.type === 'image') {
    box = { x: (state.x as number) - 4, y: (state.y as number) - 4, w: (state.width as number) + 8, h: (state.height as number) + 8 };
  } else if (baseEl.type === 'circle') {
    const r = state.r as number;
    box = { x: (state.cx as number) - r - 4, y: (state.cy as number) - r - 4, w: r * 2 + 8, h: r * 2 + 8 };
  } else if (baseEl.type === 'text') {
    const bbox = textBBoxOnCanvas(canvasEl, elId);
    if (bbox) box = { x: bbox.x - 4, y: bbox.y - 4, w: bbox.w + 8, h: bbox.h + 8 };
  } else if (baseEl.type === 'line' || baseEl.type === 'arrow') {
    const coords =
      baseEl.type === 'line'
        ? resolveLineCoords(state as unknown as LineElement, snap, byId)
        : resolveArrowCoords(state as unknown as ArrowElement, snap, byId);
    if (!coords) return null;
    box = {
      x: Math.min(coords.x1, coords.x2) - 4,
      y: Math.min(coords.y1, coords.y2) - 4,
      w: Math.abs(coords.x2 - coords.x1) + 8,
      h: Math.abs(coords.y2 - coords.y1) + 8,
    };
  } else if (baseEl.type === 'polygon') {
    const bbox = polygonBoundingBox(String(state.points ?? ''));
    if (bbox) box = { x: bbox.x - 4, y: bbox.y - 4, w: bbox.w + 8, h: bbox.h + 8 };
  } else if (baseEl.type === 'path') {
    const bbox = pathBBoxOnCanvas(canvasEl, elId);
    if (bbox) box = { x: bbox.x - 4, y: bbox.y - 4, w: bbox.w + 8, h: bbox.h + 8 };
  }
  if (!box) return null;
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(box.x));
  rect.setAttribute('y', String(box.y));
  rect.setAttribute('width', String(box.w));
  rect.setAttribute('height', String(box.h));
  rect.classList.add('element-selected-outline');
  return rect;
}
