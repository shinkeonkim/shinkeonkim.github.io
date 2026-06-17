interface AnimEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  elements: number;
  chapters: number;
  duration: number;
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

function renderCard(e: AnimEntry): string {
  const title = escapeHtml(e.title);
  const desc = e.description
    ? `<p class="mb-2 line-clamp-2 text-sm text-fg-muted">${escapeHtml(e.description)}</p>`
    : '';
  const tagsRow =
    e.tags.length > 0
      ? `<div class="mt-2 flex flex-wrap gap-1 text-[11px] text-fg-muted">${e.tags
          .slice(0, 4)
          .map(
            (t) =>
              `<span class="rounded-md border border-border px-1.5 py-0.5">#${escapeHtml(t)}</span>`,
          )
          .join('')}${e.tags.length > 4 ? `<span class="opacity-60">+${e.tags.length - 4}</span>` : ''}</div>`
      : '';
  return `<a href="/animations/${encodeURIComponent(e.id)}/" class="anim-card group block rounded-lg border border-border bg-surface-elevated p-4 no-underline transition-colors hover:border-accent">
    <div class="mb-1 flex items-start justify-between gap-2">
      <span class="text-base font-semibold text-fg group-hover:text-accent">${title}</span>
      <span class="shrink-0 text-xs text-fg-muted tabular-nums">${(e.duration / 1000).toFixed(1)}s</span>
    </div>
    ${desc}
    <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
      <span class="rounded-md border border-border px-1.5 py-0.5 text-[10px]">${escapeHtml(e.categoryLabel)}</span>
      <span class="font-mono opacity-70">${escapeHtml(e.id)}</span>
    </div>
    <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
      <span>${e.elements} elements</span>
      <span>·</span>
      <span>${e.chapters} chapters</span>
    </div>
    ${tagsRow}
  </a>`;
}

export function setupAnimFilter(): void {
  const filterUi = document.querySelector<HTMLElement>('[data-anim-filter-ui]');
  if (!filterUi || filterUi.dataset.animFilterReady === '1') return;

  const dataEl = document.getElementById('anim-index-data');
  const searchInput = document.querySelector<HTMLInputElement>('[data-anim-search]');
  const defaultList = document.querySelector<HTMLElement>('[data-anim-default-list]');
  const paginationWrap = document.querySelector<HTMLElement>('[data-anim-pagination-wrap]');
  const filteredView = document.querySelector<HTMLElement>('[data-anim-filtered]');
  const filteredCount = document.querySelector<HTMLElement>('[data-anim-filtered-count]');
  const filteredList = document.querySelector<HTMLElement>('[data-anim-filtered-list]');
  const filteredEmpty = document.querySelector<HTMLElement>('[data-anim-filtered-empty]');
  const catButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-anim-category]'),
  );
  const tagButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-anim-tag]'),
  );
  const tagLabel = document.querySelector<HTMLElement>('[data-anim-active-tag-label]');
  const tagPanel = document.querySelector<HTMLDetailsElement>('[data-anim-tag-panel]');

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

  let allEntries: AnimEntry[] = [];
  try {
    allEntries = JSON.parse(dataEl.textContent ?? '[]') as AnimEntry[];
  } catch {
    return;
  }

  filterUi.dataset.animFilterReady = '1';

  const params = new URLSearchParams(window.location.search);
  let query = params.get('search') ?? '';
  let activeCategory = params.get('category') ?? '';
  let activeTag = params.get('tag') ?? '';

  if (query) searchInput.value = query;
  if (activeTag && tagPanel) tagPanel.open = true;

  function syncUrl(): void {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('search', query);
    else url.searchParams.delete('search');
    if (activeCategory) url.searchParams.set('category', activeCategory);
    else url.searchParams.delete('category');
    if (activeTag) url.searchParams.set('tag', activeTag);
    else url.searchParams.delete('tag');
    window.history.replaceState({}, '', url.toString());
  }

  function setFilterState(active: boolean): void {
    if (defaultList) defaultList.hidden = active;
    if (paginationWrap) paginationWrap.hidden = active;
    filteredView!.hidden = !active;
  }

  function render(): void {
    const hasFilter =
      query.trim().length > 0 || activeCategory.length > 0 || activeTag.length > 0;

    for (const btn of catButtons) {
      const v = btn.dataset.animCategory ?? '';
      btn.setAttribute('aria-pressed', v === activeCategory ? 'true' : 'false');
    }
    for (const btn of tagButtons) {
      btn.setAttribute(
        'aria-pressed',
        btn.dataset.animTag === activeTag && activeTag.length > 0 ? 'true' : 'false',
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
      if (activeCategory && e.category !== activeCategory) return false;
      if (activeTag && !e.tags.includes(activeTag)) return false;
      if (q) {
        const haystack = norm(
          `${e.title} ${e.description} ${e.id} ${e.tags.join(' ')} ${e.categoryLabel}`,
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
    filteredList!.innerHTML = filtered.map(renderCard).join('');
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

  for (const btn of catButtons) {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.animCategory ?? '';
      activeCategory = activeCategory === cat ? '' : cat;
      render();
    });
  }

  for (const btn of tagButtons) {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.animTag ?? '';
      activeTag = activeTag === tag ? '' : tag;
      render();
    });
  }

  render();
}
