import { animationDefSchema } from '../../animations/schema';
import {
  getDef,
  isDraft,
  markClean,
  promoteDraftToSaved,
  setDef,
  setDraft,
  updateMeta,
} from './state';
import * as api from './api';
import { setStatus, type StudioUi } from './studio-ui';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function startDraft(): void {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const id = `draft-${stamp}`;
  const def = animationDefSchema.parse({ id, title: '', description: '' });
  setDraft(def);
}

export async function openLibrary(ui: StudioUi): Promise<void> {
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

export async function loadAnimation(ui: StudioUi, id: string): Promise<void> {
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

export function openNewDialog(ui: StudioUi): void {
  ui.newIdInput.value = '';
  ui.newTitleInput.value = '';
  ui.newError.textContent = '';
  ui.newDialog.dataset.mode = 'create';
  delete ui.newDialog.dataset.sourceId;
  setNewDialogTitle('새 애니메이션 만들기');
  if (typeof ui.newDialog.showModal === 'function') ui.newDialog.showModal();
  else ui.newDialog.setAttribute('open', '');
}

export function openDuplicateDialog(ui: StudioUi, sourceId: string, sourceTitle: string): void {
  ui.newIdInput.value = `${sourceId}-copy`;
  ui.newTitleInput.value = `${sourceTitle} (사본)`;
  ui.newError.textContent = '';
  ui.newDialog.dataset.mode = 'duplicate';
  ui.newDialog.dataset.sourceId = sourceId;
  setNewDialogTitle(`"${sourceId}" 복제`);
  if (typeof ui.newDialog.showModal === 'function') ui.newDialog.showModal();
  else ui.newDialog.setAttribute('open', '');
}

export async function createNew(ui: StudioUi): Promise<void> {
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

export async function saveCurrent(ui: StudioUi): Promise<void> {
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

export async function deleteCurrent(ui: StudioUi): Promise<void> {
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
