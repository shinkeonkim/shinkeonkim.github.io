import type { ImageElement } from '@/entities/animation/engine/schema';
import { addElement, getDef, uniqueElementId } from './state';
import type { IconCategory, IconEntry } from './icon-library-types';
import { ICON_GROUPS, ICON_LIBRARY } from './icon-data';

export type { IconCategory, IconEntry } from './icon-library-types';
export { ICON_LIBRARY } from './icon-data';

const CATEGORY_LABELS: Record<IconCategory, string> = {
  aws: '🟧 AWS',
  gcp: '🌥 GCP',
  azure: '🟦 Azure',
  cloud: '☁ Cloud',
  database: '🗄 DB',
  language: '💻 Lang',
  frontend: '🎨 FE',
  backend: '⚙ BE',
  tool: '🔧 Tool',
  network: '🌐 Net',
  erd: '🔗 ERD',
  arrow: '➡ Arrow',
  document: '📄 Doc',
  device: '💾 Device',
  communication: '💬 Comm',
  action: '⚡ Action',
  chart: '📊 Chart',
  shape: '◇ Shape',
  user: '👤 User',
  media: '🎵 Media',
  finance: '💰 Finance',
  crypto: '₿ Crypto',
  symbol: '🔣 Symbol',
  tabler: '✦ Tabler',
  lucide: '✧ Lucide',
};

const PAGE_SIZE = 120;

export class IconLibraryDialog {
  private dialog: HTMLDialogElement;
  private listEl: HTMLElement;
  private searchEl: HTMLInputElement;
  private categoryFilter: IconCategory | 'all' = 'all';
  private query: string = '';
  private renderedCount: number = 0;
  private lastFiltered: IconEntry[] = [];
  private observer: IntersectionObserver | null = null;
  private sentinel: HTMLDivElement | null = null;

  constructor(dialog: HTMLDialogElement, listEl: HTMLElement, searchEl: HTMLInputElement) {
    this.dialog = dialog;
    this.listEl = listEl;
    this.searchEl = searchEl;
    this.bind();
  }

  static mount(): IconLibraryDialog | null {
    const dialog = document.getElementById('studio-icon-dialog') as HTMLDialogElement | null;
    const listEl = document.getElementById('studio-icon-list');
    const searchEl = document.getElementById('studio-icon-search') as HTMLInputElement | null;
    if (!dialog || !listEl || !searchEl) return null;
    return new IconLibraryDialog(dialog, listEl, searchEl);
  }

  open(): void {
    this.render();
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
    setTimeout(() => this.searchEl.focus(), 0);
  }

  close(): void {
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else this.dialog.removeAttribute('open');
    this.observer?.disconnect();
    this.observer = null;
    this.sentinel = null;
  }

  private bind(): void {
    let timer: number | null = null;
    this.searchEl.addEventListener('input', () => {
      this.query = this.searchEl.value.trim().toLowerCase();
      if (timer !== null) clearTimeout(timer);
      timer = window.setTimeout(() => this.render(), 80);
    });
    this.dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-icon-dialog-close]')) {
        this.close();
        return;
      }
      const catBtn = target.closest<HTMLElement>('[data-icon-cat]');
      if (catBtn) {
        this.categoryFilter = (catBtn.dataset.iconCat ?? 'all') as IconCategory | 'all';
        this.render();
        return;
      }
      const pickBtn = target.closest<HTMLElement>('[data-icon-pick]');
      if (pickBtn) {
        const id = pickBtn.dataset.iconPick ?? '';
        this.insertIcon(id);
        return;
      }
    });
  }

  private filtered(): IconEntry[] {
    const list = this.categoryFilter === 'all'
      ? ICON_LIBRARY
      : ICON_GROUPS.find((g) => g.category === this.categoryFilter)?.entries ?? [];
    if (!this.query) return list;
    const q = this.query;
    return list.filter((it) => it.id.toLowerCase().includes(q) || it.title.toLowerCase().includes(q));
  }

  private render(): void {
    const filtered = this.filtered();
    this.lastFiltered = filtered;
    const cats: ('all' | IconCategory)[] = ['all', ...ICON_GROUPS.map((g) => g.category)];
    const catBar = cats
      .map((c) => {
        const label = c === 'all' ? '전체' : CATEGORY_LABELS[c];
        const count = c === 'all' ? ICON_LIBRARY.length : (ICON_GROUPS.find((g) => g.category === c)?.entries.length ?? 0);
        return `<button type="button" data-icon-cat="${c}" class="studio-icon-cat-btn ${this.categoryFilter === c ? 'is-active' : ''}">${label} <span class="studio-icon-cat-count">${count}</span></button>`;
      })
      .join('');

    if (filtered.length === 0) {
      this.listEl.innerHTML = `
        <div class="studio-icon-cat-bar">${catBar}</div>
        <div class="studio-icon-grid"><div class="studio-icon-empty">검색 결과 없음 (${ICON_LIBRARY.length}개 아이콘)</div></div>
      `;
      return;
    }

    this.renderedCount = Math.min(PAGE_SIZE, filtered.length);
    const grid = filtered.slice(0, this.renderedCount).map((it) => this.renderItem(it)).join('');
    const moreCount = Math.max(0, filtered.length - this.renderedCount);

    this.listEl.innerHTML = `
      <div class="studio-icon-cat-bar">${catBar}</div>
      <div class="studio-icon-result-info">총 ${filtered.length}개 ${this.query ? `<code>${escapeHtml(this.query)}</code> 검색 결과` : ''}</div>
      <div class="studio-icon-grid" id="studio-icon-grid">${grid}</div>
      ${moreCount > 0 ? `<div class="studio-icon-sentinel" id="studio-icon-sentinel">${moreCount}개 더 표시…</div>` : ''}
    `;

    this.observer?.disconnect();
    const sent = document.getElementById('studio-icon-sentinel') as HTMLDivElement | null;
    this.sentinel = sent;
    if (sent) {
      this.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.loadMore();
        }
      }, { root: this.dialog.querySelector('.studio-dialog-body') ?? null, rootMargin: '200px' });
      this.observer.observe(sent);
    }
  }

  private loadMore(): void {
    const grid = document.getElementById('studio-icon-grid');
    if (!grid) return;
    const next = Math.min(this.renderedCount + PAGE_SIZE, this.lastFiltered.length);
    const slice = this.lastFiltered.slice(this.renderedCount, next);
    grid.insertAdjacentHTML('beforeend', slice.map((it) => this.renderItem(it)).join(''));
    this.renderedCount = next;
    const remaining = this.lastFiltered.length - next;
    if (this.sentinel) {
      if (remaining > 0) {
        this.sentinel.textContent = `${remaining}개 더 표시…`;
      } else {
        this.observer?.disconnect();
        this.sentinel.remove();
        this.sentinel = null;
      }
    }
  }

  private renderItem(it: IconEntry): string {
    return `<button type="button" data-icon-pick="${escapeHtml(it.id)}" class="studio-icon-item" title="${escapeHtml(it.title)} · ${escapeHtml(it.id)}">
      <img loading="lazy" decoding="async" src="${escapeHtml(it.src)}" alt="${escapeHtml(it.title)}" onerror="this.classList.add('is-error')" />
      <span>${escapeHtml(it.title)}</span>
    </button>`;
  }

  private insertIcon(iconId: string): void {
    const def = getDef();
    if (!def) return;
    const icon = ICON_LIBRARY.find((i) => i.id === iconId);
    if (!icon) return;
    const cx = def.canvas.width / 2;
    const cy = def.canvas.height / 2;
    const safeBase = iconId.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'icon';
    const id = uniqueElementId(safeBase);
    const el: ImageElement = {
      type: 'image',
      id,
      rotation: 0, appearances: [], tracks: [],
      x: cx - 32,
      y: cy - 32,
      width: 64,
      height: 64,
      src: icon.src,
      preserveAspectRatio: 'xMidYMid meet',
      opacity: 1,
    };
    addElement(el);
    this.close();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
