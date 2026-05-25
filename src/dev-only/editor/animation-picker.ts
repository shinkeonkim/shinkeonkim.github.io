import type { MarkdownToolbar } from './toolbar';

interface AnimationSummary {
  id: string;
  title: string;
  description: string;
}

export class AnimationPicker {
  private toolbar: MarkdownToolbar;
  private items: AnimationSummary[] = [];
  private loaded = false;

  constructor(toolbar: MarkdownToolbar) {
    this.toolbar = toolbar;
  }

  init(): void {
    const menuBtn = document.querySelector<HTMLElement>('[data-md-menu="anim"]');
    menuBtn?.addEventListener('click', () => {
      if (!this.loaded) void this.loadList();
    });

    const search = document.getElementById('editor-anim-search') as HTMLInputElement | null;
    search?.addEventListener('input', () => this.render(search.value));

    document.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[data-anim-insert-id]');
      if (!item) return;
      e.preventDefault();
      const id = item.dataset.animInsertId ?? '';
      this.toolbar.insertBlock('```anim:' + id + '\n{}\n```');
      this.closeMenu();
    });
  }

  private closeMenu(): void {
    const menu = document.querySelector<HTMLElement>('[data-menu="anim"]');
    if (menu) menu.hidden = true;
    const btn = document.querySelector<HTMLElement>('[data-md-menu="anim"]');
    btn?.setAttribute('aria-expanded', 'false');
  }

  private async loadList(): Promise<void> {
    const listEl = document.getElementById('editor-anim-saved-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="editor-anim-empty">로딩…</div>';
    try {
      const res = await fetch('/_studio/api/animations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: AnimationSummary[] };
      this.items = data.items;
      this.loaded = true;
      this.render('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      listEl.innerHTML = `<div class="editor-anim-empty">실패: ${this.escape(msg)}</div>`;
    }
  }

  private render(query: string): void {
    const listEl = document.getElementById('editor-anim-saved-list');
    if (!listEl) return;
    const q = query.trim().toLowerCase();
    const filtered = q
      ? this.items.filter(
          (it) =>
            it.id.toLowerCase().includes(q) ||
            it.title.toLowerCase().includes(q) ||
            (it.description ?? '').toLowerCase().includes(q),
        )
      : this.items;
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="editor-anim-empty">저장된 애니메이션이 없습니다. 스튜디오에서 만들어 보세요.</div>';
      return;
    }
    listEl.innerHTML = filtered
      .map(
        (it) => `
          <button type="button" data-anim-insert-id="${this.escape(it.id)}" class="editor-anim-saved-item">
            <div class="editor-anim-saved-title">${this.escape(it.title)}</div>
            <div class="editor-anim-saved-id">${this.escape(it.id)}</div>
          </button>
        `,
      )
      .join('');
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
