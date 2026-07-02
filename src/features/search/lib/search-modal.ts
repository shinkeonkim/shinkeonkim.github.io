import tagList from '@/data/search-tags.json';
import {
  COMMAND_LIST,
  HELP_ITEMS,
  MODE_LABELS,
  SECTION_LABELS,
  runCommand,
  type CommandEntry,
} from './commands';

type Mode = 'search' | 'command' | 'tag' | 'help';

interface CurrentItem {
  kind: 'help' | 'command' | 'tag' | 'search';
  ref?: CommandEntry;
  href?: string;
}

declare global {
  interface Window {
    __searchModalBound?: boolean;
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fuzzy(haystack: string, needle: string): boolean {
  const hay = haystack.toLowerCase();
  const need = needle.toLowerCase();
  if (!need) return true;
  let i = 0;
  for (const ch of need) {
    const idx = hay.indexOf(ch, i);
    if (idx === -1) return false;
    i = idx + 1;
  }
  return true;
}

function detectMode(raw: string): { mode: Mode; query: string } {
  if (!raw) return { mode: 'search', query: '' };
  const first = raw[0];
  if (first === '>') return { mode: 'command', query: raw.slice(1).trimStart() };
  if (first === '#') return { mode: 'tag', query: raw.slice(1).trimStart() };
  if (first === '?') return { mode: 'help', query: raw.slice(1).trimStart() };
  return { mode: 'search', query: raw };
}

export function setupSearchModal(): void {
  if (window.__searchModalBound) return;
  window.__searchModalBound = true;

  type PagefindResult = { results: { data: () => Promise<unknown> }[] };
  type PagefindFilters = { category?: string };
  let pagefindModule: {
    search: (q: string, opts?: { filters?: PagefindFilters }) => Promise<PagefindResult>;
    options: (o: object) => Promise<void>;
    init: () => Promise<void>;
  } | null = null;
  let pagefindReady = false;
  let pagefindLoadFailed = false;
  let searchToken = 0;
  let selectedIndex = -1;
  let currentItems: CurrentItem[] = [];
  let activeCategoryFilter: string | null = null;
  let lastQuery = '';

  async function loadPagefind() {
    if (pagefindReady) return pagefindModule;
    if (pagefindLoadFailed) return null;
    try {
      const pagefindUrl = '/pagefind/pagefind.js';
      const mod = await import(/* @vite-ignore */ pagefindUrl);
      pagefindModule = (mod.default ?? mod) as typeof pagefindModule;
      await pagefindModule!.options({});
      await pagefindModule!.init();
      pagefindReady = true;
      return pagefindModule;
    } catch (e) {
      pagefindLoadFailed = true;
      console.error('Pagefind load failed:', e);
      return null;
    }
  }

  function renderPagefindUnavailable(stats: HTMLElement, container: HTMLElement): void {
    stats.textContent = '검색 사용 불가';
    container.innerHTML = import.meta.env.DEV
      ? `<p class="search-modal-empty">
          <strong>전문 검색 인덱스(Pagefind)를 사용할 수 없습니다.</strong><br>
          개발 서버에서는 인덱스가 만들어지지 않습니다. <code>bun run build</code> 후 <code>bun preview</code> 로 검색을 테스트할 수 있습니다.<br>
          <kbd>&gt;</kbd> 명령 · <kbd>#</kbd> 태그 · <kbd>?</kbd> 도움말 모드는 정상 동작합니다.
        </p>`
      : `<p class="search-modal-empty">검색 인덱스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
    currentItems = [];
    selectedIndex = -1;
  }

  function setModeBadge(mode: Mode): void {
    const badge = document.getElementById('search-modal-mode-badge');
    if (!badge) return;
    badge.textContent = MODE_LABELS[mode] || '검색';
    badge.dataset.mode = mode;
  }

  function openModal(prefill?: string): void {
    const dialog = document.getElementById('search-modal') as HTMLDialogElement | null;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal();
    }
    const input = document.getElementById('search-modal-input') as HTMLInputElement | null;
    if (input) {
      if (typeof prefill === 'string' && prefill) {
        input.value = prefill;
        dispatch(prefill);
      } else {
        dispatch(input.value);
      }
      setTimeout(() => input.focus(), 30);
    }
    window.gtag?.('event', 'search_open');
  }

  function closeModal(): void {
    const dialog = document.getElementById('search-modal') as HTMLDialogElement | null;
    if (dialog && dialog.open) dialog.close();
  }

  function renderHelp(query: string): void {
    const container = document.getElementById('search-modal-results');
    const stats = document.getElementById('search-modal-stats');
    if (!container || !stats) return;
    const q = (query || '').toLowerCase();
    const items = HELP_ITEMS.filter(
      (h) => !q || h.desc.toLowerCase().includes(q) || h.keys.join(' ').toLowerCase().includes(q),
    );
    currentItems = items.map(() => ({ kind: 'help' }));
    stats.textContent = `${items.length}개 단축키`;
    container.innerHTML = items
      .map(
        (h, i) => `
        <div class="search-modal-hit search-modal-help" data-index="${i}">
          <span class="search-modal-hit-body">
            <span class="search-modal-hit-title">${escapeHtml(h.desc)}</span>
            <span class="search-modal-hit-excerpt">
              ${h.keys.map((k) => `<kbd>${escapeHtml(k)}</kbd>`).join(' ')}
            </span>
          </span>
        </div>
      `,
      )
      .join('') || '<p class="search-modal-empty">일치하는 단축키 없음</p>';
    selectedIndex = items.length > 0 ? 0 : -1;
    updateSelection();
  }

  function renderCommands(query: string): void {
    const container = document.getElementById('search-modal-results');
    const stats = document.getElementById('search-modal-stats');
    if (!container || !stats) return;
    const q = (query || '').toLowerCase();
    const filtered = COMMAND_LIST.filter((c) => {
      if (!q) return true;
      const hay = [c.label, c.hint, ...(c.keywords || [])].filter(Boolean).join(' ').toLowerCase();
      return fuzzy(hay, q);
    });
    currentItems = filtered.map((c) => ({ kind: 'command', ref: c }));
    stats.textContent = `${filtered.length}개 명령`;
    container.innerHTML = filtered.length === 0
      ? '<p class="search-modal-empty">일치하는 명령 없음</p>'
      : filtered
          .map(
            (c, i) => `
            <div class="search-modal-hit" data-index="${i}">
              <span class="search-modal-hit-badge">명령</span>
              <span class="search-modal-hit-body">
                <span class="search-modal-hit-title">${escapeHtml(c.label)}</span>
                ${
                  c.href || c.shortcut
                    ? `<span class="search-modal-hit-excerpt">
                        ${c.href ? `<code>${escapeHtml(c.href)}</code>` : ''}
                        ${c.shortcut ? `<kbd>${escapeHtml(c.shortcut)}</kbd>` : ''}
                      </span>`
                    : ''
                }
              </span>
            </div>
          `,
          )
          .join('');
    selectedIndex = filtered.length > 0 ? 0 : -1;
    updateSelection();
  }

  function renderTags(query: string): void {
    const container = document.getElementById('search-modal-results');
    const stats = document.getElementById('search-modal-stats');
    if (!container || !stats) return;
    const q = (query || '').toLowerCase();
    const filtered = (tagList as { name: string; slug: string; count: number }[])
      .filter((t) => !q || fuzzy(t.name.toLowerCase(), q));
    const top = filtered.slice(0, 30);
    currentItems = top.map((t) => ({
      kind: 'tag',
      href: `/tags/${encodeURIComponent(t.slug)}/`,
    }));
    stats.textContent = `${filtered.length}개 태그`;
    container.innerHTML = top.length === 0
      ? '<p class="search-modal-empty">일치하는 태그 없음</p>'
      : top
          .map(
            (t, i) => `
            <a href="/tags/${encodeURIComponent(t.slug)}/" class="search-modal-hit" data-index="${i}">
              <span class="search-modal-hit-badge">#${escapeHtml(t.name)}</span>
              <span class="search-modal-hit-body">
                <span class="search-modal-hit-title">${escapeHtml(t.name)} (${t.count})</span>
              </span>
            </a>
          `,
          )
          .join('');
    selectedIndex = top.length > 0 ? 0 : -1;
    updateSelection();
  }

  function renderCategoryChips(
    hits: {
      filters?: { category?: string | string[] };
    }[],
  ): void {
    const chipsEl = document.getElementById('search-modal-chips');
    if (!chipsEl) return;
    const counts = new Map<string, number>();
    for (const h of hits) {
      const c = h.filters?.category;
      const v = Array.isArray(c) ? c[0] : c;
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    if (counts.size === 0 && !activeCategoryFilter) {
      chipsEl.hidden = true;
      chipsEl.innerHTML = '';
      return;
    }
    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const chips: string[] = [];
    if (activeCategoryFilter) {
      chips.push(
        `<button type="button" class="search-modal-chip" data-chip-clear aria-label="필터 해제">✕ 전체</button>`,
      );
    }
    for (const [cat, count] of entries) {
      const pressed = cat === activeCategoryFilter;
      chips.push(
        `<button type="button" class="search-modal-chip" data-chip-category="${escapeHtml(cat)}" aria-pressed="${pressed}">${escapeHtml(cat)} <span class="search-modal-chip-count">${count}</span></button>`,
      );
    }
    chipsEl.innerHTML = chips.join('');
    chipsEl.hidden = false;
  }

  function renderRecentlyViewed(stats: HTMLElement, container: HTMLElement): void {
    let items: { url: string; title: string; kind: string }[] = [];
    try {
      const raw = localStorage.getItem('recent-viewed');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) items = arr.slice(0, 10);
    } catch {
      /* ignore */
    }
    const glossaryHint = `
      <a href="/glossary/" class="search-modal-hit search-modal-hit-hint" data-glossary-hint>
        <span class="search-modal-hit-badge">📚</span>
        <span class="search-modal-hit-body">
          <span class="search-modal-hit-title">용어 사전 둘러보기</span>
          <span class="search-modal-hit-excerpt">전체 위키 용어를 A-Z / 카테고리로 정리</span>
        </span>
      </a>
    `;
    if (items.length === 0) {
      stats.textContent = '검색어를 입력하세요';
      container.innerHTML = glossaryHint;
      currentItems = [{ kind: 'search', href: '/glossary/' }];
      selectedIndex = -1;
      return;
    }
    stats.textContent = `최근 본 페이지 ${items.length}개`;
    currentItems = items.map((it) => ({ kind: 'search', href: it.url }));
    currentItems.push({ kind: 'search', href: '/glossary/' });
    container.innerHTML =
      items
        .map((it, i) => {
          const label = SECTION_LABELS[it.kind] || it.kind;
          return `
          <a href="${escapeHtml(it.url)}" class="search-modal-hit" data-index="${i}">
            <span class="search-modal-hit-badge">${escapeHtml(label)}</span>
            <span class="search-modal-hit-body">
              <span class="search-modal-hit-title">${escapeHtml(it.title)}</span>
            </span>
          </a>
        `;
        })
        .join('') + glossaryHint;
    selectedIndex = 0;
    updateSelection();
  }

  async function doSearch(query: string): Promise<void> {
    const trimmed = (query || '').trim();
    const token = ++searchToken;
    const stats = document.getElementById('search-modal-stats');
    const container = document.getElementById('search-modal-results');
    if (!stats || !container) return;
    if (!trimmed) {
      renderRecentlyViewed(stats, container);
      return;
    }
    stats.textContent = '검색 중…';
    lastQuery = trimmed;
    const pf = await loadPagefind();
    if (token !== searchToken) return;
    if (!pf) {
      renderPagefindUnavailable(stats, container);
      return;
    }
    const start = performance.now();
    const searchOpts = activeCategoryFilter ? { filters: { category: activeCategoryFilter } } : undefined;
    const result = await pf.search(trimmed, searchOpts);
    if (token !== searchToken) return;
    const elapsed = (performance.now() - start).toFixed(0);
    if (!result || result.results.length === 0) {
      stats.textContent = `결과 없음 (${elapsed}ms)`;
      container.innerHTML = `<p class="search-modal-empty">"${escapeHtml(trimmed)}" 에 대한 결과 없음</p>`;
      currentItems = [];
      selectedIndex = -1;
      return;
    }
    stats.textContent = `${result.results.length}개 결과 (${elapsed}ms)`;
    const hits = await Promise.all(
      result.results.slice(0, 12).map((r) => r.data()),
    ) as {
      url: string;
      meta?: { title?: string };
      excerpt?: string;
      filters?: { section?: string | string[]; category?: string | string[] };
    }[];
    if (token !== searchToken) return;
    renderCategoryChips(hits);
    currentItems = hits.map((h) => ({ kind: 'search', href: h.url }));
    container.innerHTML = hits
      .map((h, i) => {
        const pickFirst = (v: string | string[] | undefined): string =>
          Array.isArray(v) ? v[0] : (v ?? '');
        const section = pickFirst(h.filters?.section);
        const category = pickFirst(h.filters?.category);
        const label = SECTION_LABELS[section] || '';
        const title = escapeHtml(h.meta && h.meta.title ? h.meta.title : h.url);
        const excerpt = h.excerpt || '';
        const path = category
          ? `<span class="search-modal-hit-path">${escapeHtml(section)} / ${escapeHtml(category)}</span>`
          : '';
        return `
          <a href="${escapeHtml(h.url)}" class="search-modal-hit" data-index="${i}">
            ${label ? `<span class="search-modal-hit-badge">${label}</span>` : ''}
            <span class="search-modal-hit-body">
              <span class="search-modal-hit-title">${title}</span>
              ${path}
              <span class="search-modal-hit-excerpt">${excerpt}</span>
            </span>
          </a>
        `;
      })
      .join('');
    selectedIndex = hits.length > 0 ? 0 : -1;
    updateSelection();
    window.gtag?.('event', 'search', {
      search_term: trimmed,
      result_count: result.results.length,
    });
  }

  function dispatch(rawValue: string): void {
    const { mode, query } = detectMode(rawValue);
    setModeBadge(mode);
    if (mode !== 'search') {
      activeCategoryFilter = null;
      const chipsEl = document.getElementById('search-modal-chips');
      if (chipsEl) {
        chipsEl.hidden = true;
        chipsEl.innerHTML = '';
      }
    }
    if (mode === 'command') return renderCommands(query);
    if (mode === 'tag') return renderTags(query);
    if (mode === 'help') return renderHelp(query);
    void doSearch(query);
  }

  function updateSelection(): void {
    const hits = document.querySelectorAll('.search-modal-hit');
    hits.forEach((el, i) => {
      if (i === selectedIndex) {
        el.classList.add('is-selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('is-selected');
      }
    });
  }

  function activateSelection(): void {
    if (selectedIndex < 0 || !currentItems[selectedIndex]) return;
    const item = currentItems[selectedIndex];
    if (item.kind === 'command' && item.ref) {
      runCommand(item.ref, closeModal);
      return;
    }
    if (item.href) {
      closeModal();
      window.location.href = item.href;
    }
  }

  document.addEventListener('keydown', (e) => {
    const target = e.target;
    const inEditable =
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openModal();
      return;
    }
    if (e.key === '/' && !inEditable) {
      e.preventDefault();
      openModal();
      return;
    }

    const dialog = document.getElementById('search-modal') as HTMLDialogElement | null;
    if (!dialog || !dialog.open) return;

    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (currentItems.length === 0) return;
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      selectedIndex = (selectedIndex + delta + currentItems.length) % currentItems.length;
      updateSelection();
      return;
    }
    if (e.key === 'Enter') {
      if (currentItems.length === 0) return;
      e.preventDefault();
      activateSelection();
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const chipBtn = target.closest<HTMLElement>('[data-chip-category], [data-chip-clear]');
    if (chipBtn) {
      e.preventDefault();
      const cat = chipBtn.getAttribute('data-chip-category');
      activeCategoryFilter = cat === activeCategoryFilter ? null : cat;
      void doSearch(lastQuery);
      return;
    }
    if (target.closest('[data-search-modal-open]')) {
      e.preventDefault();
      openModal();
      return;
    }
    if (target.closest('[data-search-modal-close]')) {
      e.preventDefault();
      closeModal();
      return;
    }
    const dialog = document.getElementById('search-modal') as HTMLDialogElement | null;
    if (dialog && dialog.open && target === dialog) {
      closeModal();
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.id === 'search-modal-input') {
      dispatch(target.value);
    }
  });

  function autoOpenFromQuery(): void {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && q.trim()) {
      openModal(q.trim());
      const cleaned = new URL(location.href);
      cleaned.searchParams.delete('q');
      history.replaceState({}, '', cleaned.toString());
    }
  }
  autoOpenFromQuery();
  document.addEventListener('astro:page-load', autoOpenFromQuery);
}
