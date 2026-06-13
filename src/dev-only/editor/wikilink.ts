import { api, type TreeEntry } from './api';
import { getCaretCoordinates } from './caret';
import { escapeHtml } from './utils';
import type { CollectionName } from './state';
import { WIKILINK_AUTOCOMPLETE_MAX } from '../../consts';

interface PageEntry {
  collection: CollectionName;
  slug: string;
  display: string;
  searchKey: string;
}

const MAX_RESULTS = WIKILINK_AUTOCOMPLETE_MAX;

export class WikilinkAutocomplete {
  private textarea: HTMLTextAreaElement;
  private popup: HTMLElement;
  private list: HTMLElement;
  private pages: PageEntry[] = [];
  private filtered: PageEntry[] = [];
  private highlight = 0;
  private active = false;
  private triggerStart = -1;

  constructor(textarea: HTMLTextAreaElement) {
    this.textarea = textarea;
    this.popup = this.createPopup();
    this.list = this.popup.querySelector('.wikilink-list') as HTMLElement;
    this.bind();
    void this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const data = await api.files();
      const pages: PageEntry[] = [];
      function walk(collection: CollectionName, entries: TreeEntry[]) {
        for (const e of entries) {
          if (e.type === 'folder') {
            walk(collection, e.children ?? []);
            continue;
          }
          const filename = e.slug.includes('/') ? e.slug.split('/').pop()! : e.slug;
          pages.push({
            collection,
            slug: e.slug,
            display: filename,
            searchKey: (filename + ' ' + e.slug).toLowerCase(),
          });
        }
      }
      for (const c of ['posts', 'wiki', 'notes'] as CollectionName[]) {
        walk(c, data.tree[c] ?? []);
      }
      this.pages = pages;
    } catch {
      this.pages = [];
    }
  }

  private createPopup(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'wikilink-popup';
    el.setAttribute('role', 'listbox');
    el.hidden = true;
    el.innerHTML = '<ul class="wikilink-list"></ul>';
    document.body.appendChild(el);
    return el;
  }

  private bind(): void {
    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('keydown', (e) => this.handleKey(e));
    this.textarea.addEventListener('blur', () => {
      setTimeout(() => this.hide(), 150);
    });
    this.textarea.addEventListener('click', () => this.handleInput());
    window.addEventListener('resize', () => {
      if (this.active) this.position();
    });
  }

  private detectTrigger(): { start: number; query: string } | null {
    const pos = this.textarea.selectionStart;
    const before = this.textarea.value.slice(0, pos);
    const open = before.lastIndexOf('[[');
    if (open < 0) return null;
    const segment = before.slice(open + 2);
    if (segment.includes(']]') || segment.includes('\n')) return null;
    return { start: open + 2, query: segment };
  }

  private handleInput(): void {
    const trigger = this.detectTrigger();
    if (!trigger) {
      this.hide();
      return;
    }
    this.triggerStart = trigger.start;
    const q = trigger.query.toLowerCase();
    this.filtered = (q ? this.pages.filter((p) => p.searchKey.includes(q)) : this.pages).slice(
      0,
      MAX_RESULTS,
    );
    if (this.filtered.length === 0) {
      this.hide();
      return;
    }
    this.highlight = 0;
    this.renderList();
    this.show();
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.active) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlight = (this.highlight + 1) % this.filtered.length;
      this.renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlight = (this.highlight - 1 + this.filtered.length) % this.filtered.length;
      this.renderList();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      this.commit(this.filtered[this.highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
    }
  }

  private commit(page: PageEntry | undefined): void {
    if (!page) {
      this.hide();
      return;
    }
    const before = this.textarea.value.slice(0, this.triggerStart);
    const after = this.textarea.value.slice(this.textarea.selectionStart);
    const closeIdx = after.indexOf(']]');
    const remaining = closeIdx === 0 ? after.slice(2) : after;
    const insertion = page.display + ']]';
    const next = before + insertion + remaining;
    const cursor = before.length + insertion.length;
    this.textarea.value = next;
    this.textarea.selectionStart = this.textarea.selectionEnd = cursor;
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    this.hide();
    this.textarea.focus();
  }

  private renderList(): void {
    const items = this.filtered
      .map((page, i) => {
        return `
          <li class="wikilink-item${i === this.highlight ? ' is-active' : ''}" data-index="${i}" role="option" aria-selected="${i === this.highlight}">
            <span class="wikilink-display">${escapeHtml(page.display)}</span>
            <span class="wikilink-meta">${page.collection}/${escapeHtml(page.slug)}</span>
          </li>
        `;
      })
      .join('');
    this.list.innerHTML = items;
    this.list.querySelectorAll<HTMLElement>('.wikilink-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = Number(el.dataset.index);
        this.commit(this.filtered[idx]);
      });
      el.addEventListener('mouseenter', () => {
        this.highlight = Number(el.dataset.index);
        this.renderList();
      });
    });
  }

  private show(): void {
    this.active = true;
    this.popup.hidden = false;
    this.position();
  }

  private hide(): void {
    this.active = false;
    this.popup.hidden = true;
    this.triggerStart = -1;
  }

  private position(): void {
    const pos = this.textarea.selectionStart;
    const coords = getCaretCoordinates(this.textarea, pos);
    const rect = this.textarea.getBoundingClientRect();
    const top =
      rect.top + coords.top + coords.height + 4 - this.textarea.scrollTop + window.scrollY;
    const left = rect.left + coords.left + window.scrollX;
    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  }
}
