import {
  listAssets,
  deleteAsset,
  subscribeAssets,
  instantiateAsset,
  saveAsset,
  type AssetDef,
  type AssetParam,
} from './assets';
import {
  addElement,
  getDef,
  getSelection,
  getSelectedElementIds,
  setSelection,
  uniqueElementId,
} from './state';

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
  private paramArea: HTMLElement;
  private activeAssetId: string | null = null;

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
          <p class="studio-asset-hint">자산 선택 → 파라미터 조정 → [삽입] 으로 캔버스에 추가.</p>
          <div class="studio-asset-split">
            <ul id="studio-asset-list" class="studio-asset-list"></ul>
            <div id="studio-asset-params" class="studio-asset-params">
              <p class="studio-asset-empty">왼쪽에서 자산을 선택하세요</p>
            </div>
          </div>
        </div>
      </dialog>
    `;
    document.body.appendChild(root.firstElementChild!);
    this.dialog = document.getElementById('studio-asset-dialog') as HTMLDialogElement;
    this.list = document.getElementById('studio-asset-list') as HTMLElement;
    this.searchInput = document.getElementById('studio-asset-search') as HTMLInputElement;
    this.paramArea = document.getElementById('studio-asset-params') as HTMLElement;
    this.bind();
    subscribeAssets(() => this.renderList());
    this.renderList();
  }

  open(): void {
    this.searchInput.value = '';
    this.activeAssetId = null;
    this.renderList();
    this.renderParams();
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
    this.searchInput.addEventListener('input', () => this.renderList());
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
      this.activeAssetId = item.dataset.assetId ?? null;
      this.renderList();
      this.renderParams();
    });
    this.paramArea.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-asset-insert]')) this.insertActive();
    });
  }

  private renderList(): void {
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
      .map((a) => `<li class="studio-asset-item ${a.id === this.activeAssetId ? 'is-active' : ''}" data-asset-id="${escapeHtml(a.id)}">
        <div class="studio-asset-item-main">
          <div class="studio-asset-item-name">${escapeHtml(a.name)}</div>
          <div class="studio-asset-item-meta">${CATEGORY_LABEL[a.category] ?? a.category}${a.builtin ? ' · 동적' : ` · ${a.elements.length} elements`}</div>
        </div>
        ${a.builtin ? '' : `<button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-asset-delete="${escapeHtml(a.id)}" aria-label="삭제">🗑</button>`}
      </li>`)
      .join('');
  }

  private renderParams(): void {
    if (!this.activeAssetId) {
      this.paramArea.innerHTML = '<p class="studio-asset-empty">왼쪽에서 자산을 선택하세요</p>';
      return;
    }
    const asset = listAssets().find((a) => a.id === this.activeAssetId);
    if (!asset) {
      this.paramArea.innerHTML = '<p class="studio-asset-empty">자산을 찾을 수 없음</p>';
      return;
    }
    if (!asset.builtin) {
      this.paramArea.innerHTML = `
        <h3 class="studio-asset-params-title">${escapeHtml(asset.name)}</h3>
        ${asset.description ? `<p class="studio-asset-item-desc">${escapeHtml(asset.description)}</p>` : ''}
        <p class="studio-asset-empty">정적 자산 (${asset.elements.length} elements)</p>
        <button type="button" class="studio-btn studio-btn-primary" data-asset-insert>＋ 캔버스에 삽입</button>
      `;
      return;
    }
    const fields = asset.params.map((p) => this.renderParamField(p)).join('');
    this.paramArea.innerHTML = `
      <h3 class="studio-asset-params-title">${escapeHtml(asset.name)}</h3>
      ${asset.description ? `<p class="studio-asset-item-desc">${escapeHtml(asset.description)}</p>` : ''}
      <div class="studio-asset-params-form">${fields}</div>
      <button type="button" class="studio-btn studio-btn-primary" data-asset-insert>＋ 캔버스에 삽입</button>
    `;
  }

  private renderParamField(p: AssetParam): string {
    const fieldId = `studio-asset-param-${escapeHtml(p.name)}`;
    const defaultVal = p.default;
    if (p.type === 'number') {
      const minAttr = p.min !== undefined ? ` min="${p.min}"` : '';
      const maxAttr = p.max !== undefined ? ` max="${p.max}"` : '';
      return `<label class="studio-field">
        <span>${escapeHtml(p.label)}</span>
        <input type="number" id="${fieldId}" data-param-name="${escapeHtml(p.name)}" value="${defaultVal as number}"${minAttr}${maxAttr} />
      </label>`;
    }
    if (p.type === 'string-array') {
      const placeholder = p.placeholder ?? '쉼표 구분 (예: A, B, C)';
      return `<label class="studio-field">
        <span>${escapeHtml(p.label)}</span>
        <input type="text" id="${fieldId}" data-param-name="${escapeHtml(p.name)}" value="${escapeHtml(String(defaultVal ?? ''))}" placeholder="${escapeHtml(placeholder)}" />
      </label>`;
    }
    return `<label class="studio-field">
      <span>${escapeHtml(p.label)}</span>
      <input type="text" id="${fieldId}" data-param-name="${escapeHtml(p.name)}" value="${escapeHtml(String(defaultVal ?? ''))}" ${p.placeholder ? `placeholder="${escapeHtml(p.placeholder)}"` : ''} />
    </label>`;
  }

  private collectParams(asset: AssetDef): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!asset.builtin) return out;
    for (const p of asset.params) {
      const input = this.paramArea.querySelector<HTMLInputElement>(`[data-param-name="${CSS.escape(p.name)}"]`);
      if (!input) {
        out[p.name] = p.default;
        continue;
      }
      if (p.type === 'number') out[p.name] = Number(input.value);
      else out[p.name] = input.value;
    }
    return out;
  }

  private insertActive(): void {
    if (!this.activeAssetId) return;
    const asset = listAssets().find((a) => a.id === this.activeAssetId);
    if (!asset) return;
    const def = getDef();
    if (!def) return;
    const params = this.collectParams(asset);
    const cx = def.canvas.width / 2;
    const cy = def.canvas.height / 2;
    const elements = instantiateAsset(asset, params, cx - 200, cy - 100, uniqueElementId);
    for (const el of elements) addElement(el);
    const ids = elements.map((e) => e.id);
    if (ids.length === 1) setSelection({ kind: 'element', elementId: ids[0] });
    else if (ids.length > 1) setSelection({ kind: 'elements', elementIds: ids });
    this.close();
  }
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
