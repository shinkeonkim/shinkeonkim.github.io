import {
  getHistory,
  jumpBack,
  jumpForward,
  subscribe,
  type HistoryEntry,
  type HistoryKind,
} from './state';

const KIND_ICON: Record<HistoryKind, string> = {
  meta: '✎',
  canvas: '⬚',
  settings: '⚙',
  add: '＋',
  delete: '🗑',
  move: '↔',
  style: '🎨',
  rotate: '↻',
  resize: '⤡',
  reorder: '⇅',
  track: '⌒',
  appearance: '◐',
  chapter: '📍',
  effect: '✨',
  group: '⬚',
  other: '·',
};

let dialogEl: HTMLDialogElement | null = null;
let listEl: HTMLUListElement | null = null;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTimeAgo(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 5) return '방금';
  if (secs < 60) return `${secs}초 전`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.round(mins / 60);
  return `${hours}시간 전`;
}

export function initHistoryPanel(): void {
  dialogEl = document.getElementById('studio-history-dialog') as HTMLDialogElement | null;
  listEl = document.getElementById('studio-history-list') as HTMLUListElement | null;
  if (!dialogEl || !listEl) return;
  listEl.addEventListener('click', onListClick);
  subscribe(() => {
    if (dialogEl?.open) renderList();
  });
}

export function openHistoryPanel(): void {
  if (!dialogEl) return;
  renderList();
  if (typeof dialogEl.showModal === 'function') dialogEl.showModal();
  else dialogEl.setAttribute('open', '');
}

function renderList(): void {
  if (!listEl) return;
  const { past, future } = getHistory();
  if (past.length === 0 && future.length === 0) {
    listEl.innerHTML = '<li class="studio-history-empty">아직 이력이 없습니다</li>';
    return;
  }
  const pastReversed = [...past].slice().reverse();
  const items: string[] = [];
  for (let i = 0; i < future.length; i += 1) {
    const entry = future[future.length - 1 - i];
    items.push(renderEntry(entry, 'future', i + 1));
  }
  items.push('<li class="studio-history-current">현재 위치</li>');
  for (let i = 0; i < pastReversed.length; i += 1) {
    const entry = pastReversed[i];
    items.push(renderEntry(entry, 'past', i + 1));
  }
  listEl.innerHTML = items.join('');
}

function renderEntry(entry: HistoryEntry, side: 'past' | 'future', stepCount: number): string {
  const icon = KIND_ICON[entry.kind] ?? '·';
  return `<li class="studio-history-item studio-history-item-${side}" data-side="${side}" data-steps="${stepCount}">
    <span class="studio-history-icon" aria-hidden="true">${icon}</span>
    <span class="studio-history-label">${escapeHtml(entry.label)}</span>
    <span class="studio-history-time">${escapeHtml(formatTimeAgo(entry.timestamp))}</span>
  </li>`;
}

function onListClick(e: Event): void {
  const item = (e.target as HTMLElement).closest<HTMLElement>('[data-side]');
  if (!item) return;
  const side = item.dataset.side as 'past' | 'future';
  const steps = Number(item.dataset.steps);
  if (!Number.isFinite(steps) || steps <= 0) return;
  if (side === 'past') jumpBack(steps);
  else jumpForward(steps);
  if (dialogEl?.open) renderList();
}
