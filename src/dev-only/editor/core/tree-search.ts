export function setupTreeSearchFilter(treeSearchInput: HTMLInputElement): void {
  const applyFilter = (): void => {
    const q = treeSearchInput.value.trim().toLowerCase();
    const treeRoot = document.getElementById('editor-tree-root');
    if (!treeRoot) return;
    const rows = treeRoot.querySelectorAll<HTMLElement>('.editor-tree-row');
    rows.forEach((row) => {
      if (!q) {
        row.classList.remove('is-filter-hidden');
        return;
      }
      const name = row.querySelector<HTMLElement>('[data-tree-name]')?.textContent?.toLowerCase() ?? '';
      if (name.includes(q)) row.classList.remove('is-filter-hidden');
      else row.classList.add('is-filter-hidden');
    });
  };
  treeSearchInput.addEventListener('input', applyFilter);
  treeSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      treeSearchInput.value = '';
      applyFilter();
    }
  });
  new MutationObserver(applyFilter).observe(
    document.getElementById('editor-tree-root') ?? document.body,
    { childList: true, subtree: true },
  );
}
