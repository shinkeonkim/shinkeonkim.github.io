import type { StudioUi } from '../studio-ui';
import {
  deleteChapter,
  deleteEffect,
  deleteElement,
  getDef,
  getSelection,
  getSelectedElementIds,
  moveElementToEnd,
  moveElementToFront,
  redo,
  reorderElement,
  setSelection,
  undo,
  updateChapter,
} from '../state';
import {
  copySelection,
  duplicateSelection,
  moveSelectedElement,
  pasteFromClipboard,
} from '../studio-clipboard';
import { isGridEnabled, setGridEnabled } from '../grid';
import { groupElements, isGroup, ungroupElement } from '../studio-groups';
import { openHistoryPanel } from '../studio-history';
import { openPalette } from '../studio-palette';
import { saveCurrent } from '../studio-save-load';
import { handleSelectAll, selectAdjacentElement } from './selection-nav';

export function bindKeyboardShortcuts(ui: StudioUi): void {
  document.addEventListener('keydown', (e) => {
    const inText =
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable);
    const mod = e.metaKey || e.ctrlKey;

    if (e.key === 'Escape') {
      const sel = getSelection();
      if (sel.kind !== 'none') {
        setSelection({ kind: 'none' });
      }
      return;
    }

    if (!inText && !mod && (e.key === '?' || (e.key === '/' && e.shiftKey))) {
      e.preventDefault();
      if (typeof ui.helpDialog.showModal === 'function') ui.helpDialog.showModal();
      else ui.helpDialog.setAttribute('open', '');
      return;
    }

    if (!inText && (e.key === 'Delete' || e.key === 'Backspace')) {
      const sel = getSelection();
      const ids = getSelectedElementIds(sel);
      if (ids.length > 0) {
        e.preventDefault();
        for (const id of ids) deleteElement(id);
        setSelection({ kind: 'none' });
      } else if (sel.kind === 'chapter') {
        e.preventDefault();
        deleteChapter(sel.chapterId);
      } else if (sel.kind === 'effect') {
        e.preventDefault();
        deleteEffect(sel.effectId);
      }
      return;
    }

    if (!inText && !mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const sel = getSelection();
      if (sel.kind === 'chapter' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const def = getDef();
        const ch = def?.chapters.find((c) => c.id === sel.chapterId);
        if (ch) {
          const step = e.shiftKey ? 1000 : 100;
          const dt = e.key === 'ArrowLeft' ? -step : step;
          updateChapter(sel.chapterId, { time: Math.max(0, ch.time + dt) });
          e.preventDefault();
        }
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (moveSelectedElement(dx, dy)) e.preventDefault();
      return;
    }

    if (!inText && !mod && e.key === 'Tab') {
      const sel = getSelection();
      if (sel.kind === 'chapter') {
        const def = getDef();
        if (def && def.chapters.length > 0) {
          const sorted = [...def.chapters].sort((a, b) => a.time - b.time);
          const idx = sorted.findIndex((c) => c.id === sel.chapterId);
          if (idx >= 0) {
            const dir = e.shiftKey ? -1 : 1;
            const nextIdx = (idx + dir + sorted.length) % sorted.length;
            setSelection({ kind: 'chapter', chapterId: sorted[nextIdx].id });
            e.preventDefault();
          }
        }
        return;
      }
      if (selectAdjacentElement(e.shiftKey ? -1 : 1)) e.preventDefault();
      return;
    }

    if (!inText && !mod && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      setGridEnabled(!isGridEnabled());
      return;
    }

    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'a' && !inText) {
      handleSelectAll(e);
      return;
    }
    if (key === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }
    if (key === 'h' && e.shiftKey) {
      e.preventDefault();
      openHistoryPanel();
      return;
    }
    if (key === 's') {
      e.preventDefault();
      void saveCurrent(ui);
      return;
    }
    if (key === 'z' && !inText) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (key === 'y' && !inText) {
      e.preventDefault();
      redo();
      return;
    }
    if ((key === 'c' || key === 'x') && !inText) {
      if (copySelection()) {
        e.preventDefault();
        if (key === 'x') {
          const sel = getSelection();
          const ids = getSelectedElementIds(sel);
          for (const id of ids) deleteElement(id);
          if (ids.length > 0) setSelection({ kind: 'none' });
        }
      }
      return;
    }
    if (key === 'v' && !inText) {
      if (pasteFromClipboard()) {
        e.preventDefault();
      }
      return;
    }
    if (key === 'd' && !inText) {
      if (duplicateSelection()) {
        e.preventDefault();
      }
      return;
    }
    if (key === 'g' && !inText) {
      const sel = getSelection();
      if (e.shiftKey) {
        if (sel.kind === 'element') {
          const def = getDef();
          const el = def?.elements.find((x) => x.id === sel.elementId);
          if (el && isGroup(el)) {
            ungroupElement(sel.elementId);
            e.preventDefault();
          }
        }
      } else if (sel.kind === 'elements' && sel.elementIds.length >= 2) {
        const newId = groupElements(sel.elementIds);
        if (newId) e.preventDefault();
      }
      return;
    }
    if ((e.code === 'BracketRight' || e.code === 'BracketLeft') && !inText) {
      const sel = getSelection();
      const ids = getSelectedElementIds(sel);
      if (ids.length === 0) return;
      const def = getDef();
      if (!def) return;
      e.preventDefault();
      const forward = e.code === 'BracketRight';
      for (const id of ids) {
        if (e.shiftKey) {
          if (forward) moveElementToEnd(id);
          else moveElementToFront(id);
        } else {
          const idx = def.elements.findIndex((x) => x.id === id);
          if (forward && idx < def.elements.length - 1) {
            reorderElement(id, def.elements[idx + 1].id, 'after');
          } else if (!forward && idx > 0) {
            reorderElement(id, def.elements[idx - 1].id, 'before');
          }
        }
      }
    }
  });
}
