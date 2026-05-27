import { listAssets, deleteAsset, subscribeAssets, instantiateAsset, saveAsset, type AssetDef } from './assets';
import { addElement, getDef, getSelection, getSelectedElementIds, setSelection, uniqueElementId } from './state';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CATEGORY_LABEL: Record<AssetDef['category'], string> = {
  queue: '🔄 큐',
  stack: '📚 스택',
  array: '📊 배열',
  graph: '🕸 그래프',
  tree: '🌳 트리',
  custom: '⭐ 사용자',
};

export class AssetLibraryDialog {
  static instance: AssetLibraryDialog | null = null;
  static mount(): AssetLibraryDialog | null {
    if (AssetLibraryDialog.instance) return AssetLibraryDialog.instance;
    if (typeof document === 'undefined') return null;
    AssetLibraryDialog.instance = new AssetLibraryDialog();
    return AssetLibraryDialog.instance;
  }

  private dialog: HTMLDialogElement;
  private list: HTMLElement;
  private searchInput: HTMLInputElement;

  constructor() {
    const root = document.createElement('div');
    root.innerHTML = `
      <dialog id="studio-asset-dialog" class="studio-dialog">
        <div class="studio-dialog-header">
          <h2>📦 자산 라이브러리</h2>
          <button type="button" class="studio-dialog-close" aria-label="닫기" data-asset-close>✕</button>
        </div>
        <div class="studio-dialog-body">
          <input
            type="search"
            id="studio-asset-search"
            class="studio-asset-search"
            placeholder="이름 / 카테고리 검색…"
            autocomplete="off"
            aria-label="자산 검색"
          />
          <p class="studio-asset-hint">자산을 클릭하면 캔버스 가운데에 삽입됩니다. 다중 선택 후 props 패널의 [자산으로 저장] 버튼으로 새 자산을 추가할 수 있습니다.</p>
          <ul id="studio-asset-list" class="studio-asset-list"></ul>
        </div>
      </dialog>
    `;
    document.body.appendChild(root.firstElementChild!);
    this.dialog = document.getElementById('studio-asset-dialog') as HTMLDialogElement;
    this.list = document.getElementById('studio-asset-list') as HTMLElement;
    this.searchInput = document.getElementById('studio-asset-search') as HTMLInputElement;
    this.bind();
    subscribeAssets(() => this.render());
    this.render();
  }

  open(): void {
    this.searchInput.value = '';
    this.render();
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
    setTimeout(() => this.searchInput.focus(), 0);
  }

  close(): void {
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else this.dialog.removeAttribute('open');
  }

  private bind(): void {
    this.dialog.querySelector('[data-asset-close]')?.addEventListener('click', () => this.close());
    this.searchInput.addEventListener('input', () => this.render());
    this.list.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const deleteBtn = target.closest<HTMLElement>('[data-asset-delete]');
      if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.assetDelete ?? '';
        if (confirm('이 자산을 삭제할까요?')) deleteAsset(id);
        return;
      }
      const item = target.closest<HTMLElement>('[data-asset-id]');
      if (!item) return;
      const id = item.dataset.assetId ?? '';
      const asset = listAssets().find((a) => a.id === id);
      if (!asset) return;
      this.insertAsset(asset);
      this.close();
    });
  }

  private render(): void {
    const q = this.searchInput.value.trim().toLowerCase();
    const all = listAssets();
    const filtered = q
      ? all.filter((a) => a.name.toLowerCase().includes(q) || a.category.includes(q) || (a.description ?? '').toLowerCase().includes(q))
      : all;
    if (filtered.length === 0) {
      this.list.innerHTML = '<li class="studio-asset-empty">결과 없음</li>';
      return;
    }
    this.list.innerHTML = filtered
      .map((a) => `<li class="studio-asset-item" data-asset-id="${escapeHtml(a.id)}">
        <div class="studio-asset-item-main">
          <div class="studio-asset-item-name">${escapeHtml(a.name)}</div>
          <div class="studio-asset-item-meta">${CATEGORY_LABEL[a.category] ?? a.category} · ${a.elements.length} elements${a.builtin ? ' · built-in' : ''}</div>
          ${a.description ? `<div class="studio-asset-item-desc">${escapeHtml(a.description)}</div>` : ''}
        </div>
        <div class="studio-asset-item-actions">
          <button type="button" class="studio-btn">＋ 삽입</button>
          ${!a.builtin ? `<button type="button" class="studio-btn studio-btn-danger" data-asset-delete="${escapeHtml(a.id)}" aria-label="삭제">🗑</button>` : ''}
        </div>
      </li>`)
      .join('');
  }

  private insertAsset(asset: AssetDef): void {
    const def = getDef();
    if (!def) return;
    const cx = def.canvas.width / 2;
    const cy = def.canvas.height / 2;
    const box = bboxOfAsset(asset);
    const offsetX = cx - box.w / 2;
    const offsetY = cy - box.h / 2;
    const elements = instantiateAsset(asset, offsetX, offsetY, uniqueElementId);
    for (const el of elements) addElement(el);
    const ids = elements.map((e) => e.id);
    if (ids.length === 1) setSelection({ kind: 'element', elementId: ids[0] });
    else if (ids.length > 1) setSelection({ kind: 'elements', elementIds: ids });
  }
}

function bboxOfAsset(asset: AssetDef): { w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of asset.elements) {
    let ex = 0, ey = 0, ew = 0, eh = 0;
    if (el.type === 'rect' || el.type === 'image') {
      ex = el.x; ey = el.y; ew = el.width; eh = el.height;
    } else if (el.type === 'text') {
      ex = el.x - 50; ey = el.y - 12; ew = 100; eh = 24;
    } else if (el.type === 'circle') {
      ex = el.cx - el.r; ey = el.cy - el.r; ew = el.r * 2; eh = el.r * 2;
    } else if (el.type === 'line' || el.type === 'arrow') {
      const x1 = el.x1 ?? 0, y1 = el.y1 ?? 0, x2 = el.x2 ?? 0, y2 = el.y2 ?? 0;
      ex = Math.min(x1, x2); ey = Math.min(y1, y2); ew = Math.abs(x2 - x1); eh = Math.abs(y2 - y1);
    } else if (el.type === 'polygon') {
      const pts = el.points.trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const xs = pts.map((p) => p[0]).filter(Number.isFinite);
      const ys = pts.map((p) => p[1]).filter(Number.isFinite);
      if (xs.length === 0) continue;
      ex = Math.min(...xs); ey = Math.min(...ys); ew = Math.max(...xs) - ex; eh = Math.max(...ys) - ey;
    } else if (el.type === 'path') {
      ex = el.x ?? 0; ey = el.y ?? 0; ew = 80; eh = 80;
    }
    minX = Math.min(minX, ex);
    minY = Math.min(minY, ey);
    maxX = Math.max(maxX, ex + ew);
    maxY = Math.max(maxY, ey + eh);
  }
  if (!Number.isFinite(minX)) return { w: 0, h: 0 };
  return { w: maxX - minX, h: maxY - minY };
}

export function saveSelectionAsAsset(): void {
  const sel = getSelection();
  const ids = getSelectedElementIds(sel);
  if (ids.length === 0) return;
  const def = getDef();
  if (!def) return;
  const elements = ids
    .map((id) => def.elements.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e);
  if (elements.length === 0) return;
  const name = prompt('자산 이름:', `Asset ${new Date().toISOString().slice(0, 10)}`);
  if (!name) return;
  saveAsset(name, elements);
}
