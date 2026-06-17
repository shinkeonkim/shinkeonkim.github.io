import { exportPng, exportSvg } from './mermaid-export';

const dialog = (): HTMLDialogElement | null =>
  document.getElementById('mermaid-zoom') as HTMLDialogElement | null;
const viewport = (): HTMLElement | null =>
  dialog()?.querySelector<HTMLElement>('.mermaid-zoom-viewport') ?? null;
const content = (): HTMLElement | null =>
  dialog()?.querySelector<HTMLElement>('.mermaid-zoom-content') ?? null;

let zoomScale = 1;
let panX = 0;
let panY = 0;

function applyTransform(): void {
  const c = content();
  if (!c) return;
  c.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
}

function resetTransform(): void {
  zoomScale = 1;
  panX = 0;
  panY = 0;
  applyTransform();
}

function openZoom(sourceEl: HTMLElement): void {
  const d = dialog();
  const c = content();
  const svg = sourceEl.querySelector('svg');
  if (!d || !c || !svg) return;
  c.innerHTML = '';
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute('width');
  clone.removeAttribute('height');
  c.appendChild(clone);
  resetTransform();
  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
}

function closeZoom(): void {
  const d = dialog();
  const c = content();
  if (!d) return;
  if (typeof d.close === 'function') d.close();
  else d.removeAttribute('open');
  if (c) c.innerHTML = '';
}

function getZoomSvg(): SVGSVGElement | null {
  return content()?.querySelector('svg') ?? null;
}

export function attachZoomHandlers(): void {
  document.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-source]').forEach((el) => {
    if (el.dataset.zoomBound === '1') return;
    el.dataset.zoomBound = '1';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openZoom(el);
    });
  });
}

export function bindZoomDialogListeners(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-zoom-export-svg]')) {
      const svg = getZoomSvg();
      if (svg) exportSvg(svg);
      return;
    }
    if (target.closest('[data-zoom-export-png]')) {
      const svg = getZoomSvg();
      if (svg) exportPng(svg);
      return;
    }
    if (target.closest('[data-zoom-close]')) {
      closeZoom();
      return;
    }
    const d = dialog();
    if (d && d.open && target === d) closeZoom();
  });

  document.addEventListener('keydown', (e) => {
    const d = dialog();
    if (!d || !d.open) return;
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomScale = Math.min(zoomScale * 1.2, 6);
      applyTransform();
    } else if (e.key === '-') {
      e.preventDefault();
      zoomScale = Math.max(zoomScale / 1.2, 0.3);
      applyTransform();
    } else if (e.key === '0') {
      e.preventDefault();
      resetTransform();
    }
  });

  document.addEventListener(
    'wheel',
    (e) => {
      const v = viewport();
      const d = dialog();
      if (!v || !d || !d.open) return;
      const target = e.target as Node;
      if (!v.contains(target) && target !== v) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomScale = Math.max(0.3, Math.min(6, zoomScale * factor));
      applyTransform();
    },
    { passive: false },
  );

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;
  document.addEventListener('mousedown', (e) => {
    const v = viewport();
    const d = dialog();
    if (!v || !d || !d.open || !v.contains(e.target as Node)) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = panX;
    startPanY = panY;
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panX = startPanX + (e.clientX - startX);
    panY = startPanY + (e.clientY - startY);
    applyTransform();
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
}
