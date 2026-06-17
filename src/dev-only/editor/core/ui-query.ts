export interface EditorUi {
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

export function queryEditorUi(): EditorUi | null {
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
