import type { StudioUi } from '../studio-ui';
import { getGridSize, isGridEnabled } from '../grid';

export function reflectGridUi(ui: StudioUi): void {
  const on = isGridEnabled();
  const size = getGridSize();
  ui.gridToggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  ui.gridToggleBtn.classList.toggle('is-active', on);
  ui.gridToggleBtn.title = on ? `격자 켬 (${size}px), G 로 끔` : '격자 켜기 (G)';
  document.body.classList.toggle('studio-grid-on', on);
  ui.app.style.setProperty('--studio-grid-size', `${size}px`);
  const label = document.getElementById('studio-grid-label');
  if (label) label.textContent = on ? `격자 ${size}px` : '격자 끔';
}

export function setupTimelineResizer(ui: StudioUi): void {
  const resizer = document.getElementById('studio-timeline-resizer');
  if (!resizer) return;
  const STORAGE_KEY = 'studio.timelineHeight';
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  if (Number.isFinite(saved) && saved > 100) {
    ui.app.style.setProperty('--studio-timeline-h', `${saved}px`);
  }
  let dragging = false;
  let startY = 0;
  let startH = 320;
  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    const cs = getComputedStyle(ui.app).getPropertyValue('--studio-timeline-h').trim();
    startH = parseFloat(cs) || 320;
    resizer.classList.add('is-dragging');
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dy = startY - e.clientY;
    const h = Math.max(120, Math.min(window.innerHeight * 0.8, startH + dy));
    ui.app.style.setProperty('--studio-timeline-h', `${h}px`);
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('is-dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const cs = getComputedStyle(ui.app).getPropertyValue('--studio-timeline-h').trim();
    const h = parseFloat(cs);
    if (Number.isFinite(h) && h > 0) {
      localStorage.setItem(STORAGE_KEY, String(h));
    }
  });
  resizer.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const cs = getComputedStyle(ui.app).getPropertyValue('--studio-timeline-h').trim();
    const current = parseFloat(cs) || 320;
    const step = e.shiftKey ? 40 : 10;
    const delta = e.key === 'ArrowUp' ? step : -step;
    const h = Math.max(120, Math.min(window.innerHeight * 0.8, current + delta));
    ui.app.style.setProperty('--studio-timeline-h', `${h}px`);
    localStorage.setItem(STORAGE_KEY, String(h));
  });
}

export function setupCanvasPan(ui: StudioUi): void {
  const wrap = ui.app.querySelector<HTMLElement>('.studio-canvas-wrap');
  if (!wrap) return;
  let spaceHeld = false;
  let panState: { startX: number; startY: number; startScrollL: number; startScrollT: number } | null = null;

  const isInputTarget = (t: EventTarget | null): boolean =>
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    (t instanceof HTMLElement && t.isContentEditable);

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    if (isInputTarget(e.target)) return;
    if (e.repeat) return;
    spaceHeld = true;
    document.body.classList.add('studio-pan-mode');
    e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    spaceHeld = false;
    document.body.classList.remove('studio-pan-mode');
  });

  wrap.addEventListener('mousedown', (e) => {
    if (!spaceHeld) return;
    e.preventDefault();
    e.stopPropagation();
    panState = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollL: wrap.scrollLeft,
      startScrollT: wrap.scrollTop,
    };
    document.body.classList.add('studio-panning');
  }, { capture: true });

  document.addEventListener('mousemove', (e) => {
    if (!panState) return;
    e.preventDefault();
    wrap.scrollLeft = panState.startScrollL - (e.clientX - panState.startX);
    wrap.scrollTop = panState.startScrollT - (e.clientY - panState.startY);
  });
  document.addEventListener('mouseup', () => {
    if (!panState) return;
    panState = null;
    document.body.classList.remove('studio-panning');
  });
}
