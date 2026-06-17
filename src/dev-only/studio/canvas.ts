import type {
  AnimationElement,
  ArrowElement,
  CircleElement,
  ImageElement,
  LineElement,
  RectElement,
  SnapshotMap,
  TextElement,
} from '@/entities/animation/engine/schema';
import {
  getDef,
  getSelection,
  getCurrentSnapshot,
  setSelection,
  updateElementBase,
  setElementValueAtTime,
  addElement,
  uniqueElementId,
  subscribe,
  isElementSelected,
  toggleSelectionFor,
  getSelectedElementIds,
} from './state';
import { snapPoint } from './grid';
import type { Anchor } from '@/entities/animation/engine/schema';
import { findContainingGroup, groupBbox, isGroup, moveGroupBy } from './studio-groups';
import {
  SVG_NS,
  escapeXml,
  centerOfElement,
  firstPolygonPoint,
  shiftPolygonPoints,
  textBBoxOnCanvas,
  resolveArrowCoords,
  resolveLineCoords,
  polygonBoundingBox,
  pathBBoxOnCanvas,
} from './canvas-utils';
import { getAnchorPoints, findNearestAnchor } from './anchor-system';
import {
  renderResizeHandles,
  renderRotationHandle,
  renderAnchorDots,
  renderLineEndpointHandles,
  renderPolygonVertexHandles,
  renderSnapTargets,
  renderSelectionOutline,
} from './canvas-handles';

interface DragExtra {
  id: string;
  startX: number;
  startY: number;
  originalPolygonPoints?: string;
}

interface DragState {
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startElemX: number;
  startElemY: number;
  originalPolygonPoints?: string;
  extras: DragExtra[];
}

interface RotateState {
  elementId: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  startRotation: number;
}

interface ConnectState {
  fromId: string;
  fromAnchor: import('@/entities/animation/engine/schema').Anchor;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface EndpointDragState {
  elementId: string;
  end: 'start' | 'end';
  currentX: number;
  currentY: number;
  snapTarget: { elementId: string; anchor: Anchor; x: number; y: number } | null;
}

const SNAP_RADIUS = 12;

const HEAD_MARKER_DEFS = `
  <marker id="studio-h-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="studio-h-arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="studio-h-triangle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="studio-h-triangle-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="studio-h-triangle-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="studio-h-triangle-open-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="studio-h-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
    <circle cx="5" cy="5" r="4" fill="currentColor" />
  </marker>
  <marker id="studio-h-circle-open" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7">
    <circle cx="5" cy="5" r="4" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="studio-h-diamond" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="currentColor" />
  </marker>
  <marker id="studio-h-diamond-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="currentColor" />
  </marker>
  <marker id="studio-h-diamond-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="studio-h-diamond-open-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="studio-h-bar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="10" orient="auto">
    <rect x="4" y="0" width="2" height="10" fill="currentColor" />
  </marker>
`;

function markerUrlFor(head: string | undefined, end: 'start' | 'end'): string {
  if (!head || head === 'none') return '';
  const isOpenCircle = head === 'circle-open';
  const isCircle = head === 'circle' || isOpenCircle;
  if (isCircle) return `url(#studio-h-${head})`;
  const idBase = `studio-h-${head}`;
  return end === 'start' ? `url(#${idBase}-start)` : `url(#${idBase})`;
}

interface VertexDragState {
  elementId: string;
  vertexIndex: number;
  originalPoints: string;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeState {
  elementId: string;
  handle: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  startCx?: number;
  startCy?: number;
  startR?: number;
  startFontSize?: number;
  aspect: number;
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

let dragState: DragState | null = null;
let rotateState: RotateState | null = null;
let connectState: ConnectState | null = null;
let endpointDragState: EndpointDragState | null = null;
let vertexDragState: VertexDragState | null = null;
let resizeState: ResizeState | null = null;
let marqueeState: MarqueeState | null = null;
let marqueeJustFinished = false;
let canvasEl: SVGSVGElement | null = null;
let hoveredElementId: string | null = null;
let canvasZoom = 1;

export function initCanvas(root: SVGSVGElement): void {
  canvasEl = root;
  root.addEventListener('click', onCanvasClick);
  root.addEventListener('mousedown', onMouseDown);
  root.addEventListener('mouseover', onMouseOver);
  root.addEventListener('mouseleave', onMouseLeave);
  root.addEventListener('contextmenu', onContextMenu);
  root.addEventListener('wheel', onCanvasWheel, { passive: false });
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  subscribe(render);
  render();
}

function onCanvasWheel(e: WheelEvent): void {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  const wrap = canvasEl?.closest('.studio-canvas-wrap') as HTMLElement | null;
  if (!wrap) {
    canvasZoom = Math.max(0.1, Math.min(5, canvasZoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    render();
    return;
  }
  const wrapRect = wrap.getBoundingClientRect();
  const mxInWrap = e.clientX - wrapRect.left + wrap.scrollLeft;
  const myInWrap = e.clientY - wrapRect.top + wrap.scrollTop;
  const old = canvasZoom;
  canvasZoom = Math.max(0.1, Math.min(5, canvasZoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
  const ratio = canvasZoom / old;
  render();
  wrap.scrollLeft = mxInWrap * ratio - (e.clientX - wrapRect.left);
  wrap.scrollTop = myInWrap * ratio - (e.clientY - wrapRect.top);
}

function onContextMenu(e: MouseEvent): void {
  const target = e.target as Element | null;
  const vertexEl = target?.closest<SVGElement>('[data-vertex-handle]');
  if (!vertexEl) return;
  const id = vertexEl.dataset.elemId ?? '';
  const idx = Number(vertexEl.dataset.vertexIndex ?? '-1');
  const def = getDef();
  if (!def || idx < 0) return;
  const el = def.elements.find((x) => x.id === id);
  if (!el || el.type !== 'polygon') return;
  const snap = getCurrentSnapshot();
  const state = snap.get(id);
  if (!state) return;
  const points = String(state.points ?? '').trim().split(/\s+/);
  if (points.length <= 3) return;
  e.preventDefault();
  points.splice(idx, 1);
  setElementValueAtTime(id, { points: points.join(' ') });
}

function onMouseOver(e: MouseEvent): void {
  const id = findElementId(e.target);
  if (id !== hoveredElementId) {
    hoveredElementId = id;
    render();
  }
}

function onMouseLeave(): void {
  if (hoveredElementId !== null) {
    hoveredElementId = null;
    render();
  }
}

function svgPoint(clientX: number, clientY: number): { x: number; y: number } | null {
  if (!canvasEl) return null;
  const def = getDef();
  if (!def) return null;
  const rect = canvasEl.getBoundingClientRect();
  const sx = def.canvas.width / rect.width;
  const sy = def.canvas.height / rect.height;
  return snapPoint({ x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy });
}

function findElementId(target: EventTarget | null): string | null {
  let node = target as Element | null;
  while (node && node !== canvasEl) {
    const id = node.getAttribute?.('data-elem-id');
    if (id) return id;
    node = node.parentElement;
  }
  return null;
}

function onCanvasClick(e: MouseEvent): void {
  if (dragState || rotateState || connectState) return;
  if (marqueeJustFinished) {
    marqueeJustFinished = false;
    return;
  }
  const target = e.target as Element | null;
  const addVertexHandle = target?.closest<SVGElement>('[data-vertex-add]');
  if (addVertexHandle) {
    e.preventDefault();
    e.stopPropagation();
    const id = addVertexHandle.dataset.elemId ?? '';
    const afterIdx = Number(addVertexHandle.dataset.afterIndex ?? '-1');
    const def = getDef();
    if (!def || afterIdx < 0) return;
    const el = def.elements.find((x) => x.id === id);
    if (!el || el.type !== 'polygon') return;
    const snap = getCurrentSnapshot();
    const state = snap.get(id);
    if (!state) return;
    const points = String(state.points ?? '').trim().split(/\s+/);
    const a = points[afterIdx]?.split(',').map(Number) ?? [];
    const b = points[(afterIdx + 1) % points.length]?.split(',').map(Number) ?? [];
    if (a.length !== 2 || b.length !== 2) return;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    points.splice(afterIdx + 1, 0, `${mx.toFixed(1)},${my.toFixed(1)}`);
    setElementValueAtTime(id, { points: points.join(' ') });
    return;
  }
  if (target?.closest('[data-rotate-handle], [data-anchor-handle], [data-resize-handle]')) return;
  const id = findElementId(e.target);
  if (id) {
    const resolvedId = e.altKey ? id : (findContainingGroup(id)?.id ?? id);
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelection(toggleSelectionFor(getSelection(), resolvedId));
    } else {
      setSelection({ kind: 'element', elementId: resolvedId });
    }
  } else if (e.target === canvasEl) setSelection({ kind: 'none' });
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  const target = e.target as Element | null;
  const def = getDef();
  if (!def) return;

  if (target?.closest<SVGElement>('[data-vertex-add]')) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const resizeHandle = target?.closest<SVGElement>('[data-resize-handle]');
  if (resizeHandle) {
    e.preventDefault();
    const id = resizeHandle.dataset.elemId ?? '';
    const handle = resizeHandle.dataset.resizeHandle as ResizeHandle;
    const snap = getCurrentSnapshot();
    const elState = snap.get(id);
    const baseEl = def.elements.find((x) => x.id === id);
    if (!elState || !baseEl) return;
    const rs: ResizeState = {
      elementId: id,
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: 0,
      startY: 0,
      startW: 0,
      startH: 0,
      aspect: 1,
    };
    if (baseEl.type === 'rect' || baseEl.type === 'image') {
      rs.startX = elState.x as number;
      rs.startY = elState.y as number;
      rs.startW = elState.width as number;
      rs.startH = elState.height as number;
      rs.aspect = rs.startW / Math.max(1, rs.startH);
    } else if (baseEl.type === 'circle') {
      rs.startCx = elState.cx as number;
      rs.startCy = elState.cy as number;
      rs.startR = elState.r as number;
    } else if (baseEl.type === 'text') {
      const bbox = textBBoxOnCanvas(canvasEl, id);
      rs.startX = bbox?.x ?? (elState.x as number);
      rs.startY = bbox?.y ?? (elState.y as number);
      rs.startW = bbox?.w ?? 100;
      rs.startH = bbox?.h ?? (elState.fontSize as number);
      rs.startFontSize = elState.fontSize as number;
      rs.aspect = rs.startW / Math.max(1, rs.startH);
    } else {
      return;
    }
    resizeState = rs;
    setSelection({ kind: 'element', elementId: id });
    render();
    return;
  }

  const vertexHandle = target?.closest<SVGElement>('[data-vertex-handle]');
  if (vertexHandle) {
    e.preventDefault();
    const id = vertexHandle.dataset.elemId ?? '';
    const vi = Number(vertexHandle.dataset.vertexIndex ?? '-1');
    const snap = getCurrentSnapshot();
    const elState = snap.get(id);
    if (!elState || vi < 0) return;
    vertexDragState = {
      elementId: id,
      vertexIndex: vi,
      originalPoints: String(elState.points ?? ''),
    };
    setSelection({ kind: 'element', elementId: id });
    render();
    return;
  }

  const endpointHandle = target?.closest<SVGElement>('[data-endpoint-handle]');
  if (endpointHandle) {
    e.preventDefault();
    const id = endpointHandle.dataset.elemId ?? '';
    const end = (endpointHandle.dataset.endpointHandle === 'end' ? 'end' : 'start') as 'start' | 'end';
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    endpointDragState = { elementId: id, end, currentX: pt.x, currentY: pt.y, snapTarget: null };
    setSelection({ kind: 'element', elementId: id });
    render();
    return;
  }

  const midHandle = target?.closest<SVGElement>('[data-line-mid-handle]');
  if (midHandle) {
    e.preventDefault();
    const id = midHandle.dataset.elemId ?? '';
    const snap = getCurrentSnapshot();
    const elState = snap.get(id);
    const baseEl = def.elements.find((x) => x.id === id);
    if (!elState || !baseEl) return;
    const anchor = readPositionAnchor(baseEl, elState);
    if (!anchor) return;
    dragState = {
      elementId: id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElemX: anchor.x,
      startElemY: anchor.y,
      extras: collectDragExtras(id, def, snap),
    };
    if (!isElementSelected(getSelection(), id)) {
      setSelection({ kind: 'element', elementId: id });
    }
    return;
  }

  const rotateHandle = target?.closest<SVGElement>('[data-rotate-handle]');
  if (rotateHandle) {
    e.preventDefault();
    const id = rotateHandle.dataset.rotateHandle ?? '';
    const snap = getCurrentSnapshot();
    const state = snap.get(id);
    const baseEl = def.elements.find((x) => x.id === id);
    if (!state || !baseEl) return;
    const center = centerOfElement(baseEl, state);
    if (!center) return;
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    const startAngle = (Math.atan2(pt.y - center.y, pt.x - center.x) * 180) / Math.PI;
    rotateState = {
      elementId: id,
      centerX: center.x,
      centerY: center.y,
      startAngle,
      startRotation: (state.rotation as number) || 0,
    };
    return;
  }

  const anchorHandle = target?.closest<SVGElement>('[data-anchor-handle]');
  if (anchorHandle) {
    e.preventDefault();
    const fromId = anchorHandle.dataset.elemId ?? '';
    const fromAnchor = (anchorHandle.dataset.anchor ?? 'auto') as Anchor;
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    connectState = {
      fromId,
      fromAnchor,
      startX: Number(anchorHandle.getAttribute('cx')) || pt.x,
      startY: Number(anchorHandle.getAttribute('cy')) || pt.y,
      currentX: pt.x,
      currentY: pt.y,
    };
    render();
    return;
  }

  const rawId = findElementId(e.target);
  if (!rawId) {
    // No element hit, start marquee if no shift key
    if (!e.shiftKey && e.target === canvasEl) {
      const pt = svgPoint(e.clientX, e.clientY);
      if (pt) {
        marqueeState = { startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y };
      }
    }
    return;
  }
  const id = e.altKey ? rawId : (findContainingGroup(rawId)?.id ?? rawId);
  const snap = getCurrentSnapshot();
  const elState = snap.get(id);
  const baseEl = def.elements.find((x) => x.id === id);
  if (!elState || !baseEl) return;
  if ((baseEl.type === 'arrow' || baseEl.type === 'line') && baseEl.fromId && baseEl.toId) {
    setSelection({ kind: 'element', elementId: id });
    return;
  }
  const anchor = readPositionAnchor(baseEl, elState);
  if (!anchor) return;
  dragState = {
    elementId: id,
    startMouseX: e.clientX,
    startMouseY: e.clientY,
    startElemX: anchor.x,
    startElemY: anchor.y,
    originalPolygonPoints: baseEl.type === 'polygon' ? String(elState.points ?? '') : undefined,
    extras: collectDragExtras(id, def, snap),
  };
  if (!isElementSelected(getSelection(), id)) {
    setSelection({ kind: 'element', elementId: id });
  }
}

function collectDragExtras(anchorId: string, def: ReturnType<typeof getDef>, snap: SnapshotMap): DragExtra[] {
  if (!def) return [];
  const sel = getSelection();
  const ids = getSelectedElementIds(sel).filter((id) => id !== anchorId);
  const extras: DragExtra[] = [];
  for (const id of ids) {
    const el = def.elements.find((x) => x.id === id);
    const st = snap.get(id);
    if (!el || !st) continue;
    const a = readPositionAnchor(el, st);
    if (!a) continue;
    extras.push({
      id,
      startX: a.x,
      startY: a.y,
      originalPolygonPoints: el.type === 'polygon' ? String(st.points ?? '') : undefined,
    });
  }
  return extras;
}

function onMouseMove(e: MouseEvent): void {
  if (resizeState) {
    handleResizeMove(e);
    return;
  }
  if (vertexDragState) {
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    const pts = vertexDragState.originalPoints.trim().split(/\s+/);
    if (vertexDragState.vertexIndex < pts.length) {
      pts[vertexDragState.vertexIndex] = `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      setElementValueAtTime(vertexDragState.elementId, { points: pts.join(' ') });
    }
    return;
  }
  if (endpointDragState) {
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    endpointDragState.currentX = pt.x;
    endpointDragState.currentY = pt.y;
    endpointDragState.snapTarget = findSnapTarget(pt.x, pt.y, endpointDragState.elementId);
    const def = getDef();
    if (!def) return;
    const baseEl = def.elements.find((x) => x.id === endpointDragState!.elementId);
    if (!baseEl) return;
    const finalX = endpointDragState.snapTarget ? endpointDragState.snapTarget.x : pt.x;
    const finalY = endpointDragState.snapTarget ? endpointDragState.snapTarget.y : pt.y;
    if (baseEl.type === 'line' || baseEl.type === 'arrow') {
      if (endpointDragState.snapTarget) {
        if (endpointDragState.end === 'start') {
          setElementValueAtTime(baseEl.id, {
            fromId: endpointDragState.snapTarget.elementId,
            fromAnchor: endpointDragState.snapTarget.anchor,
            x1: undefined, y1: undefined,
          });
        } else {
          setElementValueAtTime(baseEl.id, {
            toId: endpointDragState.snapTarget.elementId,
            toAnchor: endpointDragState.snapTarget.anchor,
            x2: undefined, y2: undefined,
          });
        }
      } else {
        if (endpointDragState.end === 'start') {
          updateElementBase(baseEl.id, { fromId: undefined, fromAnchor: undefined, x1: finalX, y1: finalY });
        } else {
          updateElementBase(baseEl.id, { toId: undefined, toAnchor: undefined, x2: finalX, y2: finalY });
        }
      }
    }
    render();
    return;
  }
  if (rotateState) {
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    const angle = (Math.atan2(pt.y - rotateState.centerY, pt.x - rotateState.centerX) * 180) / Math.PI;
    const delta = angle - rotateState.startAngle;
    setElementValueAtTime(rotateState.elementId, {
      rotation: Math.round((rotateState.startRotation + delta + 360) % 360),
    });
    return;
  }
  if (connectState) {
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    connectState.currentX = pt.x;
    connectState.currentY = pt.y;
    render();
    return;
  }
  if (marqueeState) {
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    marqueeState.currentX = pt.x;
    marqueeState.currentY = pt.y;
    render();
    return;
  }
  if (!dragState || !canvasEl) return;
  const def = getDef();
  if (!def) return;
  const baseEl = def.elements.find((x) => x.id === dragState!.elementId);
  if (!baseEl) return;
  const svgRect = canvasEl.getBoundingClientRect();
  const scaleX = def.canvas.width / svgRect.width;
  const scaleY = def.canvas.height / svgRect.height;
  const dx = (e.clientX - dragState.startMouseX) * scaleX;
  const dy = (e.clientY - dragState.startMouseY) * scaleY;
  const targetX = Math.round(dragState.startElemX + dx);
  const targetY = Math.round(dragState.startElemY + dy);
  const snap = getCurrentSnapshot();
  const elState = snap.get(dragState.elementId);
  if (!elState) return;
  applyMove(baseEl, elState, targetX, targetY);
  for (const extra of dragState.extras) {
    const eEl = def.elements.find((x) => x.id === extra.id);
    const eState = snap.get(extra.id);
    if (!eEl || !eState) continue;
    applyMove(eEl, eState, Math.round(extra.startX + dx), Math.round(extra.startY + dy), extra.originalPolygonPoints);
  }
}

function onMouseUp(e: MouseEvent): void {
  if (resizeState) {
    resizeState = null;
    render();
  }
  if (vertexDragState) {
    vertexDragState = null;
    render();
  }
  if (endpointDragState) {
    endpointDragState = null;
    render();
  }
  if (connectState) {
    const target = e.target as Element | null;
    const anchorHandle = target?.closest<SVGElement>('[data-anchor-handle]');
    const elemId = anchorHandle?.dataset.elemId ?? findElementId(e.target);
    const toAnchor = (anchorHandle?.dataset.anchor ?? 'auto') as Anchor;
    if (elemId && elemId !== connectState.fromId) {
      const def = getDef();
      if (def) {
        const newId = uniqueElementId('arrow');
        addElement({
          type: 'arrow',
          id: newId,
          rotation: 0, appearances: [], tracks: [],
          fromId: connectState.fromId,
          toId: elemId,
          fromAnchor: connectState.fromAnchor,
          toAnchor,
          stroke: '#6366f1',
          strokeWidth: 2,
          curvature: 0,
          labelColor: '#0b0b0f',
          labelOffsetX: 0,
          labelOffsetY: 4,
          headStart: 'none',
          headEnd: 'arrow',
        });
      }
    }
    connectState = null;
    render();
  }
  if (marqueeState) {
    const mx = Math.min(marqueeState.startX, marqueeState.currentX);
    const my = Math.min(marqueeState.startY, marqueeState.currentY);
    const mw = Math.abs(marqueeState.currentX - marqueeState.startX);
    const mh = Math.abs(marqueeState.currentY - marqueeState.startY);
    marqueeState = null;
    marqueeJustFinished = true;

    // Skip selection change if marquee area is zero
    if (mw > 0 && mh > 0) {
      const def = getDef();
      if (def) {
        const snap = getCurrentSnapshot();
        const marqueeBbox = { x: mx, y: my, w: mw, h: mh };
        const matchedIds: string[] = [];
        for (const el of def.elements) {
          const state = snap.get(el.id);
          if (!state) continue;
          const bbox = elementBBox(el, state);
          if (bbox && intersectsMarquee(bbox, marqueeBbox)) {
            matchedIds.push(el.id);
          }
        }
        if (matchedIds.length === 1) {
          setSelection({ kind: 'element', elementId: matchedIds[0] });
        } else if (matchedIds.length > 1) {
          setSelection({ kind: 'elements', elementIds: matchedIds });
        } else {
          setSelection({ kind: 'none' });
        }
      }
    }
    render();
  }
  dragState = null;
  rotateState = null;
}

function applyMove(
  baseEl: AnimationElement,
  state: Record<string, unknown>,
  x: number,
  y: number,
  polygonOriginal?: string,
): void {
  if (baseEl.type === 'rect' || baseEl.type === 'image' || baseEl.type === 'text') {
    setElementValueAtTime(baseEl.id, { x, y });
  } else if (baseEl.type === 'circle') {
    setElementValueAtTime(baseEl.id, { cx: x, cy: y });
  } else if ((baseEl.type === 'line' || baseEl.type === 'arrow') && typeof state.x1 === 'number' && typeof state.y1 === 'number' && typeof state.x2 === 'number' && typeof state.y2 === 'number') {
    const dx = x - (state.x1 as number);
    const dy = y - (state.y1 as number);
    setElementValueAtTime(baseEl.id, {
      x1: x,
      y1: y,
      x2: (state.x2 as number) + dx,
      y2: (state.y2 as number) + dy,
    });
  } else if (baseEl.type === 'path') {
    setElementValueAtTime(baseEl.id, { x, y });
  } else if (baseEl.type === 'polygon') {
    const orig = polygonOriginal ?? dragState?.originalPolygonPoints;
    if (!orig) return;
    const startFirst = firstPolygonPoint(orig);
    if (!startFirst) return;
    const dx = x - startFirst.x;
    const dy = y - startFirst.y;
    const newPoints = shiftPolygonPoints(orig, dx, dy);
    setElementValueAtTime(baseEl.id, { points: newPoints });
  } else if (baseEl.type === 'group') {
    const dx = x - baseEl.x;
    const dy = y - baseEl.y;
    moveGroupBy(baseEl.id, dx, dy);
  }
}

function readPositionAnchor(
  baseEl: AnimationElement,
  state: Record<string, unknown>,
): { x: number; y: number } | null {
  if (baseEl.type === 'rect' || baseEl.type === 'image' || baseEl.type === 'text') {
    return { x: state.x as number, y: state.y as number };
  }
  if (baseEl.type === 'circle') return { x: state.cx as number, y: state.cy as number };
  if ((baseEl.type === 'line' || baseEl.type === 'arrow') && typeof state.x1 === 'number') {
    return { x: state.x1 as number, y: state.y1 as number };
  }
  if (baseEl.type === 'path') return { x: (state.x as number) ?? 0, y: (state.y as number) ?? 0 };
  if (baseEl.type === 'polygon') {
    const first = firstPolygonPoint(String(state.points ?? ''));
    return first;
  }
  if (baseEl.type === 'group') {
    return { x: baseEl.x, y: baseEl.y };
  }
  return null;
}

/** Compute the bounding box of an element (no padding) for marquee intersection. */
function elementBBox(
  baseEl: AnimationElement,
  state: Record<string, unknown>,
): { x: number; y: number; w: number; h: number } | null {
  if (baseEl.type === 'rect' || baseEl.type === 'image') {
    return { x: state.x as number, y: state.y as number, w: state.width as number, h: state.height as number };
  }
  if (baseEl.type === 'circle') {
    const r = state.r as number;
    return { x: (state.cx as number) - r, y: (state.cy as number) - r, w: r * 2, h: r * 2 };
  }
  if (baseEl.type === 'text') {
    const bbox = textBBoxOnCanvas(canvasEl, baseEl.id);
    if (bbox) return bbox;
    // fallback: approximate
    return { x: state.x as number, y: state.y as number, w: 100, h: (state.fontSize as number) ?? 16 };
  }
  if (baseEl.type === 'line' || baseEl.type === 'arrow') {
    const coords =
      baseEl.type === 'line'
        ? resolveLineCoords(state as unknown as LineElement, getCurrentSnapshot(), new Map())
        : resolveArrowCoords(state as unknown as ArrowElement, getCurrentSnapshot(), new Map());
    if (!coords) return null;
    return {
      x: Math.min(coords.x1, coords.x2),
      y: Math.min(coords.y1, coords.y2),
      w: Math.abs(coords.x2 - coords.x1),
      h: Math.abs(coords.y2 - coords.y1),
    };
  }
  if (baseEl.type === 'polygon') {
    return polygonBoundingBox(String(state.points ?? ''));
  }
  if (baseEl.type === 'path') {
    return pathBBoxOnCanvas(canvasEl, baseEl.id);
  }
  return null;
}

/**
 * Test whether an element bounding box intersects a marquee rectangle.
 * Both arguments use `{ x, y, w, h }` format (top-left corner + dimensions).
 *
 * Uses strict AABB overlap (positive intersection area). Edges that only
 * touch (e.g. element.right === marquee.left) are NOT considered intersecting
 * , this matches the standard mathematical definition and the property test
 * `correctly identifies AABB intersection` in `multi-select.test.ts`.
 */
export function intersectsMarquee(
  elBbox: { x: number; y: number; w: number; h: number },
  marquee: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    elBbox.x < marquee.x + marquee.w &&
    elBbox.x + elBbox.w > marquee.x &&
    elBbox.y < marquee.y + marquee.h &&
    elBbox.y + elBbox.h > marquee.y
  );
}

function handleResizeMove(e: MouseEvent): void {
  if (!resizeState || !canvasEl) return;
  const def = getDef();
  if (!def) return;
  const baseEl = def.elements.find((x) => x.id === resizeState!.elementId);
  if (!baseEl) return;
  const rect = canvasEl.getBoundingClientRect();
  const sx = def.canvas.width / rect.width;
  const sy = def.canvas.height / rect.height;
  const dx = (e.clientX - resizeState.startMouseX) * sx;
  const dy = (e.clientY - resizeState.startMouseY) * sy;
  const h = resizeState.handle;
  const uniform = e.shiftKey;

  if (baseEl.type === 'rect' || baseEl.type === 'image') {
    let newX = resizeState.startX;
    let newY = resizeState.startY;
    let newW = resizeState.startW;
    let newH = resizeState.startH;
    if (h.includes('w')) { newX = resizeState.startX + dx; newW = resizeState.startW - dx; }
    if (h.includes('e')) { newW = resizeState.startW + dx; }
    if (h.includes('n')) { newY = resizeState.startY + dy; newH = resizeState.startH - dy; }
    if (h.includes('s')) { newH = resizeState.startH + dy; }
    if (uniform && (h === 'nw' || h === 'ne' || h === 'se' || h === 'sw')) {
      const aspect = resizeState.aspect;
      const fromW = Math.abs(newW);
      const fromH = Math.abs(newH);
      if (fromW / aspect > fromH) {
        const targetH = Math.max(1, Math.round(fromW / aspect));
        if (h.includes('n')) newY = resizeState.startY + resizeState.startH - targetH;
        newH = targetH;
      } else {
        const targetW = Math.max(1, Math.round(fromH * aspect));
        if (h.includes('w')) newX = resizeState.startX + resizeState.startW - targetW;
        newW = targetW;
      }
    }
    if (newW < 0) { newX = newX + newW; newW = -newW; }
    if (newH < 0) { newY = newY + newH; newH = -newH; }
    newW = Math.max(2, Math.round(newW));
    newH = Math.max(2, Math.round(newH));
    setElementValueAtTime(baseEl.id, {
      x: Math.round(newX), y: Math.round(newY), width: newW, height: newH,
    });
    return;
  }

  if (baseEl.type === 'circle') {
    const cx = resizeState.startCx ?? 0;
    const cy = resizeState.startCy ?? 0;
    const r0 = resizeState.startR ?? 1;
    let r1: number;
    if (h === 'e') r1 = Math.max(2, r0 + dx);
    else if (h === 'w') r1 = Math.max(2, r0 - dx);
    else if (h === 's') r1 = Math.max(2, r0 + dy);
    else if (h === 'n') r1 = Math.max(2, r0 - dy);
    else {
      const ddx = (h.includes('e') ? dx : -dx);
      const ddy = (h.includes('s') ? dy : -dy);
      const dd = uniform ? Math.max(ddx, ddy) : (ddx + ddy) / 2;
      r1 = Math.max(2, r0 + dd);
    }
    setElementValueAtTime(baseEl.id, { r: Math.round(r1), cx, cy });
    return;
  }

  if (baseEl.type === 'text') {
    const startFs = resizeState.startFontSize ?? 16;
    const startH0 = Math.max(1, resizeState.startH);
    const newH = h.includes('n') ? Math.max(1, startH0 - dy) : Math.max(1, startH0 + dy);
    const ratio = newH / startH0;
    const newFontSize = Math.max(6, Math.round(startFs * ratio));
    setElementValueAtTime(baseEl.id, { fontSize: newFontSize });
    return;
  }
}

function render(): void {
  if (!canvasEl) return;
  const def = getDef();
  if (!def) {
    canvasEl.innerHTML = '';
    canvasEl.removeAttribute('viewBox');
    canvasEl.style.width = '0';
    canvasEl.style.height = '0';
    return;
  }
  canvasEl.setAttribute('viewBox', `0 0 ${def.canvas.width} ${def.canvas.height}`);
  canvasEl.style.width = (def.canvas.width * canvasZoom) + 'px';
  canvasEl.style.height = (def.canvas.height * canvasZoom) + 'px';
  canvasEl.style.backgroundColor = def.canvas.background;

  canvasEl.innerHTML = `<defs>${HEAD_MARKER_DEFS}</defs>`;

  const snap = getCurrentSnapshot();
  const elementsById = new Map<string, AnimationElement>();
  for (const el of def.elements) elementsById.set(el.id, el);

  for (const el of def.elements) {
    const state = snap.get(el.id);
    if (!state) continue;
    const g = renderElement(el, state, snap, elementsById);
    if (g) {
      if (!state.visible) g.setAttribute('opacity', '0.25');
      canvasEl.appendChild(g);
    }
  }

  const selection = getSelection();
  if (selection.kind === 'element') {
    const selEl = elementsById.get(selection.elementId);
    if (selEl && isGroup(selEl)) {
      const groupOutline = renderGroupOutline(selection.elementId);
      if (groupOutline) canvasEl.appendChild(groupOutline);
    } else {
      const outline = renderSelectionOutline(canvasEl, selection.elementId, snap, elementsById);
      if (outline) canvasEl.appendChild(outline);
      const handle = renderRotationHandle(canvasEl, selection.elementId, snap, elementsById);
      if (handle) canvasEl.appendChild(handle);
      const endpoints = renderLineEndpointHandles(selection.elementId, snap, elementsById);
      if (endpoints) canvasEl.appendChild(endpoints);
      const vertices = renderPolygonVertexHandles(selection.elementId, snap, elementsById);
      if (vertices) canvasEl.appendChild(vertices);
      const resize = renderResizeHandles(canvasEl, selection.elementId, snap, elementsById);
      if (resize) canvasEl.appendChild(resize);
    }
  } else if (selection.kind === 'elements') {
    for (const elId of selection.elementIds) {
      const outline = renderSelectionOutline(canvasEl, elId, snap, elementsById);
      if (outline) canvasEl.appendChild(outline);
    }
  }

  if (endpointDragState) {
    const guides = renderSnapTargets(
      endpointDragState.elementId,
      snap,
      elementsById,
      endpointDragState.snapTarget,
    );
    if (guides) canvasEl.appendChild(guides);
  }

  if (hoveredElementId && (!connectState || hoveredElementId !== connectState.fromId)) {
    const anchors = renderAnchorDots(hoveredElementId, snap, elementsById);
    if (anchors) canvasEl.appendChild(anchors);
  }
  if (connectState && connectState.fromId !== hoveredElementId) {
    const anchors = renderAnchorDots(connectState.fromId, snap, elementsById);
    if (anchors) canvasEl.appendChild(anchors);
  }

  if (connectState) {
    const tempLine = document.createElementNS(SVG_NS, 'line');
    tempLine.setAttribute('x1', String(connectState.startX));
    tempLine.setAttribute('y1', String(connectState.startY));
    tempLine.setAttribute('x2', String(connectState.currentX));
    tempLine.setAttribute('y2', String(connectState.currentY));
    tempLine.setAttribute('stroke', '#6366f1');
    tempLine.setAttribute('stroke-width', '2');
    tempLine.setAttribute('stroke-dasharray', '5 3');
    tempLine.setAttribute('marker-end', 'url(#studio-arrow)');
    tempLine.style.pointerEvents = 'none';
    canvasEl.appendChild(tempLine);
  }

  if (marqueeState) {
    const mx = Math.min(marqueeState.startX, marqueeState.currentX);
    const my = Math.min(marqueeState.startY, marqueeState.currentY);
    const mw = Math.abs(marqueeState.currentX - marqueeState.startX);
    const mh = Math.abs(marqueeState.currentY - marqueeState.startY);
    if (mw > 0 || mh > 0) {
      const marqueeRect = document.createElementNS(SVG_NS, 'rect');
      marqueeRect.setAttribute('x', String(mx));
      marqueeRect.setAttribute('y', String(my));
      marqueeRect.setAttribute('width', String(mw));
      marqueeRect.setAttribute('height', String(mh));
      marqueeRect.setAttribute('fill', 'rgba(99, 102, 241, 0.08)');
      marqueeRect.setAttribute('stroke', '#6366f1');
      marqueeRect.setAttribute('stroke-width', '1');
      marqueeRect.setAttribute('stroke-dasharray', '4 3');
      marqueeRect.style.pointerEvents = 'none';
      canvasEl.appendChild(marqueeRect);
    }
  }
}

function findSnapTarget(
  x: number,
  y: number,
  excludeElementId: string,
): { elementId: string; anchor: Anchor; x: number; y: number } | null {
  const def = getDef();
  if (!def) return null;
  const snap = getCurrentSnapshot();

  // Collect anchor points from all elements except the arrow being dragged
  const allAnchors = [];
  for (const baseEl of def.elements) {
    if (baseEl.id === excludeElementId) continue;
    // Skip other lines/arrows, only snap to shapes
    if (baseEl.type === 'line' || baseEl.type === 'arrow') continue;
    const state = snap.get(baseEl.id);
    if (!state || !state.visible) continue;
    const points = getAnchorPoints(baseEl, state as Record<string, unknown>);
    allAnchors.push(...points);
  }

  const nearest = findNearestAnchor({ x, y }, allAnchors, SNAP_RADIUS);
  if (!nearest) return null;
  return { elementId: nearest.elementId, anchor: nearest.anchor, x: nearest.x, y: nearest.y };
}

function renderGroupOutline(groupId: string): SVGElement | null {
  const box = groupBbox(groupId);
  if (!box) return null;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('data-elem-id', groupId);
  const pad = 6;
  const x = box.x - pad;
  const y = box.y - pad;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  const thickness = 8;
  g.innerHTML = `
    <rect x="${x}" y="${y}" width="${w}" height="${h}"
      fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 4" rx="4" pointer-events="none" />
    <rect x="${x - thickness}" y="${y - thickness}" width="${w + thickness * 2}" height="${thickness * 2}"
      fill="rgba(0,0,0,0.0001)" style="cursor: move" pointer-events="all" />
    <rect x="${x - thickness}" y="${y + h - thickness}" width="${w + thickness * 2}" height="${thickness * 2}"
      fill="rgba(0,0,0,0.0001)" style="cursor: move" pointer-events="all" />
    <rect x="${x - thickness}" y="${y}" width="${thickness * 2}" height="${h}"
      fill="rgba(0,0,0,0.0001)" style="cursor: move" pointer-events="all" />
    <rect x="${x + w - thickness}" y="${y}" width="${thickness * 2}" height="${h}"
      fill="rgba(0,0,0,0.0001)" style="cursor: move" pointer-events="all" />
  `;
  return g;
}

function makeG(elementId: string, rotation: number, cx: number, cy: number): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('data-elem-id', elementId);
  g.classList.add('element-handle');
  if (rotation) g.setAttribute('transform', `rotate(${rotation} ${cx} ${cy})`);
  return g;
}

function renderElement(
  baseEl: AnimationElement,
  state: Record<string, unknown>,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGGElement | null {
  const rotation = (state.rotation as number) || 0;
  if (baseEl.type === 'rect') {
    const r = state as unknown as RectElement;
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const g = makeG(baseEl.id, rotation, cx, cy);
    g.innerHTML = `
      <rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.cornerRadius}"
        fill="${r.fill}" stroke="${r.stroke}" stroke-width="${r.strokeWidth}" />
      ${r.label ? `<text x="${cx}" y="${cy + 5}" text-anchor="middle"
        font-size="${r.labelSize}" font-weight="600" fill="${r.labelColor}">${escapeXml(r.label)}</text>` : ''}
      ${r.subtitle ? `<text x="${cx}" y="${cy + r.labelSize + 8}"
        text-anchor="middle" font-size="10" fill="${r.labelColor}" opacity="0.7">${escapeXml(r.subtitle)}</text>` : ''}
    `;
    return g;
  }
  if (baseEl.type === 'circle') {
    const c = state as unknown as CircleElement;
    const g = makeG(baseEl.id, rotation, c.cx, c.cy);
    g.innerHTML = `
      <circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.fill}" stroke="${c.stroke}"
        stroke-width="${c.strokeWidth}" />
      ${c.label ? `<text x="${c.cx}" y="${c.cy + 5}" text-anchor="middle"
        font-size="${c.labelSize}" font-weight="600" fill="${c.labelColor}">${escapeXml(c.label)}</text>` : ''}
    `;
    return g;
  }
  if (baseEl.type === 'line') {
    const l = state as unknown as LineElement;
    const coords = resolveLineCoords(l, snap, byId);
    if (!coords) return null;
    const g = makeG(baseEl.id, 0, 0, 0);
    g.style.color = l.stroke;
    const dash = l.strokeDasharray ? `stroke-dasharray="${l.strokeDasharray}"` : '';
    const mStart = markerUrlFor(l.headStart, 'start');
    const mEnd = markerUrlFor(l.headEnd, 'end');
    const mAttr = `${mStart ? `marker-start="${mStart}"` : ''} ${mEnd ? `marker-end="${mEnd}"` : ''}`;
    g.innerHTML = `<line x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}"
      stroke="currentColor" stroke-width="${l.strokeWidth}" ${dash} ${mAttr} />`;
    return g;
  }
  if (baseEl.type === 'arrow') {
    const a = state as unknown as ArrowElement;
    const coords = resolveArrowCoords(a, snap, byId);
    if (!coords) return null;
    const g = makeG(baseEl.id, 0, 0, 0);
    g.style.color = a.stroke;
    const dash = a.strokeDasharray ? `stroke-dasharray="${a.strokeDasharray}"` : '';
    const midX = (coords.x1 + coords.x2) / 2;
    const midY = (coords.y1 + coords.y2) / 2;
    const isCurved = (a.curvature || 0) !== 0;
    const mStart = markerUrlFor(a.headStart ?? 'none', 'start');
    const mEnd = markerUrlFor(a.headEnd ?? 'arrow', 'end');
    const mAttr = `${mStart ? `marker-start="${mStart}"` : ''} ${mEnd ? `marker-end="${mEnd}"` : ''}`;
    let pathHtml: string;
    if (isCurved) {
      const dx = coords.x2 - coords.x1;
      const dy = coords.y2 - coords.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const cpx = midX + nx * (a.curvature ?? 0);
      const cpy = midY + ny * (a.curvature ?? 0);
      pathHtml = `<path d="M ${coords.x1} ${coords.y1} Q ${cpx} ${cpy} ${coords.x2} ${coords.y2}" fill="none" stroke="currentColor" stroke-width="${a.strokeWidth}" ${dash} ${mAttr} />`;
    } else {
      pathHtml = `<line x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}" stroke="currentColor" stroke-width="${a.strokeWidth}" ${dash} ${mAttr} />`;
    }
    g.innerHTML = `
      ${pathHtml}
      ${a.label ? `<g>
        <rect x="${midX - 80}" y="${midY - 11}" width="160" height="22" rx="4" fill="white" stroke="currentColor" stroke-opacity="0.4"/>
        <text x="${midX}" y="${midY + 4}" text-anchor="middle" font-size="12" font-family="ui-monospace, monospace" fill="${a.labelColor}">${escapeXml(a.label)}</text>
      </g>` : ''}
    `;
    return g;
  }
  if (baseEl.type === 'text') {
    const t = state as unknown as TextElement;
    const g = makeG(baseEl.id, rotation, t.x, t.y);
    g.innerHTML = `<text x="${t.x}" y="${t.y}" font-size="${t.fontSize}" font-weight="${t.fontWeight}"
      fill="${t.color}" text-anchor="${t.textAnchor}">${escapeXml(t.content)}</text>`;
    return g;
  }
  if (baseEl.type === 'image') {
    const i = state as unknown as ImageElement;
    const cx = i.x + i.width / 2;
    const cy = i.y + i.height / 2;
    const g = makeG(baseEl.id, rotation, cx, cy);
    g.innerHTML = `<image href="${escapeXml(i.src)}" x="${i.x}" y="${i.y}" width="${i.width}"
      height="${i.height}" preserveAspectRatio="${i.preserveAspectRatio}" opacity="${i.opacity}" />`;
    return g;
  }
  if (baseEl.type === 'path') {
    const p = state as unknown as import('@/entities/animation/engine/schema').PathElement;
    const g = makeG(baseEl.id, rotation, p.x, p.y);
    const dash = p.strokeDasharray ? `stroke-dasharray="${p.strokeDasharray}"` : '';
    const xform = (p.x || p.y) ? `transform="translate(${p.x} ${p.y})"` : '';
    g.innerHTML = `<path d="${escapeXml(p.d)}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" ${dash} opacity="${p.opacity}" ${xform} pointer-events="all" />`;
    return g;
  }
  if (baseEl.type === 'polygon') {
    const pg = state as unknown as import('@/entities/animation/engine/schema').PolygonElement;
    const g = makeG(baseEl.id, rotation, 0, 0);
    g.innerHTML = `<polygon points="${escapeXml(pg.points)}" fill="${pg.fill}" stroke="${pg.stroke}" stroke-width="${pg.strokeWidth}" opacity="${pg.opacity}" pointer-events="all" />`;
    return g;
  }
  return null;
}

import { showPreview as _showPreview, hidePreview as _hidePreview } from './canvas-preview';
export function showPreview(def: import('@/entities/animation/engine/schema').AnimationDef): void {
  _showPreview(canvasEl, def);
}
export function hidePreview(): void {
  _hidePreview(canvasEl);
}
