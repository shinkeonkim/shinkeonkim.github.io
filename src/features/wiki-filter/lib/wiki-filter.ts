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

  if (query) searchInput.value = query;
  if (activeTag && tagPanel) tagPanel.open = true;

  function syncUrl(): void {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('search', query);
    else url.searchParams.delete('search');
    if (activeTag) url.searchParams.set('tag', activeTag);
    else url.searchParams.delete('tag');
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

    syncUrl();

    if (!hasFilter) {
      setFilterState(false);
      filteredList!.innerHTML = '';
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
      filteredList!.innerHTML = '';
      filteredCount!.textContent = `검색 결과 없음 · 전체 ${allEntries.length}개`;
      filteredEmpty!.classList.remove('hidden');
      return;
    }

    filteredEmpty!.classList.add('hidden');
    filteredCount!.textContent = `검색 결과 ${filtered.length}개 · 전체 ${allEntries.length}개`;
    filteredList!.innerHTML = filtered.map(renderFilteredItem).join('');
  }

  let debounceId: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (debounceId !== null) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      query = searchInput.value;
      render();
    }, 80);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchInput.value) {
      e.preventDefault();
      searchInput.value = '';
      query = '';
      render();
    }
  });

  for (const btn of tagButtons) {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.wikiTag ?? '';
      activeTag = activeTag === tag ? '' : tag;
      render();
    });
  }

  render();
}
