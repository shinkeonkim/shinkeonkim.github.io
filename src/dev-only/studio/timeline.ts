import type { AnimationStep } from '../../animations/schema';
import {
  getDef,
  getSelection,
  getCurrentStepIdx,
  setSelection,
  setCurrentStepIdx,
  subscribe,
  addStep,
  deleteStep,
  moveStep,
  updateStep,
  uniqueStepId,
  beginTransient,
  endTransient,
} from './state';

const PX_PER_MS = 0.15;
const MIN_DURATION = 50;
const MAX_DURATION = 30000;
const MIN_BAR_PX = 70;

let tracksEl: HTMLElement | null = null;
let elementTracksEl: HTMLElement | null = null;

interface ResizeState {
  stepId: string;
  startMouseX: number;
  startDuration: number;
}
let resizeState: ResizeState | null = null;

export function initTimeline(
  root: HTMLElement,
  addStepBtn: HTMLButtonElement | null,
  elementTracks?: HTMLElement | null,
): void {
  tracksEl = root;
  elementTracksEl = elementTracks ?? null;
  subscribe(render);
  root.addEventListener('click', onClick);
  root.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  elementTracksEl?.addEventListener('click', onElementTrackClick);
  addStepBtn?.addEventListener('click', () => {
    const id = uniqueStepId();
    addStep({ id, label: `Step ${id.split('-')[1]}`, subtitle: '', duration: 800, ease: 'easeInOut', keyframes: {}, effects: [] });
  });
  render();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stepWidthPx(duration: number): number {
  return Math.max(MIN_BAR_PX, duration * PX_PER_MS);
}

function render(): void {
  if (!tracksEl) return;
  const def = getDef();
  if (!def) {
    tracksEl.innerHTML = '<p style="color: var(--color-fg-muted); font-size: 0.8rem;">애니메이션을 먼저 열거나 만드세요.</p>';
    return;
  }
  const totalDur = def.steps.reduce((a, s) => a + s.duration, 0);
  const sel = getSelection();
  const curIdx = getCurrentStepIdx();

  const baseSelected = curIdx === -1;
  const baseCard = `<div class="studio-tl-base ${baseSelected ? 'is-selected' : ''}" data-step-id="__base__" title="초기 상태">
    <span class="studio-tl-base-label">📍 base</span>
  </div>`;

  if (def.steps.length === 0) {
    tracksEl.innerHTML = `<div class="studio-tl-bars">${baseCard}</div>
      <div class="studio-tl-empty">＋ Step 추가로 keyframe을 만드세요.</div>`;
    renderElementTracks();
    return;
  }

  const barsHtml = def.steps
    .map((step, idx) => renderBar(step, idx, sel.kind === 'step' && sel.stepId === step.id, curIdx === idx))
    .join('');

  tracksEl.innerHTML = `
    <div class="studio-tl-bars">
      ${baseCard}
      ${barsHtml}
    </div>
    <div class="studio-tl-total">총 ${totalDur}ms · ${def.steps.length} step</div>
  `;
  renderElementTracks();
}

function renderBar(step: AnimationStep, idx: number, selected: boolean, isCurrent: boolean): string {
  const widthPx = stepWidthPx(step.duration);
  const keyframeCount = Object.keys(step.keyframes).length;
  const effectsCount = step.effects.length;
  const classes = ['studio-tl-bar'];
  if (selected) classes.push('is-selected');
  if (isCurrent) classes.push('is-active');
  return `
    <div class="${classes.join(' ')}" data-step-id="${escapeHtml(step.id)}" style="width: ${widthPx}px">
      <div class="studio-tl-bar-main">
        <div class="studio-tl-bar-label">${idx + 1}. ${escapeHtml(step.label || step.id)}</div>
        <div class="studio-tl-bar-meta">
          <span class="studio-tl-bar-duration">${step.duration}ms</span>
          <span class="studio-tl-bar-ease">${escapeHtml(step.ease)}</span>
        </div>
        <div class="studio-tl-bar-marks">
          ${keyframeCount > 0 ? `<span title="${keyframeCount} keyframe">🔑${keyframeCount}</span>` : ''}
          ${effectsCount > 0 ? `<span title="${effectsCount} effect">✨${effectsCount}</span>` : ''}
        </div>
      </div>
      <div class="studio-tl-bar-actions">
        <button type="button" data-move="-1" title="앞으로">◀</button>
        <button type="button" data-move="1" title="뒤로">▶</button>
        <button type="button" data-delete title="step 삭제">✕</button>
      </div>
      <div class="studio-tl-bar-handle" data-resize-step="${escapeHtml(step.id)}" title="드래그하여 duration 조정">⋮</div>
    </div>
  `;
}

function renderElementTracks(): void {
  if (!elementTracksEl) return;
  const def = getDef();
  if (!def || def.elements.length === 0 || def.steps.length === 0) {
    elementTracksEl.innerHTML = '';
    return;
  }
  const sel = getSelection();
  const curStep = getCurrentStepIdx();
  const widths = def.steps.map((s) => stepWidthPx(s.duration));
  const headerCells = def.steps
    .map((s, i) => `<th data-step-idx="${i}" class="${curStep === i ? 'is-current' : ''}" style="width:${widths[i]}px;min-width:${widths[i]}px;max-width:${widths[i]}px" title="${escapeHtml(s.label)} · ${s.duration}ms">${i + 1} · ${s.duration}ms</th>`)
    .join('');
  const rowsHtml = def.elements
    .map((el) => {
      const selectedEl =
        sel.kind === 'element' && sel.elementId === el.id ? ' is-selected-element' : '';
      const cells = def.steps
        .map((s, i) => {
          const kf = s.keyframes[el.id];
          const fx = s.effects.find((e) => e.elementId === el.id);
          const hasKf = !!kf && Object.keys(kf).length > 0;
          const hasFx = !!fx;
          const cellClasses = ['studio-el-track-cell'];
          if (curStep === i) cellClasses.push('is-current-step');
          return `<td class="${cellClasses.join(' ')}" style="width:${widths[i]}px;min-width:${widths[i]}px;max-width:${widths[i]}px" data-step-id="${escapeHtml(s.id)}" data-step-idx="${i}" data-elem-id="${escapeHtml(el.id)}">
            ${hasKf ? `<span class="studio-el-track-marker" title="${Object.keys(kf).join(', ')}">🔑</span>` : ''}
            ${hasFx ? `<span class="studio-el-track-marker" title="${fx.type}">✨</span>` : ''}
          </td>`;
        })
        .join('');
      return `<tr data-elem-id="${escapeHtml(el.id)}" class="${selectedEl}">
        <th class="studio-el-track-rowhead">${escapeHtml(el.id)} <span class="studio-el-track-type">${escapeHtml(el.type)}</span></th>
        ${cells}
      </tr>`;
    })
    .join('');

  elementTracksEl.innerHTML = `
    <table class="studio-el-tracks-table">
      <thead><tr><th class="studio-el-track-rowhead">요소 \\ Step</th>${headerCells}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

function onElementTrackClick(e: Event): void {
  const target = e.target as HTMLElement;
  const cell = target.closest<HTMLElement>('.studio-el-track-cell');
  if (cell) {
    const elemId = cell.dataset.elemId ?? '';
    const stepIdx = Number(cell.dataset.stepIdx ?? '-1');
    if (stepIdx >= 0) setCurrentStepIdx(stepIdx);
    setSelection({ kind: 'element', elementId: elemId });
    return;
  }
  const headStep = target.closest<HTMLElement>('th[data-step-idx]');
  if (headStep) {
    const idx = Number(headStep.dataset.stepIdx);
    const def = getDef();
    if (def && def.steps[idx]) setSelection({ kind: 'step', stepId: def.steps[idx].id });
    return;
  }
  const elHead = target.closest<HTMLElement>('tr[data-elem-id]');
  if (elHead) {
    const id = elHead.dataset.elemId ?? '';
    setSelection({ kind: 'element', elementId: id });
  }
}

function onMouseDown(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const handle = target.closest<HTMLElement>('[data-resize-step]');
  if (!handle) return;
  e.preventDefault();
  e.stopPropagation();
  const stepId = handle.dataset.resizeStep ?? '';
  const def = getDef();
  if (!def) return;
  const step = def.steps.find((s) => s.id === stepId);
  if (!step) return;
  beginTransient();
  resizeState = { stepId, startMouseX: e.clientX, startDuration: step.duration };
  document.body.style.cursor = 'col-resize';
}

function onMouseMove(e: MouseEvent): void {
  if (!resizeState) return;
  const dx = e.clientX - resizeState.startMouseX;
  const dMs = Math.round(dx / PX_PER_MS);
  const newDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, resizeState.startDuration + dMs));
  updateStep(resizeState.stepId, { duration: newDuration });
}

function onMouseUp(): void {
  if (!resizeState) return;
  resizeState = null;
  endTransient();
  document.body.style.cursor = '';
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
  if (target.closest('[data-resize-step]')) return;
  const stepEl = target.closest<HTMLElement>('[data-step-id]');
  if (!stepEl) return;
  const stepId = stepEl.dataset.stepId ?? '';
  if (stepId === '__base__') {
    setSelection({ kind: 'none' });
    setCurrentStepIdx(-1);
    return;
  }
  if (target.closest('[data-delete]')) {
    deleteStep(stepId);
    return;
  }
  const moveBtn = target.closest<HTMLElement>('[data-move]');
  if (moveBtn) {
    const dir = Number(moveBtn.dataset.move) === 1 ? 1 : -1;
    moveStep(stepId, dir);
    return;
  }
  setSelection({ kind: 'step', stepId });
}
