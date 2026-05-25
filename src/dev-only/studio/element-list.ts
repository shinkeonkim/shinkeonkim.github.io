import {
  getDef,
  getSelection,
  setSelection,
  deleteElement,
  subscribe,
  addElement,
  uniqueElementId,
  reorderElement,
} from './state';
import type { AnimationElement } from '../../animations/schema';

let listEl: HTMLElement | null = null;
let toolsRootEl: HTMLElement | null = null;
let dragSourceId: string | null = null;

export function initElementList(root: HTMLElement, toolsRoot: HTMLElement | null): void {
  listEl = root;
  toolsRootEl = toolsRoot;
  subscribe(render);
  root.addEventListener('click', onClick);
  root.addEventListener('dragstart', onDragStart);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);
  root.addEventListener('dragend', onDragEnd);
  toolsRootEl?.addEventListener('click', onToolsClick);
  render();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render(): void {
  if (!listEl) return;
  const def = getDef();
  if (!def || def.elements.length === 0) {
    listEl.innerHTML = '<li style="color: var(--color-fg-muted); padding: 0.4rem;">요소가 없습니다.</li>';
    return;
  }
  const sel = getSelection();
  const items = [...def.elements].reverse();
  listEl.innerHTML =
    `<div class="studio-element-list-hint">위 = 앞쪽 (z-index ↑)</div>` +
    items
      .map((el) => {
        const isSel = sel.kind === 'element' && sel.elementId === el.id;
        return `<li class="studio-element-list-item ${isSel ? 'is-selected' : ''}" data-elem-id="${escapeHtml(el.id)}" draggable="true">
          <span class="studio-element-grip" aria-hidden="true">⋮⋮</span>
          <span class="studio-element-list-item-label">${escapeHtml(el.id)} <span class="studio-element-list-item-type">${escapeHtml(el.type)}</span></span>
          <button type="button" class="studio-element-list-delete" data-delete title="삭제">✕</button>
        </li>`;
      })
      .join('');
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
  const li = target.closest<HTMLElement>('.studio-element-list-item');
  if (!li) return;
  const id = li.dataset.elemId ?? '';
  if (target.closest('[data-delete]')) {
    deleteElement(id);
    return;
  }
  setSelection({ kind: 'element', elementId: id });
}

function onDragStart(e: DragEvent): void {
  const li = (e.target as HTMLElement).closest<HTMLElement>('.studio-element-list-item');
  if (!li) return;
  dragSourceId = li.dataset.elemId ?? null;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSourceId ?? '');
  }
  li.classList.add('is-dragging');
}

function onDragOver(e: DragEvent): void {
  if (!dragSourceId) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  const li = (e.target as HTMLElement).closest<HTMLElement>('.studio-element-list-item');
  listEl?.querySelectorAll('.is-drop-above, .is-drop-below').forEach((n) => n.classList.remove('is-drop-above', 'is-drop-below'));
  if (!li) return;
  const rect = li.getBoundingClientRect();
  const upper = e.clientY < rect.top + rect.height / 2;
  li.classList.add(upper ? 'is-drop-above' : 'is-drop-below');
}

function onDragLeave(e: DragEvent): void {
  const li = (e.target as HTMLElement).closest<HTMLElement>('.studio-element-list-item');
  li?.classList.remove('is-drop-above', 'is-drop-below');
}

function onDrop(e: DragEvent): void {
  if (!dragSourceId) return;
  e.preventDefault();
  const li = (e.target as HTMLElement).closest<HTMLElement>('.studio-element-list-item');
  if (!li) return;
  const targetId = li.dataset.elemId ?? '';
  if (!targetId || targetId === dragSourceId) return;
  const rect = li.getBoundingClientRect();
  const upper = e.clientY < rect.top + rect.height / 2;
  const positionInVisualList: 'before' | 'after' = upper ? 'before' : 'after';
  const positionInDefArray: 'before' | 'after' = positionInVisualList === 'before' ? 'after' : 'before';
  reorderElement(dragSourceId, targetId, positionInDefArray);
  dragSourceId = null;
}

function onDragEnd(): void {
  dragSourceId = null;
  listEl?.querySelectorAll('.is-drop-above, .is-drop-below, .is-dragging').forEach((n) => n.classList.remove('is-drop-above', 'is-drop-below', 'is-dragging'));
}

function onToolsClick(e: Event): void {
  const target = e.target as HTMLElement;
  const btn = target.closest<HTMLElement>('[data-add-element]');
  if (!btn) return;
  const type = btn.dataset.addElement;
  if (!type) return;
  const def = getDef();
  if (!def) return;
  const cx = def.canvas.width / 2;
  const cy = def.canvas.height / 2;
  const id = uniqueElementId(type);
  const elem = makeDefaultElement(type, id, cx, cy);
  if (elem) addElement(elem);
}

function makeDefaultElement(type: string, id: string, cx: number, cy: number): AnimationElement | null {
  switch (type) {
    case 'rect':
      return { type: 'rect', id, rotation: 0, x: cx - 60, y: cy - 30, width: 120, height: 60, fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 1.5, cornerRadius: 8, label: id, labelColor: '#0b0b0f', labelSize: 14 };
    case 'circle':
      return { type: 'circle', id, rotation: 0, cx, cy, r: 36, fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 1.5, label: id, labelColor: '#0b0b0f', labelSize: 14 };
    case 'line':
      return { type: 'line', id, rotation: 0, x1: cx - 80, y1: cy, x2: cx + 80, y2: cy, stroke: '#6366f1', strokeWidth: 2 };
    case 'arrow':
      return { type: 'arrow', id, rotation: 0, x1: cx - 100, y1: cy, x2: cx + 100, y2: cy, stroke: '#6366f1', strokeWidth: 2, curvature: 0, labelColor: '#0b0b0f' };
    case 'text':
      return { type: 'text', id, rotation: 0, x: cx, y: cy, content: id, fontSize: 18, fontWeight: 400, color: '#18181b', textAnchor: 'middle' };
    case 'image':
      return { type: 'image', id, rotation: 0, x: cx - 50, y: cy - 50, width: 100, height: 100, src: '/uploads/placeholder.png', preserveAspectRatio: 'xMidYMid meet', opacity: 1 };
    case 'path':
      return {
        type: 'path', id, rotation: 0, x: cx - 40, y: cy - 40,
        d: 'M 0 0 L 80 0 L 40 80 Z',
        fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 2, opacity: 1,
      };
    case 'polygon': {
      const r = 40;
      const sides = 6;
      const pts = Array.from({ length: sides }, (_, i) => {
        const a = (i * Math.PI * 2) / sides - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      return { type: 'polygon', id, rotation: 0, points: pts, fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 1.5, opacity: 1 };
    }
    default:
      return null;
  }
}
