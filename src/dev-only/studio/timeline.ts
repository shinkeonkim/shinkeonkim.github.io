import {
  addChapter,
  getCurrentTime,
  getDef,
  getSelection,
  setCurrentTime,
  setSelection,
  subscribe,
  uniqueChapterId,
  updateAppearance,
  updateChapter,
} from './state';
import type { AnimationElement } from '../../animations/schema';
import { friendlyElementLabel } from './element-list';

let tracksEl: HTMLElement | null = null;
let elTracksEl: HTMLElement | null = null;
let addBtn: HTMLButtonElement | null = null;
let scrollSyncSuppress = false;
let dragTooltipEl: HTMLDivElement | null = null;

let pxPerMs = 0.15;
const GUTTER_PX = 140;
const PX_PER_MS_KEY = 'studio.timeline.pxPerMs';

try {
  const saved = Number(localStorage.getItem(PX_PER_MS_KEY));
  if (Number.isFinite(saved) && saved > 0.02 && saved < 2) pxPerMs = saved;
} catch {
  void 0;
}
type DragMode =
  | { kind: 'time' }
  | { kind: 'chapter'; id: string }
  | { kind: 'appearance'; elementId: string; apIdx: number; edge: 'start' | 'end' | 'move'; startMouseX: number; startApStart: number; startApEnd: number };
let dragMode: DragMode | null = null;

export function initTimeline(
  tracksRoot: HTMLElement,
  addChapterBtn: HTMLButtonElement | null,
  elementTracks: HTMLElement,
): void {
  tracksEl = tracksRoot;
  elTracksEl = elementTracks;
  addBtn = addChapterBtn;
  subscribe(render);
  tracksRoot.addEventListener('click', onTracksClick);
  tracksRoot.addEventListener('mousedown', onMouseDown);
  elementTracks.addEventListener('click', onElTracksClick);
  elementTracks.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  addBtn?.addEventListener('click', () => {
    const id = uniqueChapterId();
    const def = getDef();
    const lastTime = def
      ? def.chapters.reduce((max, c) => (c.time > max ? c.time : max), -1)
      : -1;
    const newTime = lastTime < 0
      ? getCurrentTime()
      : Math.max(getCurrentTime(), lastTime + 500);
    addChapter({ id, time: newTime, label: `Chapter ${id.split('-')[1]}`, subtitle: '' });
    setSelection({ kind: 'chapter', chapterId: id });
  });
  const headerWrap = tracksRoot.parentElement;
  const elementWrap = elementTracks.parentElement;
  if (headerWrap && elementWrap) {
    headerWrap.addEventListener('scroll', () => mirrorScroll(headerWrap, elementWrap), { passive: true });
    elementWrap.addEventListener('scroll', () => mirrorScroll(elementWrap, headerWrap), { passive: true });
    const onZoomWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const wrap = e.currentTarget as HTMLElement;
      const wrapRect = wrap.getBoundingClientRect();
      const cursorBodyX = e.clientX - wrapRect.left - GUTTER_PX + wrap.scrollLeft;
      const oldPx = pxPerMs;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      pxPerMs = Math.max(0.025, Math.min(1.5, oldPx * factor));
      try { localStorage.setItem(PX_PER_MS_KEY, String(pxPerMs)); } catch { void 0; }
      const ratio = pxPerMs / oldPx;
      render();
      const newScrollLeft = (cursorBodyX * ratio) - (e.clientX - wrapRect.left - GUTTER_PX);
      wrap.scrollLeft = Math.max(0, newScrollLeft);
    };
    headerWrap.addEventListener('wheel', onZoomWheel, { passive: false });
    elementWrap.addEventListener('wheel', onZoomWheel, { passive: false });
  }
  render();
}

function mirrorScroll(source: HTMLElement, target: HTMLElement): void {
  if (scrollSyncSuppress) return;
  scrollSyncSuppress = true;
  target.scrollLeft = source.scrollLeft;
  requestAnimationFrame(() => { scrollSyncSuppress = false; });
}

function showDragTooltip(clientX: number, clientY: number, text: string): void {
  if (!dragTooltipEl) {
    dragTooltipEl = document.createElement('div');
    dragTooltipEl.className = 'studio-tl-drag-tooltip';
    document.body.appendChild(dragTooltipEl);
  }
  dragTooltipEl.textContent = text;
  dragTooltipEl.style.left = `${clientX + 14}px`;
  dragTooltipEl.style.top = `${clientY - 28}px`;
  dragTooltipEl.style.display = 'block';
}

function hideDragTooltip(): void {
  if (dragTooltipEl) dragTooltipEl.style.display = 'none';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeToPx(ms: number): number {
  return ms * pxPerMs;
}

function pxToTime(px: number): number {
  return Math.max(0, Math.round(px / pxPerMs));
}

function render(): void {
  if (!tracksEl || !elTracksEl) return;
  const def = getDef();
  if (!def) {
    tracksEl.innerHTML = '<p class="studio-tl-empty">애니메이션을 열거나 새로 만드세요.</p>';
    elTracksEl.innerHTML = '';
    return;
  }
  const sel = getSelection();
  const currentTime = getCurrentTime();
  const totalPx = Math.max(300, timeToPx(def.duration));
  const sortedChapters = [...def.chapters].sort((a, b) => a.time - b.time);

  const rulerMarks: string[] = [];
  const step = def.duration > 10000 ? 1000 : def.duration > 2000 ? 500 : 100;
  for (let t = 0; t <= def.duration; t += step) {
    const x = timeToPx(t);
    rulerMarks.push(`<div class="studio-tl-ruler-mark" style="left:${x}px"><span>${t}</span></div>`);
  }

  const chapterMarkers = sortedChapters
    .map((c) => {
      const x = timeToPx(c.time);
      const isSel = sel.kind === 'chapter' && sel.chapterId === c.id;
      return `<div class="studio-tl-chapter-marker ${isSel ? 'is-selected' : ''}" style="left:${x}px" data-chapter-id="${escapeHtml(c.id)}" title="${escapeHtml(c.label)} @ ${c.time}ms">
        <div class="studio-tl-chapter-line"></div>
        <div class="studio-tl-chapter-label">${escapeHtml(c.label || c.id)}</div>
      </div>`;
    })
    .join('');

  const playheadCol = `<div class="studio-tl-playhead-col" style="left:${GUTTER_PX}px;width:${totalPx}px"><div class="studio-tl-playhead" style="left:${timeToPx(currentTime)}px" title="t=${currentTime}ms"></div></div>`;

  tracksEl.innerHTML = `
    <div class="studio-tl-chart">
      <div class="studio-tl-row studio-tl-ruler-row">
        <div class="studio-tl-gutter studio-tl-gutter-header" aria-hidden="true">⏱ 시간 (ms)</div>
        <div class="studio-tl-body" style="width:${totalPx}px">
          <div class="studio-tl-ruler">${rulerMarks.join('')}</div>
        </div>
      </div>
      <div class="studio-tl-row studio-tl-chapter-row-wrap">
        <div class="studio-tl-gutter">Chapters</div>
        <div class="studio-tl-body" style="width:${totalPx}px">
          <div class="studio-tl-chapter-row" data-tl-area="chapter">
            ${chapterMarkers}
          </div>
        </div>
      </div>
      ${playheadCol}
    </div>
    <div class="studio-tl-total">전체 ${def.duration} ms · ${sortedChapters.length} chapters · ${def.elements.length} elements · 현재 ${currentTime} ms</div>
  `;

  renderElementTracks(def.elements, currentTime, totalPx, sel);
}

function gutterLabel(el: AnimationElement): string {
  return `${friendlyElementLabel(el)} · ${el.type}`;
}

function renderElementTracks(elements: AnimationElement[], currentTime: number, totalPx: number, sel: ReturnType<typeof getSelection>): void {
  if (!elTracksEl) return;
  if (elements.length === 0) {
    elTracksEl.innerHTML = '<p class="studio-tl-empty">요소 없음</p>';
    return;
  }
  const rows = elements
    .map((el) => {
      const isSel = (sel.kind === 'element' && sel.elementId === el.id) || (sel.kind === 'elements' && sel.elementIds.includes(el.id));
      const appearanceBars = el.appearances
        .map((ap, idx) => {
          const left = timeToPx(ap.start);
          const width = Math.max(4, timeToPx(ap.end - ap.start));
          return `<div class="studio-tl-appearance" style="left:${left}px;width:${width}px" data-elem-id="${escapeHtml(el.id)}" data-ap-idx="${idx}" title="${ap.start}-${ap.end}ms">
            <span class="studio-tl-ap-edge studio-tl-ap-edge-left" data-edge="start"></span>
            <span class="studio-tl-ap-edge studio-tl-ap-edge-right" data-edge="end"></span>
            <span class="studio-tl-ap-label">${ap.start}–${ap.end}</span>
          </div>`;
        })
        .join('');
      const trackKfs = el.tracks
        .flatMap((t) => t.keyframes.map((kf) => ({ prop: t.property, time: kf.time })))
        .map((kf) => `<div class="studio-tl-keyframe" style="left:${timeToPx(kf.time)}px" title="${escapeHtml(kf.prop)} @ ${kf.time}ms">◆</div>`)
        .join('');
      return `
        <div class="studio-tl-row studio-tl-element-row ${isSel ? 'is-selected' : ''}" data-elem-id="${escapeHtml(el.id)}">
          <div class="studio-tl-gutter studio-tl-element-label" title="${escapeHtml(el.id)}">${escapeHtml(gutterLabel(el))}</div>
          <div class="studio-tl-body" style="width:${totalPx}px">
            <div class="studio-tl-element-track" data-tl-area="elements">
              ${appearanceBars}
              ${trackKfs}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
  const playheadCol = `<div class="studio-tl-playhead-col" style="left:${GUTTER_PX}px;width:${totalPx}px"><div class="studio-tl-playhead" style="left:${timeToPx(currentTime)}px"></div></div>`;
  elTracksEl.innerHTML = `<div class="studio-tl-chart">${rows}${playheadCol}</div>`;
}

function onTracksClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const chapterMarker = target.closest<HTMLElement>('[data-chapter-id]');
  if (chapterMarker) {
    setSelection({ kind: 'chapter', chapterId: chapterMarker.dataset.chapterId! });
  }
}

function onElTracksClick(e: MouseEvent): void {
  if (dragMode) return;
  const target = e.target as HTMLElement;
  if (target.closest('[data-ap-idx]') || target.closest('[data-edge]')) return;
  const row = target.closest<HTMLElement>('[data-elem-id]');
  if (row) {
    setSelection({ kind: 'element', elementId: row.dataset.elemId! });
  }
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;

  const edge = target.closest<HTMLElement>('[data-edge]');
  if (edge) {
    const apEl = edge.closest<HTMLElement>('[data-ap-idx]');
    if (apEl) {
      e.preventDefault();
      const elementId = apEl.dataset.elemId!;
      const apIdx = Number(apEl.dataset.apIdx);
      const def = getDef();
      const el = def?.elements.find((x) => x.id === elementId);
      const ap = el?.appearances[apIdx];
      if (ap) {
        dragMode = {
          kind: 'appearance',
          elementId,
          apIdx,
          edge: edge.dataset.edge as 'start' | 'end',
          startMouseX: e.clientX,
          startApStart: ap.start,
          startApEnd: ap.end,
        };
      }
      return;
    }
  }
  const apBar = target.closest<HTMLElement>('[data-ap-idx]');
  if (apBar) {
    e.preventDefault();
    const elementId = apBar.dataset.elemId!;
    const apIdx = Number(apBar.dataset.apIdx);
    const def = getDef();
    const el = def?.elements.find((x) => x.id === elementId);
    const ap = el?.appearances[apIdx];
    if (ap) {
      dragMode = {
        kind: 'appearance',
        elementId,
        apIdx,
        edge: 'move',
        startMouseX: e.clientX,
        startApStart: ap.start,
        startApEnd: ap.end,
      };
    }
    return;
  }

  const chapterMarker = target.closest<HTMLElement>('[data-chapter-id]');
  if (chapterMarker) {
    e.preventDefault();
    dragMode = { kind: 'chapter', id: chapterMarker.dataset.chapterId! };
    return;
  }
  const area = target.closest<HTMLElement>('[data-tl-area]');
  if (area) {
    e.preventDefault();
    const rect = area.getBoundingClientRect();
    setCurrentTime(pxToTime(e.clientX - rect.left));
    dragMode = { kind: 'time' };
  }
}

function onMouseMove(e: MouseEvent): void {
  if (!dragMode) return;
  e.preventDefault();
  if (dragMode.kind === 'time') {
    const area = tracksEl?.querySelector('[data-tl-area]') as HTMLElement | null;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const t = pxToTime(e.clientX - rect.left);
    setCurrentTime(t);
    showDragTooltip(e.clientX, e.clientY, `⏱ ${t} ms`);
    return;
  }
  if (dragMode.kind === 'chapter') {
    const area = tracksEl?.querySelector('[data-tl-area]') as HTMLElement | null;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const t = pxToTime(e.clientX - rect.left);
    updateChapter(dragMode.id, { time: t });
    showDragTooltip(e.clientX, e.clientY, `📌 ${t} ms`);
    return;
  }
  if (dragMode.kind === 'appearance') {
    const dxPx = e.clientX - dragMode.startMouseX;
    const dt = Math.round(dxPx / pxPerMs);
    if (dragMode.edge === 'start') {
      updateAppearance(dragMode.elementId, dragMode.apIdx, { start: Math.max(0, dragMode.startApStart + dt) });
    } else if (dragMode.edge === 'end') {
      updateAppearance(dragMode.elementId, dragMode.apIdx, { end: Math.max(0, dragMode.startApEnd + dt) });
    } else {
      updateAppearance(dragMode.elementId, dragMode.apIdx, {
        start: Math.max(0, dragMode.startApStart + dt),
        end: Math.max(0, dragMode.startApEnd + dt),
      });
    }
    const a = dragMode.startApStart + dt;
    const b = dragMode.startApEnd + dt;
    showDragTooltip(e.clientX, e.clientY, `▶ ${Math.max(0, a)}–${Math.max(0, b)} ms`);
  }
}

function onMouseUp(): void {
  dragMode = null;
  hideDragTooltip();
}
