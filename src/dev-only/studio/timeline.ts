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
  uniqueStepId,
} from './state';

let tracksEl: HTMLElement | null = null;
let elementTracksEl: HTMLElement | null = null;

export function initTimeline(
  root: HTMLElement,
  addStepBtn: HTMLButtonElement | null,
  elementTracks?: HTMLElement | null,
): void {
  tracksEl = root;
  elementTracksEl = elementTracks ?? null;
  subscribe(render);
  root.addEventListener('click', onClick);
  elementTracksEl?.addEventListener('click', onElementTrackClick);
  addStepBtn?.addEventListener('click', () => {
    const id = uniqueStepId();
    addStep({ id, label: `Step ${id.split('-')[1]}`, duration: 800, ease: 'easeInOut', keyframes: {}, effects: [] });
  });
  render();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render(): void {
  if (!tracksEl) return;
  const def = getDef();
  if (!def) {
    tracksEl.innerHTML = '<p style="color: var(--color-fg-muted); font-size: 0.8rem;">애니메이션을 먼저 열거나 만드세요.</p>';
    return;
  }
  const totalDur = def.steps.reduce((a, s) => a + s.duration, 0);
  const baseCard = `<div class="studio-timeline-step ${getCurrentStepIdx() === -1 ? 'is-selected' : ''}" data-step-id="__base__">
    <div class="studio-timeline-step-header">
      <span class="studio-timeline-step-label">📍 base</span>
    </div>
    <div class="studio-timeline-step-actions"><div class="studio-timeline-step-action">초기 상태</div></div>
  </div>`;

  if (def.steps.length === 0) {
    tracksEl.innerHTML = baseCard + '<div style="color: var(--color-fg-muted); font-size: 0.75rem; padding: 0.5rem;">＋ Step 추가로 keyframe을 만드세요.</div>';
    return;
  }
  const sel = getSelection();
  const stepsHtml = def.steps
    .map((step, idx) => renderStep(step, idx, sel.kind === 'step' && sel.stepId === step.id, getCurrentStepIdx() === idx, totalDur))
    .join('');
  tracksEl.innerHTML = baseCard + stepsHtml + `<div class="studio-timeline-total">총 ${totalDur}ms</div>`;
  renderElementTracks();
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
  const headerCells = def.steps
    .map((s, i) => `<th data-step-idx="${i}" class="${curStep === i ? 'is-current' : ''}" title="${escapeHtml(s.label)} · ${s.duration}ms">${i + 1}</th>`)
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
          return `<td class="${cellClasses.join(' ')}" data-step-id="${escapeHtml(s.id)}" data-step-idx="${i}" data-elem-id="${escapeHtml(el.id)}">
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
    const stepId = cell.dataset.stepId ?? '';
    const elemId = cell.dataset.elemId ?? '';
    const stepIdx = Number(cell.dataset.stepIdx ?? '-1');
    if (stepIdx >= 0) setCurrentStepIdx(stepIdx);
    setSelection({ kind: 'element', elementId: elemId });
    void stepId;
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

function renderStep(step: AnimationStep, idx: number, selected: boolean, isCurrent: boolean, total: number): string {
  const widthPct = total === 0 ? 100 / Math.max(1, idx + 1) : Math.max(8, (step.duration / total) * 100);
  const keyframeCount = Object.keys(step.keyframes).length;
  const effectsCount = step.effects.length;
  const classes = ['studio-timeline-step'];
  if (selected) classes.push('is-selected');
  if (isCurrent) classes.push('is-active');
  return `
    <div class="${classes.join(' ')}" data-step-id="${escapeHtml(step.id)}" style="flex: 0 0 auto; min-width: ${Math.max(120, widthPct * 4)}px">
      <div class="studio-timeline-step-header">
        <span class="studio-timeline-step-label">${idx + 1}. ${escapeHtml(step.label || step.id)}</span>
        <div style="display:flex;align-items:center;gap:0.15rem">
          <button type="button" class="studio-timeline-step-reorder" data-move="-1" title="앞으로">◀</button>
          <button type="button" class="studio-timeline-step-reorder" data-move="1" title="뒤로">▶</button>
          <button type="button" class="studio-timeline-step-delete" data-delete title="step 삭제">✕</button>
        </div>
      </div>
      <div class="studio-timeline-step-duration">${step.duration}ms · ${step.ease}</div>
      <div class="studio-timeline-step-actions">
        ${keyframeCount > 0 ? `<div class="studio-timeline-step-action">🔑 ${keyframeCount} keyframe</div>` : ''}
        ${effectsCount > 0 ? `<div class="studio-timeline-step-action">✨ ${effectsCount} effect</div>` : ''}
        ${keyframeCount === 0 && effectsCount === 0 ? `<div class="studio-timeline-step-action" style="opacity: 0.5">(빈 step)</div>` : ''}
      </div>
    </div>
  `;
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
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
