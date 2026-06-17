import type { StudioUi } from '../studio-ui';

export function queryUi(): StudioUi | null {
  const app = document.getElementById('studio-app');
  if (!app) return null;
  const $ = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

  const titleInput = $<HTMLInputElement>('studio-title');
  const idDisplay = $<HTMLElement>('studio-id-display');
  const status = $<HTMLElement>('studio-status');
  const saveBtn = $<HTMLButtonElement>('studio-save');
  const deleteBtn = $<HTMLButtonElement>('studio-delete');
  const newBtn = $<HTMLButtonElement>('studio-new');
  const openBtn = $<HTMLButtonElement>('studio-open');
  const playBtn = $<HTMLButtonElement>('studio-play');
  const restartBtn = $<HTMLButtonElement>('studio-restart');
  const speedInput = $<HTMLInputElement>('studio-speed');
  const speedValue = $<HTMLElement>('studio-speed-value');
  const canvas = document.getElementById('studio-canvas') as SVGSVGElement | null;
  const elementList = $<HTMLElement>('studio-element-list');
  const toolsRoot = app.querySelector<HTMLElement>('.studio-tools');
  const propsRoot = $<HTMLElement>('studio-props-content');
  const timelineTracks = $<HTMLElement>('studio-timeline-tracks');
  const elementTracks = $<HTMLElement>('studio-element-tracks');
  const addStepBtn = $<HTMLButtonElement>('studio-add-step');
  const libraryDialog = $<HTMLDialogElement>('studio-library-dialog');
  const libraryList = $<HTMLElement>('studio-library-list');
  const newDialog = $<HTMLDialogElement>('studio-new-dialog');
  const newIdInput = $<HTMLInputElement>('studio-new-id');
  const newTitleInput = $<HTMLInputElement>('studio-new-title');
  const newCreateBtn = $<HTMLButtonElement>('studio-new-create');
  const newError = $<HTMLElement>('studio-new-error');
  const canvasWidthInput = $<HTMLInputElement>('studio-canvas-width');
  const canvasHeightInput = $<HTMLInputElement>('studio-canvas-height');
  const imageUploadBtn = $<HTMLButtonElement>('studio-image-upload');
  const imageFileInput = $<HTMLInputElement>('studio-image-file');
  const helpBtn = $<HTMLButtonElement>('studio-help');
  const helpDialog = $<HTMLDialogElement>('studio-help-dialog');
  const undoBtn = $<HTMLButtonElement>('studio-undo');
  const redoBtn = $<HTMLButtonElement>('studio-redo');
  const gridToggleBtn = $<HTMLButtonElement>('studio-grid-toggle');

  if (
    !titleInput || !idDisplay || !status || !saveBtn || !deleteBtn || !newBtn || !openBtn ||
    !playBtn || !restartBtn || !speedInput || !speedValue || !canvas || !elementList || !toolsRoot ||
    !propsRoot || !timelineTracks || !elementTracks || !addStepBtn || !libraryDialog || !libraryList || !newDialog ||
    !newIdInput || !newTitleInput || !newCreateBtn || !newError ||
    !canvasWidthInput || !canvasHeightInput || !imageUploadBtn || !imageFileInput || !helpBtn || !helpDialog ||
    !undoBtn || !redoBtn || !gridToggleBtn
  ) {
    return null;
  }

  return {
    app, titleInput, idDisplay, status, saveBtn, deleteBtn, newBtn, openBtn,
    playBtn, restartBtn, speedInput, speedValue, canvas, elementList, toolsRoot,
    propsRoot, timelineTracks, elementTracks, addStepBtn, libraryDialog, libraryList, newDialog,
    newIdInput, newTitleInput, newCreateBtn, newError,
    canvasWidthInput, canvasHeightInput, imageUploadBtn, imageFileInput, helpBtn, helpDialog,
    undoBtn, redoBtn, gridToggleBtn,
  };
}
