import {
  getDef,
  getSelection,
  isDirty,
  markClean,
  setDef,
  setSelection,
  subscribe,
  updateMeta,
  undo,
  redo,
  deleteElement,
  deleteStep,
  addElement,
  uniqueElementId,
} from './state';
import type { AnimationElement } from '../../animations/schema';
import { initCanvas, showPreview, hidePreview } from './canvas';
import { initElementList } from './element-list';
import { initProperties } from './properties';
import { initTimeline } from './timeline';
import { IconLibraryDialog } from './icon-library';
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

  if (
    !titleInput || !idDisplay || !status || !saveBtn || !deleteBtn || !newBtn || !openBtn ||
    !playBtn || !restartBtn || !speedInput || !speedValue || !canvas || !elementList || !toolsRoot ||
    !propsRoot || !timelineTracks || !elementTracks || !addStepBtn || !libraryDialog || !libraryList || !newDialog ||
    !newIdInput || !newTitleInput || !newCreateBtn || !newError ||
    !canvasWidthInput || !canvasHeightInput || !imageUploadBtn || !imageFileInput || !helpBtn || !helpDialog
  ) {
    return null;
  }

  return {
    app, titleInput, idDisplay, status, saveBtn, deleteBtn, newBtn, openBtn,
    playBtn, restartBtn, speedInput, speedValue, canvas, elementList, toolsRoot,
    propsRoot, timelineTracks, elementTracks, addStepBtn, libraryDialog, libraryList, newDialog,
    newIdInput, newTitleInput, newCreateBtn, newError,
    canvasWidthInput, canvasHeightInput, imageUploadBtn, imageFileInput, helpBtn, helpDialog,
  };
}

let playState: 'idle' | 'playing' = 'idle';
let clipboard: AnimationElement | null = null;

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
  if (sel.kind !== 'element') return false;
  const def = getDef();
  if (!def) return false;
  const el = def.elements.find((e) => e.id === sel.elementId);
  if (!el) return false;
  clipboard = JSON.parse(JSON.stringify(el));
  return true;
}

function pasteFromClipboard(): boolean {
  if (!clipboard) return false;
  const newId = uniqueElementId(clipboard.type);
  const shifted = shiftCloneCoords(clipboard, 20, 20);
  shifted.id = newId;
  addElement(shifted);
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

  initCanvas(ui.canvas);
  initElementList(ui.elementList, ui.toolsRoot);
  initProperties(ui.propsRoot);
  initTimeline(ui.timelineTracks, ui.addStepBtn, ui.elementTracks);

  const iconDialog = IconLibraryDialog.mount();
  document.getElementById('studio-open-icons')?.addEventListener('click', () => iconDialog?.open());

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

  subscribe(() => reflectState(ui));
  reflectState(ui);

  ui.titleInput.addEventListener('input', () => {
    updateMeta({ title: ui.titleInput.value });
  });

  ui.openBtn.addEventListener('click', () => void openLibrary(ui));
  ui.newBtn.addEventListener('click', () => openNewDialog(ui));
  ui.saveBtn.addEventListener('click', () => void saveCurrent(ui));
  ui.deleteBtn.addEventListener('click', () => void deleteCurrent(ui));
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
      if (sel.kind === 'element') {
        e.preventDefault();
        deleteElement(sel.elementId);
        setSelection({ kind: 'none' });
      } else if (sel.kind === 'step') {
        e.preventDefault();
        deleteStep(sel.stepId);
      }
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
          if (sel.kind === 'element') {
            deleteElement(sel.elementId);
            setSelection({ kind: 'none' });
          }
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

  setStatus(ui, '준비됨', 'ok');
}

function reflectState(ui: StudioUi): void {
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
  ui.idDisplay.textContent = def.id;
  ui.saveBtn.disabled = false;
  ui.deleteBtn.disabled = false;
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
      type: 'image', id, rotation: 0,
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
        const newId = prompt(`복제할 새 ID (영문 소문자 / 숫자 / - / _):`, `${sourceId}-copy`);
        if (!newId || !/^[a-z0-9][a-z0-9_-]*$/.test(newId)) return;
        const newTitle = prompt('새 제목:', `${sourceTitle} (사본)`) ?? newId;
        try {
          const def = await api.duplicateAnimation(sourceId, newId, newTitle);
          setStatus(ui, `복제 완료: ${def.id}`, 'ok');
          ui.libraryList.removeEventListener('click', onClick);
          await openLibrary(ui);
        } catch (err) {
          setStatus(ui, '복제 실패: ' + (err instanceof Error ? err.message : String(err)), 'error');
        }
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

function openNewDialog(ui: StudioUi): void {
  ui.newIdInput.value = '';
  ui.newTitleInput.value = '';
  ui.newError.textContent = '';
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

async function saveCurrent(ui: StudioUi): Promise<void> {
  const def = getDef();
  if (!def) return;
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
