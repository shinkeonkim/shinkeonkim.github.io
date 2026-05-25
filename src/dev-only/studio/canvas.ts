import type {
  AnimationElement,
  ArrowElement,
  CircleElement,
  ImageElement,
  LineElement,
  RectElement,
  SnapshotMap,
  TextElement,
} from '../../animations/schema';
import {
  getDef,
  getSelection,
  getCurrentSnapshot,
  setSelection,
  setElementKeyframe,
  setElementBase,
  addElement,
  uniqueElementId,
  subscribe,
} from './state';
import type { Anchor } from '../../animations/schema';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface DragState {
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startElemX: number;
  startElemY: number;
  originalPolygonPoints?: string;
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
  fromAnchor: import('../../animations/schema').Anchor;
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

const SNAP_RADIUS = 28;

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

let dragState: DragState | null = null;
let rotateState: RotateState | null = null;
let connectState: ConnectState | null = null;
let endpointDragState: EndpointDragState | null = null;
let vertexDragState: VertexDragState | null = null;
let canvasEl: SVGSVGElement | null = null;
let previewRoot: HTMLDivElement | null = null;
let hoveredElementId: string | null = null;

export function initCanvas(root: SVGSVGElement): void {
  canvasEl = root;
  root.addEventListener('click', onCanvasClick);
  root.addEventListener('mousedown', onMouseDown);
  root.addEventListener('mouseover', onMouseOver);
  root.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  subscribe(render);
  render();
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
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
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
  const target = e.target as Element | null;
  if (target?.closest('[data-rotate-handle], [data-anchor-handle]')) return;
  const id = findElementId(e.target);
  if (id) setSelection({ kind: 'element', elementId: id });
  else if (e.target === canvasEl) setSelection({ kind: 'none' });
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  const target = e.target as Element | null;
  const def = getDef();
  if (!def) return;

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
    };
    setSelection({ kind: 'element', elementId: id });
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

  const id = findElementId(e.target);
  if (!id) return;
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
  };
  setSelection({ kind: 'element', elementId: id });
}

function onMouseMove(e: MouseEvent): void {
  if (vertexDragState) {
    const pt = svgPoint(e.clientX, e.clientY);
    if (!pt) return;
    const pts = vertexDragState.originalPoints.trim().split(/\s+/);
    if (vertexDragState.vertexIndex < pts.length) {
      pts[vertexDragState.vertexIndex] = `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      setElementKeyframe(vertexDragState.elementId, { points: pts.join(' ') });
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
          setElementBase(baseEl.id, {
            fromId: endpointDragState.snapTarget.elementId,
            fromAnchor: endpointDragState.snapTarget.anchor,
            x1: undefined, y1: undefined,
          });
        } else {
          setElementBase(baseEl.id, {
            toId: endpointDragState.snapTarget.elementId,
            toAnchor: endpointDragState.snapTarget.anchor,
            x2: undefined, y2: undefined,
          });
        }
      } else {
        if (endpointDragState.end === 'start') {
          setElementBase(baseEl.id, { fromId: undefined, fromAnchor: undefined, x1: finalX, y1: finalY });
        } else {
          setElementBase(baseEl.id, { toId: undefined, toAnchor: undefined, x2: finalX, y2: finalY });
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
    setElementKeyframe(rotateState.elementId, {
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
}

function onMouseUp(e: MouseEvent): void {
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
          rotation: 0,
          fromId: connectState.fromId,
          toId: elemId,
          fromAnchor: connectState.fromAnchor,
          toAnchor,
          stroke: '#6366f1',
          strokeWidth: 2,
          curvature: 0,
          labelColor: '#0b0b0f',
          headStart: 'none',
          headEnd: 'arrow',
        });
      }
    }
    connectState = null;
    render();
  }
  dragState = null;
  rotateState = null;
}

function centerOfElement(
  baseEl: import('../../animations/schema').AnimationElement,
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
  return null;
}

function applyMove(
  baseEl: AnimationElement,
  state: Record<string, unknown>,
  x: number,
  y: number,
): void {
  if (baseEl.type === 'rect' || baseEl.type === 'image' || baseEl.type === 'text') {
    setElementKeyframe(baseEl.id, { x, y });
  } else if (baseEl.type === 'circle') {
    setElementKeyframe(baseEl.id, { cx: x, cy: y });
  } else if ((baseEl.type === 'line' || baseEl.type === 'arrow') && typeof state.x1 === 'number' && typeof state.y1 === 'number' && typeof state.x2 === 'number' && typeof state.y2 === 'number') {
    const dx = x - (state.x1 as number);
    const dy = y - (state.y1 as number);
    setElementKeyframe(baseEl.id, {
      x1: x,
      y1: y,
      x2: (state.x2 as number) + dx,
      y2: (state.y2 as number) + dy,
    });
  } else if (baseEl.type === 'path') {
    setElementKeyframe(baseEl.id, { x, y });
  } else if (baseEl.type === 'polygon' && dragState?.originalPolygonPoints) {
    const startFirst = firstPolygonPoint(dragState.originalPolygonPoints);
    if (!startFirst) return;
    const dx = x - startFirst.x;
    const dy = y - startFirst.y;
    const newPoints = shiftPolygonPoints(dragState.originalPolygonPoints, dx, dy);
    setElementKeyframe(baseEl.id, { points: newPoints });
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
  return null;
}

function firstPolygonPoint(points: string): { x: number; y: number } | null {
  const first = points.trim().split(/\s+/)[0];
  if (!first) return null;
  const [x, y] = first.split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function shiftPolygonPoints(points: string, dx: number, dy: number): string {
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

function polygonBoundingBox(points: string): { x: number; y: number; w: number; h: number } | null {
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

function pathBBoxOnCanvas(elementId: string): { x: number; y: number; w: number; h: number } | null {
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

function cssAttrEscape(s: string): string {
  return s.replace(/["\\]/g, (m) => `\\${m}`);
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
  canvasEl.style.width = def.canvas.width + 'px';
  canvasEl.style.height = def.canvas.height + 'px';
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
    const outline = renderSelectionOutline(selection.elementId, snap, elementsById);
    if (outline) canvasEl.appendChild(outline);
    const handle = renderRotationHandle(selection.elementId, snap, elementsById);
    if (handle) canvasEl.appendChild(handle);
    const endpoints = renderLineEndpointHandles(selection.elementId, snap, elementsById);
    if (endpoints) canvasEl.appendChild(endpoints);
    const vertices = renderPolygonVertexHandles(selection.elementId, snap, elementsById);
    if (vertices) canvasEl.appendChild(vertices);
  }

  if (endpointDragState) {
    const guides = renderSnapTargets(endpointDragState.elementId, snap, elementsById);
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
}

function renderRotationHandle(
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
  if (baseEl.type === 'rect' || baseEl.type === 'image') topY = (state.y as number) - 24;
  else if (baseEl.type === 'circle') topY = (state.cy as number) - (state.r as number) - 24;
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

function renderAnchorDots(
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

function renderLineEndpointHandles(
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  if (baseEl.type !== 'line' && baseEl.type !== 'arrow') return null;
  let coords: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (baseEl.type === 'line') {
    coords = resolveLineCoords(state as unknown as LineElement, snap, byId);
  } else {
    coords = resolveArrowCoords(state as unknown as ArrowElement, snap, byId);
  }
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

function renderPolygonVertexHandles(
  elId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const baseEl = byId.get(elId);
  const state = snap.get(elId);
  if (!baseEl || !state) return null;
  if (baseEl.type !== 'polygon') return null;
  const points = String(state.points ?? '').trim().split(/\s+/);
  const g = document.createElementNS(SVG_NS, 'g');
  let html = '';
  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i].split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    html += `<circle cx="${x}" cy="${y}" r="6" fill="white" stroke="var(--color-accent)" stroke-width="2"
      data-vertex-handle data-elem-id="${escapeXml(elId)}" data-vertex-index="${i}" style="cursor: grab" />`;
  }
  g.innerHTML = html;
  return g;
}

function renderSnapTargets(
  draggingElementId: string,
  snap: SnapshotMap,
  byId: Map<string, AnimationElement>,
): SVGElement | null {
  const g = document.createElementNS(SVG_NS, 'g');
  let html = '';
  for (const baseEl of byId.values()) {
    if (baseEl.id === draggingElementId) continue;
    if (baseEl.type !== 'rect' && baseEl.type !== 'circle' && baseEl.type !== 'image') continue;
    const state = snap.get(baseEl.id);
    if (!state || !state.visible) continue;
    const points = anchorPointsOf(baseEl, state);
    for (const p of points) {
      const isActive =
        endpointDragState?.snapTarget?.elementId === baseEl.id &&
        endpointDragState?.snapTarget?.anchor === p.anchor;
      const fill = isActive ? 'var(--color-accent)' : 'white';
      const stroke = isActive ? 'white' : 'var(--color-accent)';
      const r = isActive ? 8 : 5;
      html += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" opacity="${isActive ? 1 : 0.7}" pointer-events="none" />`;
    }
  }
  g.innerHTML = html;
  return g;
}

function findSnapTarget(
  x: number,
  y: number,
  excludeElementId: string,
): { elementId: string; anchor: Anchor; x: number; y: number } | null {
  const def = getDef();
  if (!def) return null;
  const snap = getCurrentSnapshot();
  let best: { elementId: string; anchor: Anchor; x: number; y: number; dist: number } | null = null;
  for (const baseEl of def.elements) {
    if (baseEl.id === excludeElementId) continue;
    if (baseEl.type !== 'rect' && baseEl.type !== 'circle' && baseEl.type !== 'image') continue;
    const state = snap.get(baseEl.id);
    if (!state || !state.visible) continue;
    const points = anchorPointsOf(baseEl, state);
    for (const p of points) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d > SNAP_RADIUS) continue;
      if (!best || d < best.dist) {
        best = { elementId: baseEl.id, anchor: p.anchor, x: p.x, y: p.y, dist: d };
      }
    }
  }
  if (!best) return null;
  return { elementId: best.elementId, anchor: best.anchor, x: best.x, y: best.y };
}

function anchorPointsOf(
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

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    const p = state as unknown as import('../../animations/schema').PathElement;
    const g = makeG(baseEl.id, rotation, p.x, p.y);
    const dash = p.strokeDasharray ? `stroke-dasharray="${p.strokeDasharray}"` : '';
    const xform = (p.x || p.y) ? `transform="translate(${p.x} ${p.y})"` : '';
    g.innerHTML = `<path d="${escapeXml(p.d)}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" ${dash} opacity="${p.opacity}" ${xform} pointer-events="all" />`;
    return g;
  }
  if (baseEl.type === 'polygon') {
    const pg = state as unknown as import('../../animations/schema').PolygonElement;
    const g = makeG(baseEl.id, rotation, 0, 0);
    g.innerHTML = `<polygon points="${escapeXml(pg.points)}" fill="${pg.fill}" stroke="${pg.stroke}" stroke-width="${pg.strokeWidth}" opacity="${pg.opacity}" pointer-events="all" />`;
    return g;
  }
  return null;
}

function resolveArrowCoords(
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

function resolveLineCoords(
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

function pickAutoAnchorTowardPoint(
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

function anchorPointOf(
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

function pickAutoAnchorPair(
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

function renderSelectionOutline(
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
    box = { x: (state.x as number) - 4, y: (state.y as number) - 20, w: 100, h: 28 };
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
    const bbox = pathBBoxOnCanvas(elId);
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

export function showPreview(def: import('../../animations/schema').AnimationDef): void {
  if (!canvasEl) return;
  const parent = canvasEl.parentElement;
  if (!parent) return;
  hidePreview();
  previewRoot = document.createElement('div');
  const bg = def.canvas.background && def.canvas.background !== 'transparent' ? def.canvas.background : 'transparent';
  previewRoot.style.cssText = `position:absolute;left:0;top:0;width:${def.canvas.width}px;height:${def.canvas.height}px;background:${bg};z-index:2;overflow:hidden;`;
  parent.style.position = 'relative';
  parent.appendChild(previewRoot);
  void mountReactPreview(previewRoot, def);
}

export function hidePreview(): void {
  if (previewRoot) {
    previewRoot.remove();
    previewRoot = null;
  }
}

async function mountReactPreview(host: HTMLElement, def: import('../../animations/schema').AnimationDef): Promise<void> {
  const [{ createRoot }, { createElement }, EngineMod] = await Promise.all([
    import('react-dom/client'),
    import('react'),
    import('../../animations/engine'),
  ]);
  const Engine = EngineMod.default;
  const root = createRoot(host);
  root.render(createElement(Engine, { def, playing: true, speedMultiplier: 1 }));
}
