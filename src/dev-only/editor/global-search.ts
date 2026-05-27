import { api, type GrepMatch } from './api';
import { escapeHtml } from './utils';
import type { CollectionName, Ext } from './state';

export type GlobalSearchJump = (
  collection: CollectionName,
  slug: string,
  ext: Ext,
  line: number,
  column: number,
) => Promise<void> | void;

export class GlobalSearch {
  private root: HTMLElement;
  private input: HTMLInputElement;
  private regexToggle: HTMLInputElement;
  private caseToggle: HTMLInputElement;
  private statusEl: HTMLElement;
  private resultsEl: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private onJump: GlobalSearchJump;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private requestToken = 0;
  private isOpen = false;
  private matches: GrepMatch[] = [];

  constructor(onJump: GlobalSearchJump) {
    this.onJump = onJump;
    this.root = this.build();
    document.body.appendChild(this.root);
    this.input = this.root.querySelector<HTMLInputElement>('[data-gs-input]')!;
    this.regexToggle = this.root.querySelector<HTMLInputElement>('[data-gs-regex]')!;
    this.caseToggle = this.root.querySelector<HTMLInputElement>('[data-gs-case]')!;
    this.statusEl = this.root.querySelector<HTMLElement>('[data-gs-status]')!;
    this.resultsEl = this.root.querySelector<HTMLElement>('[data-gs-results]')!;
    this.closeBtn = this.root.querySelector<HTMLButtonElement>('[data-gs-close]')!;
    this.bind();
  }

  show(seed?: string): void {
    this.isOpen = true;
    this.root.hidden = false;
    document.body.classList.add('editor-global-search-open');
    if (seed !== undefined) this.input.value = seed;
    this.input.focus();
    this.input.select();
    this.scheduleSearch(0);
  }

  close(): void {
    this.isOpen = false;
    this.root.hidden = true;
    document.body.classList.remove('editor-global-search-open');
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.show();
  }

  private build(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'editor-global-search';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '전체 파일 검색');
    el.innerHTML = `
      <div class="editor-global-search-backdrop" data-gs-backdrop></div>
      <div class="editor-global-search-panel">
        <header class="editor-global-search-header">
          <input
            type="search"
            data-gs-input
            class="editor-global-search-input"
            placeholder="모든 파일에서 검색…"
            aria-label="검색어"
            autocomplete="off"
          />
          <label class="editor-global-search-flag" title="대소문자 구분">
            <input type="checkbox" data-gs-case /> Aa
          </label>
          <label class="editor-global-search-flag" title="정규식">
            <input type="checkbox" data-gs-regex /> .*
          </label>
          <button type="button" data-gs-close class="editor-global-search-close" aria-label="닫기">✕</button>
        </header>
        <div class="editor-global-search-status" data-gs-status>검색어를 입력하세요</div>
        <div class="editor-global-search-results" data-gs-results role="listbox"></div>
      </div>
    `;
    return el;
  }

  private bind(): void {
    this.input.addEventListener('input', () => this.scheduleSearch());
    this.regexToggle.addEventListener('change', () => this.scheduleSearch(0));
    this.caseToggle.addEventListener('change', () => this.scheduleSearch(0));
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = this.resultsEl.querySelector<HTMLElement>('[data-gs-result]');
        first?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const first = this.resultsEl.querySelector<HTMLElement>('[data-gs-result]');
        first?.click();
      }
    });
    this.closeBtn.addEventListener('click', () => this.close());
    this.root.querySelector('[data-gs-backdrop]')?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
    });
    this.resultsEl.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target?.matches('[data-gs-result]')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = target.nextElementSibling as HTMLElement | null;
        next?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = target.previousElementSibling as HTMLElement | null;
        if (prev) prev.focus();
        else this.input.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        target.click();
      }
    });
  }

  private scheduleSearch(delayMs = 200): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => void this.runSearch(), delayMs);
  }

  private async runSearch(): Promise<void> {
    const query = this.input.value.trim();
    if (!query) {
      this.matches = [];
      this.resultsEl.innerHTML = '';
      this.statusEl.textContent = '검색어를 입력하세요';
      return;
    }
    const token = ++this.requestToken;
    this.statusEl.textContent = '검색 중…';
    try {
      const res = await api.grep({
        query,
        regex: this.regexToggle.checked,
        caseSensitive: this.caseToggle.checked,
      });
      if (token !== this.requestToken) return;
      this.matches = res.matches;
      this.renderResults(res);
    } catch (err) {
      if (token !== this.requestToken) return;
      const msg = err instanceof Error ? err.message : String(err);
      this.statusEl.textContent = '오류: ' + msg;
      this.resultsEl.innerHTML = '';
    }
  }

  private renderResults(res: { matches: GrepMatch[]; truncated: boolean; scanned: number }): void {
    if (res.matches.length === 0) {
      this.statusEl.textContent = `매치 없음 (${res.scanned}개 파일 검색됨)`;
      this.resultsEl.innerHTML = '';
      return;
    }
    const truncated = res.truncated ? ' (상한 도달, 더 많은 결과 있음)' : '';
    this.statusEl.textContent = `${res.matches.length}개 매치 / ${res.scanned}개 파일${truncated}`;
    const grouped = new Map<string, GrepMatch[]>();
    for (const m of res.matches) {
      const key = `${m.collection}/${m.slug}${m.ext}`;
      const arr = grouped.get(key);
      if (arr) arr.push(m);
      else grouped.set(key, [m]);
    }
    const groups: string[] = [];
    for (const [key, items] of grouped) {
      const fileHtml = items
        .map((m, idx) => {
          const lineLabel = `${m.line}:${m.column}`;
          return `<div class="editor-global-search-result" data-gs-result data-collection="${m.collection}" data-slug="${escapeHtml(m.slug)}" data-ext="${m.ext}" data-line="${m.line}" data-column="${m.column}" tabindex="0" role="option" aria-posinset="${idx + 1}" aria-setsize="${items.length}">
            <span class="editor-global-search-line">${lineLabel}</span>
            <span class="editor-global-search-text">${escapeHtml(m.text)}</span>
          </div>`;
        })
        .join('');
      groups.push(`<div class="editor-global-search-group">
        <div class="editor-global-search-group-header">${escapeHtml(key)} <span class="editor-global-search-group-count">${items.length}</span></div>
        ${fileHtml}
      </div>`);
    }
    this.resultsEl.innerHTML = groups.join('');
    this.resultsEl.querySelectorAll<HTMLElement>('[data-gs-result]').forEach((row) => {
      row.addEventListener('click', () => void this.handleClick(row));
    });
  }

  private async handleClick(row: HTMLElement): Promise<void> {
    const collection = row.dataset.collection as CollectionName;
    const slug = row.dataset.slug ?? '';
    const ext = (row.dataset.ext ?? '.md') as Ext;
    const line = Number(row.dataset.line ?? '1');
    const column = Number(row.dataset.column ?? '1');
    this.close();
    await this.onJump(collection, slug, ext, line, column);
  }
}
