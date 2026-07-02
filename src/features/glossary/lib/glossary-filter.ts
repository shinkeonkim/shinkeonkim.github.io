function norm(s: string): string {
  return s.normalize('NFC').toLowerCase().trim();
}

function itemMatches(item: HTMLElement, query: string): boolean {
  if (!query) return true;
  const title = item.dataset.title ?? '';
  const aliases = item.dataset.aliases ?? '';
  const summary = item.dataset.summary ?? '';
  const category = item.dataset.category ?? '';
  return (
    title.includes(query) ||
    aliases.includes(query) ||
    summary.includes(query) ||
    category.includes(query)
  );
}

function activePanel(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-glossary-view-panel]:not([hidden])');
}

function updateCount(root: HTMLElement, total: number, visible: number): void {
  const el = root.querySelector<HTMLElement>('[data-glossary-count]');
  if (el) {
    el.textContent = visible === total ? `총 ${total}개의 용어` : `${visible} / ${total}개 표시 중`;
  }
  const empty = root.querySelector<HTMLElement>('[data-glossary-empty]');
  if (empty) empty.hidden = visible > 0;
}

function applyFilter(root: HTMLElement, rawQuery: string): void {
  const query = norm(rawQuery);
  const panel = activePanel(root);
  if (!panel) return;

  const items = Array.from(panel.querySelectorAll<HTMLElement>('.glossary-item'));
  let visible = 0;
  for (const item of items) {
    const shown = itemMatches(item, query);
    item.hidden = !shown;
    if (shown) visible++;
  }

  for (const section of panel.querySelectorAll<HTMLElement>('.glossary-section')) {
    const hasVisible = Array.from(section.querySelectorAll<HTMLElement>('.glossary-item')).some(
      (i) => !i.hidden,
    );
    section.hidden = !hasVisible;
  }

  for (const d of panel.querySelectorAll<HTMLDetailsElement>('.glossary-category')) {
    const hasVisible = Array.from(d.querySelectorAll<HTMLElement>('.glossary-item')).some(
      (i) => !i.hidden,
    );
    d.hidden = !hasVisible;
    if (hasVisible && query) d.open = true;
  }

  updateCount(root, items.length, visible);
}

function switchView(root: HTMLElement, view: 'alpha' | 'category', query: string): void {
  const panels = root.querySelectorAll<HTMLElement>('[data-glossary-view-panel]');
  for (const p of panels) {
    p.hidden = p.dataset.glossaryViewPanel !== view;
  }
  const btns = root.querySelectorAll<HTMLButtonElement>('[data-glossary-view]');
  for (const b of btns) {
    b.setAttribute('aria-selected', b.dataset.glossaryView === view ? 'true' : 'false');
  }
  const nav = root.querySelector<HTMLElement>('[data-glossary-nav]');
  if (nav) nav.hidden = view !== 'alpha';
  applyFilter(root, query);
}

export function setupGlossary(): void {
  const root = document.querySelector<HTMLElement>('[data-glossary]');
  if (!root || root.dataset.glossaryReady === '1') return;
  root.dataset.glossaryReady = '1';

  let currentQuery = '';
  const input = root.querySelector<HTMLInputElement>('[data-glossary-search]');
  if (input) {
    input.addEventListener('input', () => {
      currentQuery = input.value;
      applyFilter(root, currentQuery);
    });
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('q');
    if (initial) {
      input.value = initial;
      currentQuery = initial;
    }
  }

  applyFilter(root, currentQuery);

  const toggle = root.querySelector<HTMLElement>('.glossary-view-toggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const btn = t.closest<HTMLButtonElement>('[data-glossary-view]');
      if (!btn) return;
      const view = btn.dataset.glossaryView === 'category' ? 'category' : 'alpha';
      switchView(root, view, currentQuery);
    });
  }
}
