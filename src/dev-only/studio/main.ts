import {
  canRedo,
  canUndo,
  getDef,
  getSelection,
  getSelectedElementIds,
  isDirty,
  isDraft,
  markClean,
  setDef,
  setDraft,
  promoteDraftToSaved,
  setSelection,
  updateElementBase,
  subscribe,
  updateMeta,
  undo,
  redo,
  deleteElement,
  deleteChapter,
  addChapter,
  deleteEffect,
  uniqueChapterId,
  getCurrentTime,
  setCurrentTime,
  addElement,
  uniqueElementId,
} from './state';
import { animationDefSchema } from '../../animations/schema';
import type { AnimationElement } from '../../animations/schema';
import { initCanvas, showPreview, hidePreview } from './canvas';
import { initElementList } from './element-list';
import { initProperties } from './properties';
import { initTimeline } from './timeline';
import { IconLibraryDialog } from './icon-library';
import { AssetLibraryDialog, saveSelectionAsAsset } from './asset-library';
import { initGrid, isGridEnabled, setGridEnabled, getGridSize, subscribeGrid } from './grid';
import * as api from './api';
import { updateCanvas } from './state';

interface StudioUi {
  app: HTMLElement;
  titleInput: HTMLInputElement;
  idDisplay: HTMLElement;
  status: HTMLElement;
  saveBtn: HTMLButtonElement;
  deleteBtn: HTMLButtonElement;
  newBtn: HTMLButtonElement;
  openBtn: HTMLButtonElement;
  playBtn: HTMLButtonElement;
  restartBtn: HTMLButtonElement;
  speedInput: HTMLInputElement;
  speedValue: HTMLElement;
  canvas: SVGSVGElement;
  elementList: HTMLElement;
  toolsRoot: HTMLElement;
  propsRoot: HTMLElement;
  timelineTracks: HTMLElement;
  elementTracks: HTMLElement;
  addStepBtn: HTMLButtonElement;
  libraryDialog: HTMLDialogElement;
  libraryList: HTMLElement;
  newDialog: HTMLDialogElement;
  newIdInput: HTMLInputElement;
  newTitleInput: HTMLInputElement;
  newCreateBtn: HTMLButtonElement;
  newError: HTMLElement;
  canvasWidthInput: HTMLInputElement;
  canvasHeightInput: HTMLInputElement;
  imageUploadBtn: HTMLButtonElement;
  imageFileInput: HTMLInputElement;
  helpBtn: HTMLButtonElement;
  helpDialog: HTMLDialogElement;
  undoBtn: HTMLButtonElement;
  redoBtn: HTMLButtonElement;
  gridToggleBtn: HTMLButtonElement;
}

function queryUi(): StudioUi | null {
  const app = document.getElementById('studio-app');
  if (!app) return null;
  const $ = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

  const titleInput = $<HTMLInputElement>('studio-title');
  const idDisplay = $<HTMLElement>('studio-id-display');
  const status = $<HTMLElement>('studio-status');
  const saveBtn = $<HTMLButtonElement>('studio-save');
  const deleteBtn = $<HTMLButtonElement>('studio-delete');
  const newBtn = $<HTMLButtonElement>('studio-new');
  const openBtn = $<HTMLButtonElement>('studio-open');
  const playBtn = $<HTMLButtonElement>('studio-play');
  const restartBtn = $<HTMLButtonElement>('studio-restart');
  const speedInput = $<HTMLInputElement>('studio-speed');
  const speedValue = $<HTMLElement>('studio-speed-value');
  const canvas = document.getElementById('studio-canvas') as SVGSVGElement | null;
  const elementList = $<HTMLElement>('studio-element-list');
  const toolsRoot = app.querySelector<HTMLElement>('.studio-tools');
  const propsRoot = $<HTMLElement>('studio-props-content');
  const timelineTracks = $<HTMLElement>('studio-timeline-tracks');
  const elementTracks = $<HTMLElement>('studio-element-tracks');
  const addStepBtn = $<HTMLButtonElement>('studio-add-step');
  const libraryDialog = $<HTMLDialogElement>('studio-library-dialog');
  const libraryList = $<HTMLElement>('studio-library-list');
  const newDialog = $<HTMLDialogElement>('studio-new-dialog');
  const newIdInput = $<HTMLInputElement>('studio-new-id');
  const newTitleInput = $<HTMLInputElement>('studio-new-title');
  const newCreateBtn = $<HTMLButtonElement>('studio-new-create');
  const newError = $<HTMLElement>('studio-new-error');
  const canvasWidthInput = $<HTMLInputElement>('studio-canvas-width');
  const canvasHeightInput = $<HTMLInputElement>('studio-canvas-height');
  const imageUploadBtn = $<HTMLButtonElement>('studio-image-upload');
  const imageFileInput = $<HTMLInputElement>('studio-image-file');
  const helpBtn = $<HTMLButtonElement>('studio-help');
  const helpDialog = $<HTMLDialogElement>('studio-help-dialog');
  const undoBtn = $<HTMLButtonElement>('studio-undo');
  const redoBtn = $<HTMLButtonElement>('studio-redo');
  const gridToggleBtn = $<HTMLButtonElement>('studio-grid-toggle');

  if (
    !titleInput || !idDisplay || !status || !saveBtn || !deleteBtn || !newBtn || !openBtn ||
    !playBtn || !restartBtn || !speedInput || !speedValue || !canvas || !elementList || !toolsRoot ||
    !propsRoot || !timelineTracks || !elementTracks || !addStepBtn || !libraryDialog || !libraryList || !newDialog ||
    !newIdInput || !newTitleInput || !newCreateBtn || !newError ||
    !canvasWidthInput || !canvasHeightInput || !imageUploadBtn || !imageFileInput || !helpBtn || !helpDialog ||
    !undoBtn || !redoBtn || !gridToggleBtn
  ) {
    return null;
  }

  return {
    app, titleInput, idDisplay, status, saveBtn, deleteBtn, newBtn, openBtn,
    playBtn, restartBtn, speedInput, speedValue, canvas, elementList, toolsRoot,
    propsRoot, timelineTracks, elementTracks, addStepBtn, libraryDialog, libraryList, newDialog,
    newIdInput, newTitleInput, newCreateBtn, newError,
    canvasWidthInput, canvasHeightInput, imageUploadBtn, imageFileInput, helpBtn, helpDialog,
    undoBtn, redoBtn, gridToggleBtn,
  };
}

let playState: 'idle' | 'playing' = 'idle';
let clipboard: AnimationElement[] = [];

function shiftCloneCoords(el: AnimationElement, dx: number, dy: number): AnimationElement {
  const clone = JSON.parse(JSON.stringify(el)) as AnimationElement;
  if (clone.type === 'rect' || clone.type === 'image' || clone.type === 'text') {
    clone.x += dx;
    clone.y += dy;
  } else if (clone.type === 'circle') {
    clone.cx += dx;
    clone.cy += dy;
  } else if (clone.type === 'line' || clone.type === 'arrow') {
    if (typeof clone.x1 === 'number') clone.x1 += dx;
    if (typeof clone.y1 === 'number') clone.y1 += dy;
    if (typeof clone.x2 === 'number') clone.x2 += dx;
    if (typeof clone.y2 === 'number') clone.y2 += dy;
  } else if (clone.type === 'path') {
    clone.x = (clone.x ?? 0) + dx;
    clone.y = (clone.y ?? 0) + dy;
  } else if (clone.type === 'polygon') {
    const pts = clone.points.trim().split(/\s+/).map((pair: string) => {
      const [x, y] = pair.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) return `${x + dx},${y + dy}`;
      return pair;
    });
    clone.points = pts.join(' ');
  }
  return clone;
}

function copySelection(): boolean {
  const sel = getSelection();
  const ids = getSelectedElementIds(sel);
  if (ids.length === 0) return false;
  const def = getDef();
  if (!def) return false;
  const copies: AnimationElement[] = [];
  for (const id of ids) {
    const el = def.elements.find((e) => e.id === id);
    if (el) copies.push(JSON.parse(JSON.stringify(el)));
  }
  if (copies.length === 0) return false;
  clipboard = copies;
  return true;
}

function pasteFromClipboard(): boolean {
  if (clipboard.length === 0) return false;
  const newIds: string[] = [];
  for (const item of clipboard) {
    const newId = uniqueElementId(item.type);
    const shifted = shiftCloneCoords(item, 20, 20);
    shifted.id = newId;
    addElement(shifted);
    newIds.push(newId);
  }
  if (newIds.length === 1) {
    setSelection({ kind: 'element', elementId: newIds[0] });
  } else if (newIds.length > 1) {
    setSelection({ kind: 'elements', elementIds: newIds });
  }
  return true;
}

function moveOneElement(el: AnimationElement, dx: number, dy: number): boolean {
  const patch: Record<string, unknown> = {};
  if (el.type === 'rect' || el.type === 'image' || el.type === 'text') {
    patch.x = el.x + dx;
    patch.y = el.y + dy;
  } else if (el.type === 'circle') {
    patch.cx = el.cx + dx;
    patch.cy = el.cy + dy;
  } else if (el.type === 'line' || el.type === 'arrow') {
    if (typeof el.x1 === 'number') patch.x1 = el.x1 + dx;
    if (typeof el.y1 === 'number') patch.y1 = el.y1 + dy;
    if (typeof el.x2 === 'number') patch.x2 = el.x2 + dx;
    if (typeof el.y2 === 'number') patch.y2 = el.y2 + dy;
  } else if (el.type === 'path') {
    patch.x = (el.x ?? 0) + dx;
    patch.y = (el.y ?? 0) + dy;
  } else if (el.type === 'polygon') {
    const pts = el.points.trim().split(/\s+/).map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) return `${x + dx},${y + dy}`;
      return pair;
    });
    patch.points = pts.join(' ');
  } else {
    return false;
  }
  updateElementBase(el.id, patch);
  return true;
}

function moveSelectedElement(dx: number, dy: number): boolean {
  const sel = getSelection();
  const ids = getSelectedElementIds(sel);
  if (ids.length === 0) return false;
  const def = getDef();
  if (!def) return false;
  let moved = false;
  for (const id of ids) {
    const el = def.elements.find((e) => e.id === id);
    if (el && moveOneElement(el, dx, dy)) moved = true;
  }
  return moved;
}

function reflectGridUi(ui: StudioUi): void {
  const on = isGridEnabled();
  ui.gridToggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  ui.gridToggleBtn.classList.toggle('is-active', on);
  document.body.classList.toggle('studio-grid-on', on);
  ui.app.style.setProperty('--studio-grid-size', `${getGridSize()}px`);
}

function startInlineTextEdit(canvas: SVGSVGElement, el: { id: string; x: number; y: number; content: string; fontSize?: number; fontWeight?: string | number; color?: string }): void {
  canvas.querySelectorAll('[data-inline-text-editor]').forEach((n) => n.remove());
  const fontSize = el.fontSize ?? 16;
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('data-inline-text-editor', '');
  fo.setAttribute('x', String(el.x - 8));
  fo.setAttribute('y', String(el.y - fontSize));
  const width = Math.max(160, (el.content?.length ?? 5) * fontSize * 0.7);
  fo.setAttribute('width', String(width));
  fo.setAttribute('height', String(fontSize * 1.6));
  const input = document.createElement('input');
  input.type = 'text';
  input.value = el.content ?? '';
  Object.assign(input.style, {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    border: '2px solid #6366f1',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.96)',
    padding: '0 6px',
    font: `${el.fontWeight ?? 400} ${fontSize}px ui-sans-serif,system-ui,sans-serif`,
    color: el.color ?? '#0f172a',
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.2)',
  });
  fo.appendChild(input);
  canvas.appendChild(fo);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  let settled = false;
  const commit = (): void => {
    if (settled) return;
    settled = true;
    const newContent = input.value;
    fo.remove();
    if (newContent !== el.content) {
      updateElementBase(el.id, { content: newContent });
    }
  };
  const cancel = (): void => {
    if (settled) return;
    settled = true;
    fo.remove();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
}

function selectAdjacentElement(direction: 1 | -1): boolean {
  const def = getDef();
  if (!def || def.elements.length === 0) return false;
  const sel = getSelection();
  if (sel.kind !== 'element') {
    const target = direction === 1 ? def.elements[0] : def.elements[def.elements.length - 1];
    setSelection({ kind: 'element', elementId: target.id });
    return true;
  }
  const idx = def.elements.findIndex((e) => e.id === sel.elementId);
  if (idx < 0) return false;
  const nextIdx = (idx + direction + def.elements.length) % def.elements.length;
  setSelection({ kind: 'element', elementId: def.elements[nextIdx].id });
  return true;
}

export function initStudio(): void {
  const ui = queryUi();
  if (!ui) {
    console.error('[studio] missing required elements');
    return;
  }
  document.body.classList.add('editor-active');
  document.documentElement.classList.add('editor-active');

  initGrid();
  reflectGridUi(ui);
  subscribeGrid(() => reflectGridUi(ui));

  initCanvas(ui.canvas);
  initElementList(ui.elementList, ui.toolsRoot);
  initProperties(ui.propsRoot);
  initTimeline(ui.timelineTracks, ui.addStepBtn, ui.elementTracks);

  const iconDialog = IconLibraryDialog.mount();
  document.getElementById('studio-open-icons')?.addEventListener('click', () => iconDialog?.open());

  const assetDialog = AssetLibraryDialog.mount();
  document.getElementById('studio-assets')?.addEventListener('click', () => assetDialog?.open());
  document.body.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-save-as-asset]')) saveSelectionAsAsset();
  });

  ui.toolsRoot.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-canvas-preset]');
    if (!btn) return;
    const preset = btn.dataset.canvasPreset ?? '';
    const m = preset.match(/^(\d+)x(\d+)$/);
    if (!m) return;
    updateCanvas({ width: Number(m[1]), height: Number(m[2]) });
  });

  ui.canvasWidthInput.addEventListener('input', () => {
    const w = Number(ui.canvasWidthInput.value);
    if (w >= 100 && w <= 8000) updateCanvas({ width: w });
  });
  ui.canvasHeightInput.addEventListener('input', () => {
    const h = Number(ui.canvasHeightInput.value);
    if (h >= 100 && h <= 8000) updateCanvas({ height: h });
  });

  ui.imageUploadBtn.addEventListener('click', () => ui.imageFileInput.click());
  ui.imageFileInput.addEventListener('change', () => {
    const file = ui.imageFileInput.files?.[0];
    if (file) void uploadAndInsertImage(file, ui);
    ui.imageFileInput.value = '';
  });

  ui.helpBtn.addEventListener('click', () => {
    if (typeof ui.helpDialog.showModal === 'function') ui.helpDialog.showModal();
    else ui.helpDialog.setAttribute('open', '');
  });

  setupImageDropAndPaste(ui);
  setupTimelineResizer(ui);

  ui.canvas.addEventListener('dblclick', (e) => {
    const target = (e.target as Element).closest<SVGGElement>('[data-elem-id]');
    if (!target) return;
    const id = target.getAttribute('data-elem-id');
    if (!id) return;
    const def = getDef();
    const el = def?.elements.find((x) => x.id === id);
    if (!el || el.type !== 'text') return;
    e.preventDefault();
    startInlineTextEdit(ui.canvas, el);
  });

  subscribe(() => reflectState(ui));
  reflectState(ui);

  ui.titleInput.addEventListener('input', () => {
    updateMeta({ title: ui.titleInput.value });
  });

  ui.openBtn.addEventListener('click', () => void openLibrary(ui));
  ui.newBtn.addEventListener('click', () => openNewDialog(ui));
  ui.saveBtn.addEventListener('click', () => void saveCurrent(ui));
  ui.deleteBtn.addEventListener('click', () => void deleteCurrent(ui));
  ui.undoBtn.addEventListener('click', () => undo());
  ui.redoBtn.addEventListener('click', () => redo());
  ui.gridToggleBtn.addEventListener('click', () => setGridEnabled(!isGridEnabled()));
  ui.playBtn.addEventListener('click', () => togglePlay(ui));
  ui.restartBtn.addEventListener('click', () => {
    if (playState === 'playing') {
      stopPreview(ui);
      togglePlay(ui);
    }
  });
  ui.speedInput.addEventListener('input', () => {
    ui.speedValue.textContent = Number(ui.speedInput.value).toFixed(2) + 'x';
  });

  ui.newCreateBtn.addEventListener('click', () => void createNew(ui));

  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-studio-dialog-close]')) {
      ui.libraryDialog.close();
      ui.newDialog.close();
      ui.newDialog.removeAttribute('data-mode');
    }
  });

  document.addEventListener('keydown', (e) => {
    const inText =
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable);
    const mod = e.metaKey || e.ctrlKey;

    if (e.key === 'Escape') {
      const sel = getSelection();
      if (sel.kind !== 'none') {
        setSelection({ kind: 'none' });
      }
      return;
    }

    if (!inText && !mod && (e.key === '?' || (e.key === '/' && e.shiftKey))) {
      e.preventDefault();
      if (typeof ui.helpDialog.showModal === 'function') ui.helpDialog.showModal();
      else ui.helpDialog.setAttribute('open', '');
      return;
    }

    if (!inText && (e.key === 'Delete' || e.key === 'Backspace')) {
      const sel = getSelection();
      const ids = getSelectedElementIds(sel);
      if (ids.length > 0) {
        e.preventDefault();
        for (const id of ids) deleteElement(id);
        setSelection({ kind: 'none' });
      } else if (sel.kind === 'chapter') {
        e.preventDefault();
        deleteChapter(sel.chapterId);
      } else if (sel.kind === 'effect') {
        e.preventDefault();
        deleteEffect(sel.effectId);
      }
      return;
    }

    if (!inText && !mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (moveSelectedElement(dx, dy)) e.preventDefault();
      return;
    }

    if (!inText && !mod && e.key === 'Tab') {
      if (selectAdjacentElement(e.shiftKey ? -1 : 1)) e.preventDefault();
      return;
    }

    if (!inText && !mod && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      setGridEnabled(!isGridEnabled());
      return;
    }

    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      void saveCurrent(ui);
      return;
    }
    if (key === 'z' && !inText) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (key === 'y' && !inText) {
      e.preventDefault();
      redo();
      return;
    }
    if ((key === 'c' || key === 'x') && !inText) {
      if (copySelection()) {
        e.preventDefault();
        if (key === 'x') {
          const sel = getSelection();
          const ids = getSelectedElementIds(sel);
          for (const id of ids) deleteElement(id);
          if (ids.length > 0) setSelection({ kind: 'none' });
        }
      }
      return;
    }
    if (key === 'v' && !inText) {
      if (pasteFromClipboard()) {
        e.preventDefault();
      }
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault();
  });

  if (!getDef()) {
    startDraft();
    setStatus(ui, '임시 작업 (Draft) — 저장 시 ID/제목 입력', 'ok');
  } else {
    setStatus(ui, '준비됨', 'ok');
  }
}

function startDraft(): void {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const id = `draft-${stamp}`;
  const def = animationDefSchema.parse({ id, title: '', description: '' });
  setDraft(def);
}

function reflectState(ui: StudioUi): void {
  ui.undoBtn.disabled = !canUndo();
  ui.redoBtn.disabled = !canRedo();
  const def = getDef();
  if (!def) {
    ui.titleInput.value = '';
    ui.titleInput.disabled = true;
    ui.idDisplay.textContent = '';
    ui.saveBtn.disabled = true;
    ui.deleteBtn.disabled = true;
    ui.canvasWidthInput.value = '';
    ui.canvasHeightInput.value = '';
    ui.canvasWidthInput.disabled = true;
    ui.canvasHeightInput.disabled = true;
    return;
  }
  if (document.activeElement !== ui.titleInput) {
    ui.titleInput.value = def.title;
  }
  ui.titleInput.disabled = false;
  if (isDraft()) {
    ui.idDisplay.textContent = '📝 Draft (저장 시 ID 입력)';
    ui.idDisplay.classList.add('is-draft');
    ui.deleteBtn.disabled = true;
  } else {
    ui.idDisplay.textContent = def.id;
    ui.idDisplay.classList.remove('is-draft');
    ui.deleteBtn.disabled = false;
  }
  ui.saveBtn.disabled = false;
  ui.canvasWidthInput.disabled = false;
  ui.canvasHeightInput.disabled = false;
  if (document.activeElement !== ui.canvasWidthInput) ui.canvasWidthInput.value = String(def.canvas.width);
  if (document.activeElement !== ui.canvasHeightInput) ui.canvasHeightInput.value = String(def.canvas.height);
  if (isDirty()) {
    setStatus(ui, '저장되지 않은 변경 사항', 'warn');
  }
}

async function uploadAndInsertImage(file: File, ui: StudioUi): Promise<void> {
  const def = getDef();
  if (!def) {
    setStatus(ui, '먼저 애니메이션을 열거나 만드세요', 'warn');
    return;
  }
  try {
    setStatus(ui, '이미지 업로드 중…');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/_editor/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { path: string };
    const cx = def.canvas.width / 2;
    const cy = def.canvas.height / 2;
    const tempImg = await loadImageSize(data.path);
    const maxDim = Math.min(def.canvas.width, def.canvas.height) * 0.5;
    let w = tempImg?.w ?? 200;
    let h = tempImg?.h ?? 200;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const id = uniqueElementId('img');
    addElement({
      type: 'image', id, rotation: 0, appearances: [], tracks: [],
      x: Math.round(cx - w / 2), y: Math.round(cy - h / 2),
      width: w, height: h, src: data.path,
      preserveAspectRatio: 'xMidYMid meet', opacity: 1,
    });
    setStatus(ui, `업로드 완료: ${data.path}`, 'ok');
  } catch (err) {
    setStatus(ui, '업로드 실패: ' + (err instanceof Error ? err.message : String(err)), 'error');
  }
}

function loadImageSize(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function setupTimelineResizer(ui: StudioUi): void {
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

function setupImageDropAndPaste(ui: StudioUi): void {
  const canvasWrap = ui.app.querySelector<HTMLElement>('.studio-canvas-wrap');
  if (canvasWrap) {
    canvasWrap.addEventListener('dragover', (e) => {
      if (!e.dataTransfer) return;
      const hasFiles = Array.from(e.dataTransfer.items ?? []).some((it) => it.kind === 'file');
      if (hasFiles) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        canvasWrap.classList.add('is-drop-target');
      }
    });
    canvasWrap.addEventListener('dragleave', () => canvasWrap.classList.remove('is-drop-target'));
    canvasWrap.addEventListener('drop', (e) => {
      canvasWrap.classList.remove('is-drop-target');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        e.preventDefault();
        void uploadAndInsertImage(file, ui);
      }
    });
  }
  document.addEventListener('paste', (e) => {
    if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
      return;
    }
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void uploadAndInsertImage(file, ui);
          return;
        }
      }
    }
  });
}

function setStatus(ui: StudioUi, text: string, kind: 'ok' | 'warn' | 'error' = 'ok'): void {
  ui.status.textContent = text;
  ui.status.style.color = kind === 'error' ? '#ef4444' : kind === 'warn' ? '#f59e0b' : 'var(--color-fg-muted)';
}

async function openLibrary(ui: StudioUi): Promise<void> {
  ui.libraryList.innerHTML = '<li class="studio-library-empty">로딩…</li>';
  if (typeof ui.libraryDialog.showModal === 'function') ui.libraryDialog.showModal();
  else ui.libraryDialog.setAttribute('open', '');
  try {
    const items = await api.listAnimations();
    if (items.length === 0) {
      ui.libraryList.innerHTML = '<li class="studio-library-empty">저장된 애니메이션이 없습니다.</li>';
      return;
    }
    ui.libraryList.innerHTML = items
      .map((it) => `
        <li class="studio-library-item">
          <div style="flex:1">
            <div style="font-weight: 600">${escapeHtml(it.title)}</div>
            <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-fg-muted)">${escapeHtml(it.id)}</div>
            ${it.description ? `<div style="font-size: 0.75rem; color: var(--color-fg-muted)">${escapeHtml(it.description)}</div>` : ''}
          </div>
          <div style="display:flex;gap:0.3rem">
            <button type="button" class="studio-btn" data-load-id="${escapeHtml(it.id)}">📂 열기</button>
            <button type="button" class="studio-btn" data-dup-id="${escapeHtml(it.id)}" data-dup-title="${escapeHtml(it.title)}">🔀 복제</button>
          </div>
        </li>
      `)
      .join('');
    const onClick = async (e: Event) => {
      const target = e.target as HTMLElement;
      const loadBtn = target.closest<HTMLElement>('[data-load-id]');
      if (loadBtn) {
        const id = loadBtn.dataset.loadId ?? '';
        await loadAnimation(ui, id);
        ui.libraryDialog.close();
        ui.libraryList.removeEventListener('click', onClick);
        return;
      }
      const dupBtn = target.closest<HTMLElement>('[data-dup-id]');
      if (dupBtn) {
        const sourceId = dupBtn.dataset.dupId ?? '';
        const sourceTitle = dupBtn.dataset.dupTitle ?? '';
        ui.libraryDialog.close();
        ui.libraryList.removeEventListener('click', onClick);
        openDuplicateDialog(ui, sourceId, sourceTitle);
      }
    };
    ui.libraryList.addEventListener('click', onClick);
  } catch (err) {
    ui.libraryList.innerHTML = `<li class="studio-library-empty">에러: ${escapeHtml(err instanceof Error ? err.message : String(err))}</li>`;
  }
}

async function loadAnimation(ui: StudioUi, id: string): Promise<void> {
  try {
    setStatus(ui, '로딩…');
    const def = await api.loadAnimation(id);
    setDef(def);
    markClean();
    setStatus(ui, `로드 완료: ${def.id}`, 'ok');
  } catch (err) {
    setStatus(ui, '로드 실패: ' + (err instanceof Error ? err.message : String(err)), 'error');
  }
}

function setNewDialogTitle(text: string): void {
  const titleEl = document.getElementById('studio-new-dialog-title');
  if (titleEl) titleEl.textContent = text;
}

function openNewDialog(ui: StudioUi): void {
  ui.newIdInput.value = '';
  ui.newTitleInput.value = '';
  ui.newError.textContent = '';
  ui.newDialog.dataset.mode = 'create';
  delete ui.newDialog.dataset.sourceId;
  setNewDialogTitle('새 애니메이션 만들기');
  if (typeof ui.newDialog.showModal === 'function') ui.newDialog.showModal();
  else ui.newDialog.setAttribute('open', '');
}

function openDuplicateDialog(ui: StudioUi, sourceId: string, sourceTitle: string): void {
  ui.newIdInput.value = `${sourceId}-copy`;
  ui.newTitleInput.value = `${sourceTitle} (사본)`;
  ui.newError.textContent = '';
  ui.newDialog.dataset.mode = 'duplicate';
  ui.newDialog.dataset.sourceId = sourceId;
  setNewDialogTitle(`"${sourceId}" 복제`);
  if (typeof ui.newDialog.showModal === 'function') ui.newDialog.showModal();
  else ui.newDialog.setAttribute('open', '');
}

async function createNew(ui: StudioUi): Promise<void> {
  const id = ui.newIdInput.value.trim();
  const title = ui.newTitleInput.value.trim() || id;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
    ui.newError.textContent = 'ID 는 영문 소문자 / 숫자 / - / _ 만 가능';
    return;
  }
  const mode = ui.newDialog.dataset.mode ?? 'create';
  if (mode === 'draft-save') {
    await saveDraftWithId(ui, id, title);
    return;
  }
  if (mode === 'duplicate') {
    const sourceId = ui.newDialog.dataset.sourceId ?? '';
    try {
      const def = await api.duplicateAnimation(sourceId, id, title);
      setDef(def);
      markClean();
      ui.newDialog.close();
      delete ui.newDialog.dataset.sourceId;
      setStatus(ui, `복제 완료: ${def.id}`, 'ok');
    } catch (err) {
      ui.newError.textContent = err instanceof Error ? err.message : String(err);
    }
    return;
  }
  try {
    const def = await api.createAnimation(id, title);
    setDef(def);
    markClean();
    ui.newDialog.close();
    setStatus(ui, `새 애니메이션: ${id}`, 'ok');
  } catch (err) {
    ui.newError.textContent = err instanceof Error ? err.message : String(err);
  }
}

async function saveDraftWithId(ui: StudioUi, id: string, title: string): Promise<void> {
  const current = getDef();
  if (!current) return;
  try {
    const draftSnapshot = { ...current, id, title: title || id };
    await api.createAnimation(id, title || id);
    const saved = await api.saveAnimation(draftSnapshot);
    setDef(saved);
    promoteDraftToSaved();
    markClean();
    ui.newDialog.removeAttribute('data-mode');
    ui.newDialog.close();
    setStatus(ui, `Draft 저장 완료: ${id}`, 'ok');
  } catch (err) {
    ui.newError.textContent = '저장 실패: ' + (err instanceof Error ? err.message : String(err));
  }
}

async function saveCurrent(ui: StudioUi): Promise<void> {
  const def = getDef();
  if (!def) return;
  if (isDraft()) {
    promptDraftSave(ui);
    return;
  }
  if (!def.title || def.title.trim().length === 0) {
    updateMeta({ title: def.id });
    setStatus(ui, `제목이 비어 있어 ID(${def.id})를 사용합니다`, 'warn');
  }
  const current = getDef();
  if (!current) return;
  try {
    setStatus(ui, '저장 중…');
    const saved = await api.saveAnimation(current);
    setDef(saved);
    markClean();
    setStatus(ui, `저장됨 (${new Date().toLocaleTimeString('ko-KR')})`, 'ok');
  } catch (err) {
    setStatus(ui, '저장 실패: ' + (err instanceof Error ? err.message : String(err)), 'error');
  }
}

function promptDraftSave(ui: StudioUi): void {
  ui.newIdInput.value = '';
  ui.newTitleInput.value = '';
  ui.newError.textContent = '먼저 ID와 제목을 정해주세요 (현재 작업은 보존됩니다)';
  ui.newDialog.dataset.mode = 'draft-save';
  if (typeof ui.newDialog.showModal === 'function') ui.newDialog.showModal();
  else ui.newDialog.setAttribute('open', '');
}

async function deleteCurrent(ui: StudioUi): Promise<void> {
  const def = getDef();
  if (!def) return;
  if (!confirm(`"${def.id}" 을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
  try {
    await api.deleteAnimation(def.id);
    setDef(null);
    setStatus(ui, '삭제됨', 'ok');
  } catch (err) {
    setStatus(ui, '삭제 실패: ' + (err instanceof Error ? err.message : String(err)), 'error');
  }
}

function togglePlay(ui: StudioUi): void {
  const def = getDef();
  if (!def) return;
  if (playState === 'playing') {
    stopPreview(ui);
  } else {
    showPreview(def);
    playState = 'playing';
    ui.playBtn.textContent = '⏹ Stop';
  }
}

function stopPreview(ui: StudioUi): void {
  hidePreview();
  playState = 'idle';
  ui.playBtn.textContent = '▶ Play';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
