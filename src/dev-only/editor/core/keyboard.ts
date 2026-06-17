import type { EditorHistory } from '@/dev-only/editor/core/history';
import type { FindReplaceBar } from '@/dev-only/editor/text/find-replace';
import type { GlobalSearch } from '@/dev-only/editor/text/global-search';
import { state } from '@/dev-only/editor/core/state';

interface ShortcutDeps {
  textarea: HTMLTextAreaElement;
  save: () => Promise<void>;
  history: EditorHistory;
  findReplace: FindReplaceBar;
  globalSearch: GlobalSearch;
}

export function bindEditorShortcuts(deps: ShortcutDeps): void {
  const { textarea, save, history, findReplace, globalSearch } = deps;
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (state.current) void save();
      return;
    }
    const inTextarea = e.target === textarea;
    if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      globalSearch.toggle();
      return;
    }
    if (mod && e.key.toLowerCase() === 'f' && inTextarea) {
      e.preventDefault();
      findReplace.show();
      return;
    }
    if (mod && e.key.toLowerCase() === 'z' && inTextarea) {
      e.preventDefault();
      if (e.shiftKey) history.redo();
      else history.undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y' && inTextarea) {
      e.preventDefault();
      history.redo();
    }
  });
}
