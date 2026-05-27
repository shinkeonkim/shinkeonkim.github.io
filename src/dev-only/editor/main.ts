import { api } from './api';
import { Autosaver, clearDraft, readDraft } from './autosave';
import { FileOpsController } from './file-ops';
import { FindReplaceBar } from './find-replace';
import { FrontmatterPanel } from './frontmatter-panel';
import { GitPanel } from './git-panel';
import { EditorHistory } from './history';
import { GlobalSearch } from './global-search';
import { ImageDialogController } from './image-dialog';
import { AnimationPicker } from './animation-picker';
import { setupListContinuation } from './list-continuation';
import { confirmModal } from './modal';
import {
  clearUiState,
  isFreshSaveSnapshot,
  loadUiState,
  saveUiState,
  type PersistReason,
  type PersistedUiState,
} from './persistence';
import { PreviewPane } from './preview';
import { ReferencesPicker } from './references-picker';
import { state } from './state';
import { initStatus, setStatus } from './status';
import { FileTree } from './tree';
import { MarkdownToolbar } from './toolbar';
import { UrlPreviewController } from './url-preview';
import { todayIsoDate, todayIsoTime, urlFor } from './utils';
import { WikilinkAutocomplete } from './wikilink';
import type { CollectionName, CurrentFile, Ext } from './state';

function template(collection: CollectionName, slug: string): string {
  const filename = slug.split('/').pop() ?? slug;
  if (collection === 'posts') {
    return `---\ntitle: "${filename}"\ndescription: ""\ndate: ${todayIsoDate()}\ntags: []\ndraft: true\n---\n\n`;
  }
  if (collection === 'notes') {
    return `---\ndate: ${todayIsoTime()}\ntags: []\n---\n\n`;
  }
  if (collection === 'sources') {
    return `---\ntitle: "${filename}"\ntype: website\ntags: []\n---\n\n출처에 대한 간단한 설명을 작성하세요.\n`;
  }
  if (collection === 'projects') {
    return `---\ntitle: "${filename}"\nsummary: ""\nstart: ${todayIsoDate()}\nteamSize: 1\nrole: ""\nstatus: ongoing\nrepos: []\nstack: []\nlinks: []\ntags: []\n---\n\n## 무엇을 만들었나\n\n## 고민\n\n## 담당\n\n`;
  }
  return `---\ntitle: "${filename}"\naliases: []\ntags: []\nupdated: ${todayIsoDate()}\n---\n\n## 개요\n\n`;
}

interface EditorUi {
  status: HTMLElement;
  textarea: HTMLTextAreaElement;
  saveBtn: HTMLButtonElement;
  pathEl: HTMLElement;
  previewToggle: HTMLInputElement;
  previewEl: HTMLElement;
  previewContent: HTMLElement;
  previewLink: HTMLButtonElement;
  splitEl: HTMLElement;
  treeRoot: HTMLElement;
  toolbarRoot: HTMLElement;
  gitPanelRoot: HTMLElement;
  gitToggleBtn: HTMLButtonElement;
  autosaveIndicator: HTMLElement;
}

function queryUi(): EditorUi | null {
  const status = document.getElementById('editor-status');
  const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement | null;
  const saveBtn = document.getElementById('editor-save') as HTMLButtonElement | null;
  const pathEl = document.getElementById('editor-current-path');
  const previewToggle = document.getElementById('editor-preview-toggle') as HTMLInputElement | null;
  const previewEl = document.getElementById('editor-preview');
  const previewContent = document.getElementById('editor-preview-content');
  const previewLink = document.getElementById('editor-preview-link') as HTMLButtonElement | null;
  const splitEl = document.getElementById('editor-split');
  const treeRoot = document.getElementById('editor-tree-root');
  const toolbarRoot = document.querySelector<HTMLElement>('.editor-md-toolbar');
  const gitPanelRoot = document.getElementById('editor-git-panel');
  const gitToggleBtn = document.getElementById('editor-git-toggle') as HTMLButtonElement | null;
  const autosaveIndicator = document.getElementById('editor-autosave-indicator');

  if (
    !status ||
    !textarea ||
    !saveBtn ||
    !pathEl ||
    !previewToggle ||
    !previewEl ||
    !previewContent ||
    !previewLink ||
    !splitEl ||
    !treeRoot ||
    !toolbarRoot ||
    !gitPanelRoot ||
    !gitToggleBtn ||
    !autosaveIndicator
  ) {
    return null;
  }
  return {
    status,
    textarea,
    saveBtn,
    pathEl,
    previewToggle,
    previewEl,
    previewContent,
    previewLink,
    splitEl,
    treeRoot,
    toolbarRoot,
    gitPanelRoot,
    gitToggleBtn,
    autosaveIndicator,
  };
}

export function initEditor(): void {
  const ui = queryUi();
  if (!ui) {
    console.error('[editor] missing required elements');
    return;
  }
  document.body.classList.add('editor-active');
  document.documentElement.classList.add('editor-active');
  const {
    status: statusEl,
    textarea,
    saveBtn,
    pathEl,
    previewToggle,
    previewEl,
    previewContent,
    previewLink,
    splitEl,
    treeRoot,
    toolbarRoot,
    gitPanelRoot,
    gitToggleBtn,
    autosaveIndicator,
  } = ui;

  initStatus(statusEl);

  const referencesPicker = new ReferencesPicker({
    getContent: () => textarea.value,
    setContent: (next) => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = next;
      try {
        textarea.selectionStart = Math.min(start, next.length);
        textarea.selectionEnd = Math.min(end, next.length);
      } catch {
        return;
      }
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    },
  });

  const urlPreview = new UrlPreviewController(textarea);

  const toolbar = new MarkdownToolbar({
    textarea,
    openImagePicker: () => imageDialog.openFor('body'),
    openImageDialogFor: (purpose) => imageDialog.openFor(purpose),
    openReferencesPicker: () => void referencesPicker.open(),
    insertUrlPreview: () => urlPreview.insertNew(),
    toggleUrlPreviewAtCursor: () => urlPreview.toggleAtCursor(),
  });
  toolbar.bind(toolbarRoot);

  const imageDialog = new ImageDialogController(toolbar);
  new AnimationPicker(toolbar).init();

  const preview = new PreviewPane({
    container: previewEl,
    content: previewContent,
    toggle: previewToggle,
    split: splitEl,
    textarea,
    getText: () => textarea.value,
    getExt: () => state.current?.ext ?? '.md',
  });

  const autosaver = new Autosaver(
    () => state.current,
    () => textarea.value,
    (timestamp) => {
      state.lastSavedAt = timestamp;
      autosaveIndicator.textContent = `자동저장 ${new Date(timestamp).toLocaleTimeString('ko-KR')}`;
    },
    (message) => {
      autosaveIndicator.textContent = `⚠ ${message}`;
      setStatus(message, 'error');
    },
  );
  autosaver.start();

  const wikilink = new WikilinkAutocomplete(textarea);
  const history = new EditorHistory(textarea);
  const findReplace = new FindReplaceBar(textarea);
  setupListContinuation(textarea);
  const globalSearch = new GlobalSearch(async (collection, slug, ext, line, column) => {
    void ext;
    await loadFile(collection, slug);
    const value = textarea.value;
    const lines = value.split('\n');
    let offset = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i += 1) {
      offset += lines[i].length + 1;
    }
    offset += Math.min(column - 1, lines[line - 1]?.length ?? 0);
    textarea.focus();
    textarea.setSelectionRange(offset, offset);
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight || '20');
    textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - textarea.clientHeight / 2);
  });

  const frontmatterPanelEl = document.getElementById('editor-frontmatter-panel');
  const frontmatterPanel = frontmatterPanelEl
    ? new FrontmatterPanel(frontmatterPanelEl, textarea, toolbar)
    : null;
  void frontmatterPanel;

  const treeSearchInput = document.getElementById('editor-tree-search') as HTMLInputElement | null;
  if (treeSearchInput) {
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

  function setCurrent(file: CurrentFile | null, caret?: { start: number; end: number; scrollTop: number }): void {
    state.current = file;
    if (file) {
      pathEl.textContent = `${file.collection}/${file.slug}${file.ext}`;
      textarea.disabled = false;
      saveBtn.disabled = false;
      previewLink.style.display = '';
      previewLink.dataset.href = urlFor(file.collection, file.slug);
      tree.setSelection(file);
      tree.expandTo(file);
      autosaver.reset();
    } else {
      pathEl.textContent = '파일을 선택하거나 "새 파일" 을 누르세요';
      textarea.disabled = true;
      saveBtn.disabled = true;
      previewLink.style.display = 'none';
      tree.setSelection(null);
    }
    updateExtToggle();
    textarea.focus();
    if (caret && file) {
      const max = textarea.value.length;
      textarea.selectionStart = Math.min(caret.start, max);
      textarea.selectionEnd = Math.min(caret.end, max);
      textarea.scrollTop = caret.scrollTop;
    }
    void preview.render();
  }

  const tree = new FileTree(treeRoot, {
    onSelectFile: (collection, slug) => void loadFile(collection, slug),
    onContextFile: (collection, slug, anchor) => {
      const ext = (anchor.closest('[data-tree-file]') as HTMLElement | null)?.dataset.ext as Ext;
      void fileOps.fileMenu(collection, slug, ext ?? '.md', anchor);
    },
    onContextFolder: (collection, folder, anchor) =>
      void fileOps.folderMenu(collection, folder, anchor),
    onNewFile: (collection, folder) => void handleNewFile(collection, folder),
    onNewFolder: (collection, folder) => void fileOps.newFolder(collection, folder),
    onRenameFileInline: (collection, slug, ext, name) =>
      fileOps.renameFileInline(collection, slug, ext, name),
    onRenameFolderInline: (collection, folder, name) =>
      fileOps.renameFolderInline(collection, folder, name),
    onDropItem: (item, target) => fileOps.dropItem(item, target),
  });
  void tree.refresh();

  const fileOps = new FileOpsController({
    onChanged: async () => {
      await tree.refresh();
      await wikilink.refresh();
    },
    onFileChanged: (oldFile, newFile) => {
      if (
        oldFile &&
        state.current &&
        state.current.collection === oldFile.collection &&
        state.current.slug === oldFile.slug
      ) {
        if (newFile)
          setCurrent({ collection: newFile.collection, slug: newFile.slug, ext: newFile.ext });
        else {
          textarea.value = '';
          setCurrent(null);
        }
      }
    },
    onFolderChanged: (oldFolder, newFolder) => {
      const cur = state.current;
      if (!cur || cur.collection !== oldFolder.collection) return;
      const prefix = oldFolder.folder ? `${oldFolder.folder}/` : '';
      if (!prefix || !cur.slug.startsWith(prefix)) return;
      const remainder = cur.slug.slice(prefix.length);
      const newSlug = newFolder.folder ? `${newFolder.folder}/${remainder}` : remainder;
      setCurrent({ collection: cur.collection, slug: newSlug, ext: cur.ext });
    },
  });

  const extToggleBtn = document.getElementById('editor-ext-toggle') as HTMLButtonElement | null;
  function updateExtToggle(): void {
    if (!extToggleBtn) return;
    if (!state.current) {
      extToggleBtn.style.display = 'none';
      return;
    }
    extToggleBtn.style.display = '';
    const next: Ext = state.current.ext === '.md' ? '.mdx' : '.md';
    extToggleBtn.textContent = `${state.current.ext} → ${next}`;
    extToggleBtn.title = `현재 ${state.current.ext} · 클릭으로 ${next} 로 변환`;
  }
  extToggleBtn?.addEventListener('click', async () => {
    const cur = state.current;
    if (!cur) return;
    if (state.isDirty) {
      const proceed = await confirmModal({
        title: '변경 사항이 있습니다',
        description: '저장하지 않은 변경 사항이 있습니다. 확장자 변환 전에 저장하시겠습니까?',
        confirmLabel: '저장 후 변환',
        cancelLabel: '취소',
      });
      if (!proceed) return;
      await save();
    }
    const nextExt = await fileOps.toggleExt(cur.collection, cur.slug, cur.ext);
    if (nextExt) updateExtToggle();
  });

  const gitPanel = new GitPanel(gitPanelRoot);
  gitToggleBtn.addEventListener('click', () => gitPanel.toggle());

  async function handleNewFile(collection: CollectionName, folder: string): Promise<void> {
    const result = await fileOps.newFile(collection, folder);
    if (!result) return;
    if (state.isDirty) {
      const proceed = await confirmModal({
        title: '변경 사항이 있습니다',
        description: '현재 파일을 저장하지 않고 새 파일로 전환할까요?',
        confirmLabel: '버리고 전환',
        danger: true,
      });
      if (!proceed) return;
    }
    textarea.value = template(result.collection, result.slug);
    setCurrent(result);
    state.isDirty = true;
    setStatus('새 파일 (저장 안 됨)', 'ok');
  }

  async function loadFile(
    collection: CollectionName,
    slug: string,
    opts?: { silent?: boolean; caret?: { start: number; end: number; scrollTop: number } },
  ): Promise<void> {
    if (state.isDirty && !opts?.silent) {
      const proceed = await confirmModal({
        title: '변경 사항이 있습니다',
        description: '저장하지 않고 다른 파일로 전환할까요?',
        confirmLabel: '버리고 전환',
        danger: true,
      });
      if (!proceed) return;
    }
    setStatus('파일 로딩…');
    try {
      const data = await api.loadFile(collection, slug);
      const file: CurrentFile = { collection, slug, ext: data.ext };
      const draft = readDraft(file);
      let serverContent = data.content;
      let useDraft = false;
      if (draft && draft.content !== serverContent) {
        if (opts?.silent) {
          serverContent = draft.content;
          useDraft = true;
        } else {
          const restore = await confirmModal({
            title: '임시 저장본 발견',
            description: `${new Date(draft.savedAt).toLocaleString('ko-KR')} 에 자동 저장된 미저장 변경 사항이 있습니다. 복원할까요?`,
            confirmLabel: '복원',
            cancelLabel: '버리고 서버 버전 사용',
          });
          if (restore) {
            serverContent = draft.content;
            useDraft = true;
          } else {
            clearDraft(file);
          }
        }
      }
      textarea.value = serverContent;
      state.isDirty = useDraft;
      setCurrent(file, opts?.caret);
      history.reset();
      const okMsg = opts?.silent
        ? useDraft
          ? '세션 복원됨 (미저장 변경 포함)'
          : '세션 복원됨'
        : useDraft
          ? '임시 저장본 복원됨'
          : '로드 완료';
      setStatus(okMsg, 'ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('로드 실패: ' + msg, 'error');
    }
  }

  function captureUiState(reason: PersistReason): PersistedUiState {
    return {
      current: state.current,
      caretStart: textarea.selectionStart,
      caretEnd: textarea.selectionEnd,
      scrollTop: textarea.scrollTop,
      previewOpen: previewToggle.checked,
      treeSearch: treeSearchInput?.value ?? '',
      gitPanelOpen: !gitPanelRoot.hidden,
      savedAt: Date.now(),
      reason,
    };
  }

  function persist(reason: PersistReason): void {
    saveUiState(captureUiState(reason));
  }

  async function save(): Promise<void> {
    const file = state.current;
    if (!file) return;
    setStatus('저장 중…');
    try {
      const data = await api.saveFile({
        collection: file.collection,
        slug: file.slug,
        ext: file.ext,
        content: textarea.value,
      });
      state.isDirty = false;
      setStatus(`저장됨 → ${data.path} (${data.bytes}B)`, 'ok');
      clearDraft(file);
      autosaver.reset();
      persist('save');
      await tree.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('저장 실패: ' + msg, 'error');
    }
  }

  saveBtn.addEventListener('click', () => void save());
  textarea.addEventListener('input', () => {
    state.isDirty = true;
    preview.schedule();
  });

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

  textarea.addEventListener('dragover', (e) => {
    e.preventDefault();
    textarea.classList.add('editor-drag-hover');
  });
  textarea.addEventListener('dragleave', () => textarea.classList.remove('editor-drag-hover'));
  textarea.addEventListener('drop', async (e) => {
    e.preventDefault();
    textarea.classList.remove('editor-drag-hover');
    const file = e.dataTransfer?.files?.[0];
    if (file) await imageDialog.handleDroppedFile(file);
  });

  textarea.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await imageDialog.handleDroppedFile(file);
        return;
      }
    }
  });

  previewLink.addEventListener('click', () => {
    if (previewLink.dataset.href) window.open(previewLink.dataset.href, '_blank', 'noopener');
  });

  window.addEventListener('beforeunload', (e) => {
    persist('unload');
    if (state.isDirty) e.preventDefault();
  });

  document.documentElement.classList.add('editor-active');

  textarea.disabled = true;
  saveBtn.disabled = true;

  void (async () => {
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
  })();
}
