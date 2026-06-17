import type { GitPanel } from '@/dev-only/editor/panels/git-panel';
import {
  clearUiState,
  isFreshSaveSnapshot,
  loadUiState,
} from '@/dev-only/editor/core/persistence';
import { COLLECTION_NAMES, type CollectionName } from '@/dev-only/editor/core/state';
import { setStatus } from '@/dev-only/editor/core/status';

interface SessionRestoreDeps {
  treeSearchInput: HTMLInputElement | null;
  previewToggle: HTMLInputElement;
  gitPanel: GitPanel;
  loadFile: (
    collection: CollectionName,
    slug: string,
    opts?: { silent?: boolean; caret?: { start: number; end: number; scrollTop: number } },
  ) => Promise<void>;
}

export async function restoreSession(deps: SessionRestoreDeps): Promise<void> {
  const { treeSearchInput, previewToggle, gitPanel, loadFile } = deps;

  const urlParams = new URLSearchParams(window.location.search);
  const qCollection = urlParams.get('collection');
  const qSlug = urlParams.get('slug');

  if (qCollection && qSlug && COLLECTION_NAMES.includes(qCollection as CollectionName)) {
    try {
      await loadFile(qCollection as CollectionName, qSlug);
    } catch {
      setStatus(`파일을 찾을 수 없습니다: ${qCollection}/${qSlug}`, 'error');
    }
    return;
  }

  const snapshot = loadUiState();
  if (!snapshot) {
    setStatus('준비됨', 'ok');
    return;
  }
  if (snapshot.treeSearch && treeSearchInput) {
    treeSearchInput.value = snapshot.treeSearch;
    treeSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (snapshot.previewOpen && !previewToggle.checked) {
    previewToggle.checked = true;
    previewToggle.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (snapshot.gitPanelOpen) gitPanel.open();

  if (snapshot.current) {
    const silent = isFreshSaveSnapshot(snapshot);
    await loadFile(snapshot.current.collection, snapshot.current.slug, {
      silent,
      caret: {
        start: snapshot.caretStart,
        end: snapshot.caretEnd,
        scrollTop: snapshot.scrollTop,
      },
    });
    if (!silent) clearUiState();
  } else {
    setStatus('준비됨', 'ok');
  }
}
