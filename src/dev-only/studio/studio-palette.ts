import { getDef, setSelection } from './state';
import { friendlyElementLabel } from './element-list';

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

type Entry =
  | { kind: 'element'; id: string; label: string; type: string; rawId: string }
  | { kind: 'command'; id: string; label: string; hint?: string; run: () => void };

let dialogEl: HTMLDialogElement | null = null;
let inputEl: HTMLInputElement | null = null;
let listEl: HTMLUListElement | null = null;
let commands: PaletteCommand[] = [];
let currentEntries: Entry[] = [];
let activeIndex = 0;
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function registerCommands(cmds: PaletteCommand[]): void {
  commands = cmds;
}

export function initPalette(): void {
  dialogEl = document.getElementById('studio-palette-dialog') as HTMLDialogElement | null;
  inputEl = document.getElementById('studio-palette-input') as HTMLInputElement | null;
  listEl = document.getElementById('studio-palette-list') as HTMLUListElement | null;
  if (!dialogEl || !inputEl || !listEl) return;
  inputEl.addEventListener('input', renderList);
  inputEl.addEventListener('keydown', onKeydown);
  listEl.addEventListener('click', onListClick);
  dialogEl.addEventListener('close', () => {
    if (inputEl) inputEl.value = '';
    activeIndex = 0;
  });
}

export function openPalette(): void {
  if (!dialogEl) return;
  if (typeof dialogEl.showModal === 'function') dialogEl.showModal();
  else dialogEl.setAttribute('open', '');
  activeIndex = 0;
  if (inputEl) {
    inputEl.value = '';
    setTimeout(() => inputEl?.focus(), 0);
  }
  renderList();
}

function gatherEntries(query: string): Entry[] {
  const q = query.trim().toLowerCase();
  const entries: Entry[] = [];
  for (const c of commands) {
    entries.push({ kind: 'command', id: c.id, label: c.label, hint: c.hint, run: c.run });
  }
  const def = getDef();
  if (def) {
    for (const el of def.elements) {
      entries.push({
        kind: 'element',
        id: `el-${el.id}`,
        label: friendlyElementLabel(el),
        type: el.type,
        rawId: el.id,
      });
    }
  }
  if (!q) return entries;
  return entries.filter((e) => {
    const hay = e.kind === 'element'
      ? `${e.label} ${e.type} ${e.rawId}`.toLowerCase()
      : `${e.label} ${e.hint ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderList(): void {
  if (!listEl || !inputEl) return;
  currentEntries = gatherEntries(inputEl.value);
  if (activeIndex >= currentEntries.length) activeIndex = Math.max(0, currentEntries.length - 1);
  if (currentEntries.length === 0) {
    listEl.innerHTML = '<li class="studio-palette-empty">결과 없음</li>';
    return;
  }
  listEl.innerHTML = currentEntries.map((e, i) => {
    const isActive = i === activeIndex;
    if (e.kind === 'command') {
      return `<li class="studio-palette-item ${isActive ? 'is-active' : ''}" data-idx="${i}">
        <span class="studio-palette-icon">⚡</span>
        <span class="studio-palette-label">${escapeHtml(e.label)}</span>
        ${e.hint ? `<span class="studio-palette-hint">${escapeHtml(e.hint)}</span>` : ''}
      </li>`;
    }
    return `<li class="studio-palette-item ${isActive ? 'is-active' : ''}" data-idx="${i}">
      <span class="studio-palette-icon">📐</span>
      <span class="studio-palette-label">${escapeHtml(e.label)}</span>
      <span class="studio-palette-hint">${escapeHtml(e.type)} · ${escapeHtml(e.rawId)}</span>
    </li>`;
  }).join('');
}

function activate(entry: Entry): void {
  if (entry.kind === 'command') {
    entry.run();
  } else {
    setSelection({ kind: 'element', elementId: entry.rawId });
  }
  dialogEl?.close();
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, currentEntries.length - 1);
    renderList();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    renderList();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const entry = currentEntries[activeIndex];
    if (entry) activate(entry);
  }
}

function onListClick(e: Event): void {
  const item = (e.target as HTMLElement).closest<HTMLElement>('[data-idx]');
  if (!item) return;
  const idx = Number(item.dataset.idx);
  const entry = currentEntries[idx];
  if (entry) activate(entry);
}
