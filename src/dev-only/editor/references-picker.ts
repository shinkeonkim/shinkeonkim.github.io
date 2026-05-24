import { api, type SourceSummary } from './api';
import { confirmModal, ensureHost, openModal } from './modal';
import { setStatus } from './status';
import { escapeHtml } from './utils';
import {
  parseReferencesFromFrontmatter,
  upsertReferencesInFrontmatter,
  type ReferenceItem,
} from './yaml-utils';

interface PickerOptions {
  getContent: () => string;
  setContent: (next: string) => void;
}

function slugifyId(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function describeSource(source: SourceSummary): string {
  const parts = [source.author, source.publisher, source.year ? String(source.year) : null].filter(
    Boolean,
  );
  return parts.length > 0 ? `${source.title} · ${parts.join(' · ')}` : source.title;
}

function badge(source: SourceSummary): string {
  return `<span class="ref-picker-badge ref-picker-badge-${source.type}">${source.type}</span>`;
}

export class ReferencesPicker {
  private opts: PickerOptions;
  private sources: SourceSummary[] = [];
  private selected: ReferenceItem[] = [];
  private dialog: HTMLDialogElement;
  private rendered = false;
  private query = '';

  constructor(opts: PickerOptions) {
    this.opts = opts;
    this.dialog = ensureHost();
  }

  async open(): Promise<void> {
    this.selected = parseReferencesFromFrontmatter(this.opts.getContent()).refs.slice();
    await this.refreshSources();
    this.query = '';
    this.render();
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
  }

  private async refreshSources(): Promise<void> {
    try {
      const res = await api.listSources();
      this.sources = res.sources;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('출처 목록 로드 실패: ' + msg, 'error');
      this.sources = [];
    }
  }

  private filteredSources(): SourceSummary[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.sources;
    return this.sources.filter((s) => {
      if (s.title.toLowerCase().includes(q)) return true;
      if (s.id.toLowerCase().includes(q)) return true;
      if (s.author?.toLowerCase().includes(q)) return true;
      if (s.aliases.some((a) => a.toLowerCase().includes(q))) return true;
      if (s.tags.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  private isSelected(id: string): boolean {
    return this.selected.some((r) => r.id === id);
  }

  private render(): void {
    const filtered = this.filteredSources();
    const selectedHtml =
      this.selected.length === 0
        ? `<p class="ref-picker-empty">선택된 출처가 없습니다.</p>`
        : `<ul class="ref-picker-selected-list">${this.selected
            .map((r, i) => this.renderSelectedItem(r, i))
            .join('')}</ul>`;

    const html = `
      <div class="ref-picker">
        <header class="ref-picker-header">
          <h2 class="ref-picker-title">📚 참고 자료 (${this.selected.length})</h2>
          <button type="button" class="editor-modal-close" data-ref-close aria-label="닫기">✕</button>
        </header>
        <section class="ref-picker-section">
          <h3 class="ref-picker-section-title">선택됨</h3>
          ${selectedHtml}
        </section>
        <section class="ref-picker-section">
          <div class="ref-picker-search-row">
            <input type="search" class="ref-picker-search" placeholder="출처 검색 (제목/저자/태그/별칭)" value="${escapeHtml(this.query)}" data-ref-search />
            <button type="button" class="editor-btn editor-btn-small" data-ref-add-inline>+ 인라인</button>
            <button type="button" class="editor-btn editor-btn-small" data-ref-create-source>+ 새 출처</button>
          </div>
          ${
            filtered.length === 0
              ? `<p class="ref-picker-empty">출처가 없습니다. 우측 '+ 새 출처' 로 만들어보세요.</p>`
              : `<ul class="ref-picker-available">${filtered.map((s) => this.renderAvailableItem(s)).join('')}</ul>`
          }
        </section>
        <footer class="ref-picker-footer">
          <button type="button" class="editor-btn" data-ref-close>취소</button>
          <button type="button" class="editor-btn editor-btn-primary" data-ref-save>저장 (${this.selected.length})</button>
        </footer>
      </div>
    `;
    this.dialog.innerHTML = html;
    this.dialog.className = 'editor-modal ref-picker-modal';
    if (!this.rendered) {
      this.dialog.addEventListener('close', () => this.handleClose());
      this.rendered = true;
    }
    this.bind();
  }

  private renderSelectedItem(item: ReferenceItem, index: number): string {
    if (item.id) {
      const source = this.sources.find((s) => s.id === item.id);
      const label = source ? describeSource(source) : `${item.id} (출처 미존재)`;
      const meta = item.page ? `p.${item.page}` : '';
      return `<li class="ref-picker-selected-item">
        <div class="ref-picker-selected-main">
          ${source ? badge(source) : '<span class="ref-picker-badge ref-picker-badge-missing">?</span>'}
          <span class="ref-picker-selected-label">${escapeHtml(String(label))}</span>
          ${meta ? `<span class="ref-picker-meta">${escapeHtml(meta)}</span>` : ''}
        </div>
        ${item.note ? `<p class="ref-picker-note">${escapeHtml(String(item.note))}</p>` : ''}
        <button type="button" class="ref-picker-remove" data-ref-remove="${index}" aria-label="제거">✕</button>
      </li>`;
    }
    return `<li class="ref-picker-selected-item">
      <div class="ref-picker-selected-main">
        <span class="ref-picker-badge ref-picker-badge-inline">inline</span>
        <span class="ref-picker-selected-label">${escapeHtml(String(item.title ?? ''))}</span>
      </div>
      ${item.author ? `<p class="ref-picker-note">${escapeHtml(String(item.author))}</p>` : ''}
      ${item.url ? `<p class="ref-picker-note"><a href="${escapeHtml(String(item.url))}" target="_blank" rel="noopener">${escapeHtml(String(item.url))}</a></p>` : ''}
      ${item.note ? `<p class="ref-picker-note">${escapeHtml(String(item.note))}</p>` : ''}
      <button type="button" class="ref-picker-remove" data-ref-remove="${index}" aria-label="제거">✕</button>
    </li>`;
  }

  private renderAvailableItem(source: SourceSummary): string {
    const selected = this.isSelected(source.id);
    return `<li class="ref-picker-available-item ${selected ? 'is-selected' : ''}" data-ref-toggle="${escapeHtml(source.id)}">
      <label class="ref-picker-available-label">
        <input type="checkbox" ${selected ? 'checked' : ''} data-ref-checkbox="${escapeHtml(source.id)}" />
        ${badge(source)}
        <span class="ref-picker-available-title">${escapeHtml(source.title)}</span>
        ${source.author ? `<span class="ref-picker-meta">${escapeHtml(source.author)}</span>` : ''}
        ${source.year ? `<span class="ref-picker-meta">${source.year}</span>` : ''}
      </label>
    </li>`;
  }

  private bind(): void {
    this.dialog.querySelectorAll<HTMLElement>('[data-ref-close]').forEach((el) => {
      el.addEventListener('click', () => this.dialog.close());
    });
    this.dialog.querySelector<HTMLElement>('[data-ref-save]')?.addEventListener('click', () => {
      this.commit();
      this.dialog.close();
    });
    const searchEl = this.dialog.querySelector<HTMLInputElement>('[data-ref-search]');
    searchEl?.addEventListener('input', () => {
      this.query = searchEl.value;
      this.renderListsOnly();
    });
    this.dialog.querySelectorAll<HTMLInputElement>('[data-ref-checkbox]').forEach((el) => {
      el.addEventListener('change', () => {
        const id = el.dataset.refCheckbox ?? '';
        if (el.checked) this.addShared(id);
        else this.removeById(id);
      });
    });
    this.dialog.querySelectorAll<HTMLElement>('[data-ref-remove]').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.refRemove);
        if (!Number.isNaN(idx)) {
          this.selected.splice(idx, 1);
          this.render();
        }
      });
    });
    this.dialog
      .querySelector<HTMLElement>('[data-ref-add-inline]')
      ?.addEventListener('click', () => {
        void this.handleAddInline();
      });
    this.dialog
      .querySelector<HTMLElement>('[data-ref-create-source]')
      ?.addEventListener('click', () => {
        void this.handleCreateSource();
      });
  }

  private renderListsOnly(): void {
    const sections = this.dialog.querySelectorAll<HTMLElement>('.ref-picker-section');
    if (sections.length < 2) {
      this.render();
      return;
    }
    const filtered = this.filteredSources();
    const availableSection = sections[1];
    const existingList = availableSection.querySelector('.ref-picker-available, .ref-picker-empty');
    const newList = document.createElement('div');
    newList.innerHTML =
      filtered.length === 0
        ? `<p class="ref-picker-empty">출처가 없습니다.</p>`
        : `<ul class="ref-picker-available">${filtered.map((s) => this.renderAvailableItem(s)).join('')}</ul>`;
    existingList?.replaceWith(newList.firstElementChild!);
    this.bind();
  }

  private addShared(id: string): void {
    if (this.isSelected(id)) return;
    this.selected.push({ id });
    this.render();
  }

  private removeById(id: string): void {
    this.selected = this.selected.filter((r) => r.id !== id);
    this.render();
  }

  private async handleAddInline(): Promise<void> {
    const r = await openModal({
      title: '인라인 출처 추가',
      description: '한 번만 인용할 자료. 공유 출처가 필요하면 "새 출처" 로 만드세요.',
      fields: [
        { name: 'title', label: '제목', required: true },
        { name: 'url', label: 'URL (선택)' },
        { name: 'author', label: '저자 (선택)' },
        { name: 'note', label: '메모 (선택)' },
      ],
      confirmLabel: '추가',
    });
    if (!r.confirmed) return;
    const item: ReferenceItem = { title: r.values.title.trim() };
    if (!item.title) return;
    if (r.values.url.trim()) item.url = r.values.url.trim();
    if (r.values.author.trim()) item.author = r.values.author.trim();
    if (r.values.note.trim()) item.note = r.values.note.trim();
    this.selected.push(item);
    this.render();
    if (typeof this.dialog.showModal === 'function' && !this.dialog.open) this.dialog.showModal();
  }

  private async handleCreateSource(): Promise<void> {
    const r = await openModal({
      title: '새 출처 만들기',
      description: '공유 출처를 만들고 즉시 현재 글에 추가합니다.',
      fields: [
        { name: 'title', label: '제목', required: true },
        {
          name: 'type',
          label: '종류',
          type: 'select',
          value: 'website',
          options: [
            { value: 'book', label: '책' },
            { value: 'article', label: '아티클' },
            { value: 'paper', label: '논문' },
            { value: 'website', label: '웹사이트' },
            { value: 'video', label: '영상' },
            { value: 'talk', label: '강연' },
            { value: 'other', label: '기타' },
          ],
        },
        { name: 'author', label: '저자 (선택)' },
        { name: 'publisher', label: '출판사 (선택)' },
        { name: 'year', label: '연도 (선택)' },
        { name: 'url', label: 'URL (선택)' },
        { name: 'id', label: 'ID (비우면 제목에서 자동 생성)' },
      ],
      confirmLabel: '만들기 + 추가',
    });
    if (!r.confirmed) return;
    const title = r.values.title.trim();
    if (!title) return;
    const id = r.values.id.trim() || slugifyId(title);
    if (this.sources.some((s) => s.id === id)) {
      const ok = await confirmModal({
        title: '같은 ID 의 출처가 이미 있습니다',
        description: `${id}\n\n그 출처를 사용하시겠습니까? (기존 파일을 덮어쓰지 않습니다)`,
        confirmLabel: '기존 출처 사용',
      });
      if (ok) {
        this.addShared(id);
        if (typeof this.dialog.showModal === 'function' && !this.dialog.open)
          this.dialog.showModal();
      }
      return;
    }
    const lines = ['---'];
    lines.push(`title: ${JSON.stringify(title)}`);
    lines.push(`type: ${r.values.type}`);
    if (r.values.author.trim()) lines.push(`author: ${JSON.stringify(r.values.author.trim())}`);
    if (r.values.publisher.trim())
      lines.push(`publisher: ${JSON.stringify(r.values.publisher.trim())}`);
    if (r.values.year.trim()) {
      const y = Number(r.values.year.trim());
      if (!Number.isNaN(y)) lines.push(`year: ${y}`);
    }
    if (r.values.url.trim()) lines.push(`url: ${JSON.stringify(r.values.url.trim())}`);
    lines.push('aliases: []');
    lines.push('tags: []');
    lines.push('---');
    lines.push('');
    lines.push(`${title} 에 대한 짧은 설명을 추가하세요.`);
    lines.push('');
    const content = lines.join('\n');
    try {
      await api.saveFile({ collection: 'sources', slug: id, ext: '.md', content });
      setStatus(`출처 생성: ${id}`, 'ok');
      await this.refreshSources();
      this.addShared(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('출처 생성 실패: ' + msg, 'error');
    }
    if (typeof this.dialog.showModal === 'function' && !this.dialog.open) this.dialog.showModal();
  }

  private commit(): void {
    const current = this.opts.getContent();
    const next = upsertReferencesInFrontmatter(current, this.selected);
    this.opts.setContent(next);
    setStatus(`참고 자료 ${this.selected.length}건 저장됨`, 'ok');
  }

  private handleClose(): void {
    this.dialog.className = 'editor-modal';
  }
}
