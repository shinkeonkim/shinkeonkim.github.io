import { WIKI_PER_PAGE } from '@/shared/config';

interface WikiEntry {
  id: string;
  title: string;
  aliases: string[];
  tags: string[];
  updated: string | null;
  updatedLabel: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function norm(s: string): string {
  return s.normalize('NFC').toLowerCase();
}

function renderFilteredItem(e: WikiEntry): string {
  const title = escapeHtml(e.title);
  const updated =
    e.updated && e.updatedLabel
      ? `<time datetime="${escapeHtml(e.updated)}" class="shrink-0 text-xs text-fg-muted tabular-nums">${escapeHtml(e.updatedLabel)}</time>`
      : '';
  const tagsRow =
    e.tags.length > 0
      ? `<div class="mt-0.5 text-xs text-fg-muted">${e.tags.map((t) => `#${escapeHtml(t)}`).join(' ')}</div>`
      : '';
  return `<li><a href="/wiki/${encodeURIComponent(e.id)}/" class="wiki-list-item group"><div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"><span class="text-base font-medium group-hover:text-accent">${title}</span>${updated}</div>${tagsRow}</a></li>`;
}

// Build the page-number list with ellipses, mirroring src/shared/ui/Pagination.astro.
function buildPageList(currentPage: number, lastPage: number): (number | 'ellipsis')[] {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, i) => i + 1);
  }
  const out: (number | 'ellipsis')[] = [1];
  if (currentPage > 3) out.push('ellipsis');
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(lastPage - 1, currentPage + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (currentPage < lastPage - 2) out.push('ellipsis');
  out.push(lastPage);
  return out;
}

// Mirror Pagination.astro's Tailwind classes. Buttons (not anchors) because the
// page change is client-side state only; no navigation, no full reload.
function renderPagination(currentPage: number, lastPage: number): string {
  if (lastPage <= 1) return '';
  const btnBase = 'rounded-md border px-3 py-1.5 no-underline';
  const btnIdle = `${btnBase} border-border hover:border-accent hover:text-accent`;
  const btnCurrent = `${btnBase} border-accent bg-surface-elevated text-accent`;
  const muted = 'rounded-md border border-border px-3 py-1.5 text-fg-muted opacity-50';

  const prev =
    currentPage > 1
      ? `<button type="button" data-wiki-filter-page="${currentPage - 1}" rel="prev" class="${btnIdle}">← 이전</button>`
      : `<span class="${muted}">← 이전</span>`;
  const next =
    currentPage < lastPage
      ? `<button type="button" data-wiki-filter-page="${currentPage + 1}" rel="next" class="${btnIdle}">다음 →</button>`
      : `<span class="${muted}">다음 →</span>`;

  const pages = buildPageList(currentPage, lastPage)
    .map((p) =>
      p === 'ellipsis'
        ? '<span class="px-2 text-fg-muted">…</span>'
        : `<button type="button" data-wiki-filter-page="${p}" ${p === currentPage ? 'aria-current="page"' : ''} class="${p === currentPage ? btnCurrent : btnIdle}">${p}</button>`,
    )
    .join('');

  return `${prev}${pages}${next}`;
}

export function setupWikiFilter(): void {
  const filterUi = document.querySelector<HTMLElement>('[data-wiki-filter-ui]');
  if (!filterUi || filterUi.dataset.wikiFilterReady === '1') return;

  const dataEl = document.getElementById('wiki-index-data');
  const searchInput = document.querySelector<HTMLInputElement>('[data-wiki-search]');
  const contextEl = document.querySelector<HTMLElement>('[data-wiki-context]');
  const pagesHeaderEl = document.querySelector<HTMLElement>('[data-wiki-pages-header]');
  const defaultListEl = document.querySelector<HTMLElement>('[data-wiki-default-list]');
  const paginationWrapEl = document.querySelector<HTMLElement>('[data-wiki-pagination-wrap]');
  const filteredView = document.querySelector<HTMLElement>('[data-wiki-filtered]');
  const filteredCount = document.querySelector<HTMLElement>('[data-wiki-filtered-count]');
  const filteredList = document.querySelector<HTMLUListElement>('[data-wiki-filtered-list]');
  const filteredEmpty = document.querySelector<HTMLElement>('[data-wiki-filtered-empty]');
  const filteredPagination = document.querySelector<HTMLElement>('[data-wiki-filtered-pagination]');
  const tagButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-wiki-tag]'),
  );
  const tagLabel = document.querySelector<HTMLElement>('[data-wiki-active-tag-label]');
  const tagPanel = document.querySelector<HTMLDetailsElement>('[data-wiki-tag-panel]');

  if (
    !dataEl ||
    !searchInput ||
    !filteredView ||
    !filteredCount ||
    !filteredList ||
    !filteredEmpty
  ) {
    return;
  }

  let allEntries: WikiEntry[] = [];
  try {
    allEntries = JSON.parse(dataEl.textContent ?? '[]') as WikiEntry[];
  } catch {
    return;
  }

  filterUi.dataset.wikiFilterReady = '1';

  // Use 'search' (not 'q') to avoid colliding with the global SearchModal,
  // which auto-opens on '?q=' and strips it from the URL.
  const params = new URLSearchParams(window.location.search);
  let query = params.get('search') ?? '';
  let activeTag = params.get('tag') ?? '';
  let currentPage = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  if (query) searchInput.value = query;
  if (activeTag && tagPanel) tagPanel.open = true;

  function syncUrl(): void {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('search', query);
    else url.searchParams.delete('search');
    if (activeTag) url.searchParams.set('tag', activeTag);
    else url.searchParams.delete('tag');
    if (currentPage > 1) url.searchParams.set('page', String(currentPage));
    else url.searchParams.delete('page');
    window.history.replaceState({}, '', url.toString());
  }

  function setFilterState(active: boolean): void {
    if (contextEl) contextEl.hidden = active;
    if (pagesHeaderEl) pagesHeaderEl.hidden = active;
    if (defaultListEl) defaultListEl.hidden = active;
    if (paginationWrapEl) paginationWrapEl.hidden = active;
    filteredView!.hidden = !active;
  }

  function render(): void {
    const hasFilter = query.trim().length > 0 || activeTag.length > 0;

    for (const btn of tagButtons) {
      btn.setAttribute(
        'aria-pressed',
        btn.dataset.wikiTag === activeTag && activeTag.length > 0 ? 'true' : 'false',
      );
    }

    if (tagLabel) {
      if (activeTag) {
        tagLabel.textContent = `· #${activeTag}`;
        tagLabel.classList.remove('hidden');
      } else {
        tagLabel.textContent = '';
        tagLabel.classList.add('hidden');
      }
    }

    if (!hasFilter) {
      currentPage = 1;
      syncUrl();
      setFilterState(false);
      filteredList!.innerHTML = '';
      if (filteredPagination) {
        filteredPagination.hidden = true;
        filteredPagination.innerHTML = '';
      }
      return;
    }

    const q = norm(query.trim());
    const filtered = allEntries.filter((e) => {
      if (activeTag && !e.tags.includes(activeTag)) return false;
      if (q) {
        const haystack = norm(
          `${e.title} ${e.aliases.join(' ')} ${e.tags.join(' ')}`,
        );
        return haystack.includes(q);
      }
      return true;
    });

    setFilterState(true);

    if (filtered.length === 0) {
      currentPage = 1;
      syncUrl();
      filteredList!.innerHTML = '';
      filteredCount!.textContent = `검색 결과 없음 · 전체 ${allEntries.length}개`;
      filteredEmpty!.classList.remove('hidden');
      if (filteredPagination) {
        filteredPagination.hidden = true;
        filteredPagination.innerHTML = '';
      }
      return;
    }

    const lastPage = Math.max(1, Math.ceil(filtered.length / WIKI_PER_PAGE));
    if (currentPage > lastPage) currentPage = lastPage;
    if (currentPage < 1) currentPage = 1;
    syncUrl();

    const pageStart = (currentPage - 1) * WIKI_PER_PAGE;
    const pageSlice = filtered.slice(pageStart, pageStart + WIKI_PER_PAGE);

    filteredEmpty!.classList.add('hidden');
    const rangeStart = pageStart + 1;
    const rangeEnd = pageStart + pageSlice.length;
    filteredCount!.textContent =
      lastPage > 1
        ? `검색 결과 ${filtered.length}개 중 ${rangeStart}–${rangeEnd} · ${currentPage} / ${lastPage} · 전체 ${allEntries.length}개`
        : `검색 결과 ${filtered.length}개 · 전체 ${allEntries.length}개`;
    filteredList!.innerHTML = pageSlice.map(renderFilteredItem).join('');

    if (filteredPagination) {
      const pagHtml = renderPagination(currentPage, lastPage);
      filteredPagination.innerHTML = pagHtml;
      filteredPagination.hidden = pagHtml.length === 0;
    }
  }

  let debounceId: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (debounceId !== null) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      query = searchInput.value;
      currentPage = 1;
      render();
    }, 80);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchInput.value) {
      e.preventDefault();
      searchInput.value = '';
      query = '';
      currentPage = 1;
      render();
    }
  });

  for (const btn of tagButtons) {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.wikiTag ?? '';
      activeTag = activeTag === tag ? '' : tag;
      currentPage = 1;
      render();
    });
  }

  // Event delegation: pagination buttons are recreated on every render(), so
  // bind once on the persistent container.
  if (filteredPagination) {
    filteredPagination.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest<HTMLElement>('[data-wiki-filter-page]');
      if (!btn) return;
      const next = parseInt(btn.dataset.wikiFilterPage ?? '', 10);
      if (!Number.isFinite(next) || next < 1) return;
      currentPage = next;
      render();
      filteredView!.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  render();
}
