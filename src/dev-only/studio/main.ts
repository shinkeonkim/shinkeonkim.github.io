import {
  getDef,
  isDirty,
  markClean,
  setDef,
  subscribe,
  updateMeta,
  undo,
  redo,
} from './state';
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

  if (
    !titleInput || !idDisplay || !status || !saveBtn || !deleteBtn || !newBtn || !openBtn ||
    !playBtn || !restartBtn || !speedInput || !speedValue || !canvas || !elementList || !toolsRoot ||
    !propsRoot || !timelineTracks || !elementTracks || !addStepBtn || !libraryDialog || !libraryList || !newDialog ||
    !newIdInput || !newTitleInput || !newCreateBtn || !newError
  ) {
    return null;
  }

  return {
    app, titleInput, idDisplay, status, saveBtn, deleteBtn, newBtn, openBtn,
    playBtn, restartBtn, speedInput, speedValue, canvas, elementList, toolsRoot,
    propsRoot, timelineTracks, elementTracks, addStepBtn, libraryDialog, libraryList, newDialog,
    newIdInput, newTitleInput, newCreateBtn, newError,
  };
}

let playState: 'idle' | 'playing' = 'idle';

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
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    const inText =
      e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
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
    return;
  }
  if (document.activeElement !== ui.titleInput) {
    ui.titleInput.value = def.title;
  }
  ui.titleInput.disabled = false;
  ui.idDisplay.textContent = def.id;
  ui.saveBtn.disabled = false;
  ui.deleteBtn.disabled = false;
  if (isDirty()) {
    setStatus(ui, '저장되지 않은 변경 사항', 'warn');
  }
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
  try {
    setStatus(ui, '저장 중…');
    const saved = await api.saveAnimation(def);
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
