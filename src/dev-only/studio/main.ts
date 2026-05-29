import {
  canRedo,
  canUndo,
  getDef,
  getSelection,
  getSelectedElementIds,
  isDirty,
  isDraft,
  setDef,
  setSelection,
  updateElementBase,
  subscribe,
  updateMeta,
  undo,
  redo,
  deleteElement,
  deleteChapter,
  updateChapter,
  addChapter,
  deleteEffect,
  uniqueChapterId,
  getCurrentTime,
  setCurrentTime,
  reorderElement,
  moveElementToEnd,
  moveElementToFront,
} from './state';
import { initCanvas, showPreview, hidePreview } from './canvas';
import { initElementList } from './element-list';
import { initProperties } from './properties';
import { initTimeline } from './timeline';
import { IconLibraryDialog } from './icon-library';
import { AssetLibraryDialog, saveSelectionAsAsset } from './asset-library';
import { initGrid, isGridEnabled, setGridEnabled, getGridSize, subscribeGrid } from './grid';
import { updateCanvas } from './state';
import {
  copySelection,
  pasteFromClipboard,
  moveSelectedElement,
  duplicateSelection,
} from './studio-clipboard';
import {
  uploadAndInsertImage,
  setupImageDropAndPaste,
  type ImageUploadHost,
} from './studio-image-upload';
import { setStatus, type StudioUi } from './studio-ui';
import {
  startDraft,
  openLibrary,
  openNewDialog,
  createNew,
  saveCurrent,
  deleteCurrent,
} from './studio-save-load';
import { initPalette, openPalette, registerCommands } from './studio-palette';
import { groupElements, ungroupElement, isGroup } from './studio-groups';

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

function reflectGridUi(ui: StudioUi): void {
  const on = isGridEnabled();
  const size = getGridSize();
  ui.gridToggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  ui.gridToggleBtn.classList.toggle('is-active', on);
  ui.gridToggleBtn.title = on ? `격자 켬 (${size}px) — G 로 끔` : '격자 켜기 (G)';
  document.body.classList.toggle('studio-grid-on', on);
  ui.app.style.setProperty('--studio-grid-size', `${size}px`);
  const label = document.getElementById('studio-grid-label');
  if (label) label.textContent = on ? `격자 ${size}px` : '격자 끔';
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

declare global {
  interface Window {
    __studio__?: {
      setDef: typeof setDef;
      setSelection: typeof setSelection;
      getDef: typeof getDef;
      getSelection: typeof getSelection;
    };
  }
}

export function initStudio(): void {
  const ui = queryUi();
  if (!ui) {
    console.error('[studio] missing required elements');
    return;
  }
  if (import.meta.env.DEV) {
    window.__studio__ = { setDef, setSelection, getDef, getSelection };
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

  const imageHost: ImageUploadHost = {
    app: ui.app,
    setStatus: (text, kind) => setStatus(ui, text, kind),
  };
  ui.imageUploadBtn.addEventListener('click', () => ui.imageFileInput.click());
  ui.imageFileInput.addEventListener('change', () => {
    const file = ui.imageFileInput.files?.[0];
    if (file) void uploadAndInsertImage(file, imageHost);
    ui.imageFileInput.value = '';
  });

  const openHelp = (): void => {
    if (typeof ui.helpDialog.showModal === 'function') ui.helpDialog.showModal();
    else ui.helpDialog.setAttribute('open', '');
  };
  ui.helpBtn.addEventListener('click', openHelp);
  document.getElementById('studio-floating-help')?.addEventListener('click', openHelp);

  const HELP_HINT_KEY = 'studio.helpHintDismissed';
  const helpHint = document.getElementById('studio-help-hint');
  if (helpHint && !localStorage.getItem(HELP_HINT_KEY)) {
    helpHint.hidden = false;
    setTimeout(() => helpHint.classList.add('is-visible'), 200);
    const dismiss = (): void => {
      helpHint.classList.remove('is-visible');
      setTimeout(() => { helpHint.hidden = true; }, 300);
      localStorage.setItem(HELP_HINT_KEY, '1');
    };
    document.getElementById('studio-help-hint-close')?.addEventListener('click', dismiss);
    setTimeout(dismiss, 7000);
  }

  setupImageDropAndPaste(imageHost);
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

  setupCanvasPan(ui);

  ui.titleInput.addEventListener('input', () => {
    updateMeta({ title: ui.titleInput.value });
  });

  ui.openBtn.addEventListener('click', () => void openLibrary(ui));
  ui.newBtn.addEventListener('click', () => openNewDialog(ui));

  initPalette();
  registerCommands([
    { id: 'open', label: '📂 라이브러리 열기', hint: '저장된 애니메이션 목록', run: () => void openLibrary(ui) },
    { id: 'new', label: '🆕 새 애니메이션', hint: '빈 캔버스로 시작', run: () => openNewDialog(ui) },
    { id: 'save', label: '💾 저장', hint: '⌘S', run: () => void saveCurrent(ui) },
    { id: 'delete', label: '🗑 삭제', hint: '현재 애니메이션 삭제', run: () => void deleteCurrent(ui) },
    { id: 'undo', label: '↶ 실행 취소', hint: '⌘Z', run: () => undo() },
    { id: 'redo', label: '↷ 다시 실행', hint: '⌘⇧Z / ⌘Y', run: () => redo() },
    { id: 'play', label: '▶ 재생 토글', hint: '미리보기 시작/중지', run: () => togglePlay(ui) },
    { id: 'grid', label: '⊞ 격자 토글', hint: 'G', run: () => setGridEnabled(!isGridEnabled()) },
    { id: 'help', label: '⌨ 단축키 보기', hint: '? / Shift+/', run: openHelp },
  ]);
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
      const sel = getSelection();
      if (sel.kind === 'chapter' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const def = getDef();
        const ch = def?.chapters.find((c) => c.id === sel.chapterId);
        if (ch) {
          const step = e.shiftKey ? 1000 : 100;
          const dt = e.key === 'ArrowLeft' ? -step : step;
          updateChapter(sel.chapterId, { time: Math.max(0, ch.time + dt) });
          e.preventDefault();
        }
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (moveSelectedElement(dx, dy)) e.preventDefault();
      return;
    }

    if (!inText && !mod && e.key === 'Tab') {
      const sel = getSelection();
      if (sel.kind === 'chapter') {
        const def = getDef();
        if (def && def.chapters.length > 0) {
          const sorted = [...def.chapters].sort((a, b) => a.time - b.time);
          const idx = sorted.findIndex((c) => c.id === sel.chapterId);
          if (idx >= 0) {
            const dir = e.shiftKey ? -1 : 1;
            const nextIdx = (idx + dir + sorted.length) % sorted.length;
            setSelection({ kind: 'chapter', chapterId: sorted[nextIdx].id });
            e.preventDefault();
          }
        }
        return;
      }
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
    if (key === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }
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
      return;
    }
    if (key === 'd' && !inText) {
      if (duplicateSelection()) {
        e.preventDefault();
      }
      return;
    }
    if (key === 'g' && !inText) {
      const sel = getSelection();
      if (e.shiftKey) {
        if (sel.kind === 'element') {
          const def = getDef();
          const el = def?.elements.find((x) => x.id === sel.elementId);
          if (el && isGroup(el)) {
            ungroupElement(sel.elementId);
            e.preventDefault();
          }
        }
      } else if (sel.kind === 'elements' && sel.elementIds.length >= 2) {
        const newId = groupElements(sel.elementIds);
        if (newId) e.preventDefault();
      }
      return;
    }
    if ((e.code === 'BracketRight' || e.code === 'BracketLeft') && !inText) {
      const sel = getSelection();
      const ids = getSelectedElementIds(sel);
      if (ids.length === 0) return;
      const def = getDef();
      if (!def) return;
      e.preventDefault();
      const forward = e.code === 'BracketRight';
      for (const id of ids) {
        if (e.shiftKey) {
          if (forward) moveElementToEnd(id);
          else moveElementToFront(id);
        } else {
          const idx = def.elements.findIndex((x) => x.id === id);
          if (forward && idx < def.elements.length - 1) {
            reorderElement(id, def.elements[idx + 1].id, 'after');
          } else if (!forward && idx > 0) {
            reorderElement(id, def.elements[idx - 1].id, 'before');
          }
        }
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

function setupCanvasPan(ui: StudioUi): void {
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
