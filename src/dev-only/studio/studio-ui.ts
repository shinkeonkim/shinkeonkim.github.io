export interface StudioUi {
  app: HTMLElement;
  titleInput: HTMLInputElement;
  idDisplay: HTMLElement;
  status: HTMLElement;
  saveBtn: HTMLButtonElement;
  deleteBtn: HTMLButtonElement;
  newBtn: HTMLButtonElement;
  openBtn: HTMLButtonElement;
  playBtn: HTMLButtonElement;
  restartBtn: HTMLButtonElement;
  speedInput: HTMLInputElement;
  speedValue: HTMLElement;
  canvas: SVGSVGElement;
  elementList: HTMLElement;
  toolsRoot: HTMLElement;
  propsRoot: HTMLElement;
  timelineTracks: HTMLElement;
  elementTracks: HTMLElement;
  addStepBtn: HTMLButtonElement;
  libraryDialog: HTMLDialogElement;
  libraryList: HTMLElement;
  newDialog: HTMLDialogElement;
  newIdInput: HTMLInputElement;
  newTitleInput: HTMLInputElement;
  newCreateBtn: HTMLButtonElement;
  newError: HTMLElement;
  canvasWidthInput: HTMLInputElement;
  canvasHeightInput: HTMLInputElement;
  imageUploadBtn: HTMLButtonElement;
  imageFileInput: HTMLInputElement;
  helpBtn: HTMLButtonElement;
  helpDialog: HTMLDialogElement;
  undoBtn: HTMLButtonElement;
  redoBtn: HTMLButtonElement;
  gridToggleBtn: HTMLButtonElement;
}

export function setStatus(ui: StudioUi, text: string, kind: 'ok' | 'warn' | 'error' = 'ok'): void {
  ui.status.textContent = text;
  ui.status.style.color = kind === 'error' ? '#ef4444' : kind === 'warn' ? '#f59e0b' : 'var(--color-fg-muted)';
}
