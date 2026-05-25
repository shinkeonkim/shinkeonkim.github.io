import type {
  AnimationDef,
  AnimationElement,
  AnimationEffect,
  AnimationStep,
} from '../../animations/schema';
import {
  getDef,
  getSelection,
  setSelection,
  setElementKeyframe,
  setElementBase,
  setElementVisibility,
  clearKeyframeProp,
  updateStep,
  updateMeta,
  updateCanvas,
  updateSettings,
  addEffect,
  removeEffect,
  updateEffect,
  getCurrentSnapshot,
  getCurrentStepIdx,
  subscribe,
} from './state';

const BASE_ONLY_KEYS = new Set(['entryMode', 'exitMode', 'transitionEase', 'fromId', 'toId', 'fromAnchor', 'toAnchor', 'headStart', 'headEnd']);

let panelEl: HTMLElement | null = null;
let isComposing = false;
let pendingRender = false;
let textInputFocused = false;

interface FieldDef {
  label: string;
  key: string;
  type: 'text' | 'number' | 'color' | 'select' | 'checkbox';
  options?: string[];
  step?: number;
}

const FIELDS_BY_TYPE: Record<string, FieldDef[]> = {
  rect: [
    { label: 'x', key: 'x', type: 'number' },
    { label: 'y', key: 'y', type: 'number' },
    { label: 'width', key: 'width', type: 'number' },
    { label: 'height', key: 'height', type: 'number' },
    { label: 'rotation°', key: 'rotation', type: 'number' },
    { label: 'fill', key: 'fill', type: 'color' },
    { label: 'stroke', key: 'stroke', type: 'color' },
    { label: 'strokeWidth', key: 'strokeWidth', type: 'number', step: 0.5 },
    { label: 'cornerRadius', key: 'cornerRadius', type: 'number' },
    { label: 'label', key: 'label', type: 'text' },
    { label: 'labelColor', key: 'labelColor', type: 'color' },
    { label: 'labelSize', key: 'labelSize', type: 'number' },
    { label: 'subtitle', key: 'subtitle', type: 'text' },
  ],
  circle: [
    { label: 'cx', key: 'cx', type: 'number' },
    { label: 'cy', key: 'cy', type: 'number' },
    { label: 'r', key: 'r', type: 'number' },
    { label: 'rotation°', key: 'rotation', type: 'number' },
    { label: 'fill', key: 'fill', type: 'color' },
    { label: 'stroke', key: 'stroke', type: 'color' },
    { label: 'label', key: 'label', type: 'text' },
    { label: 'labelColor', key: 'labelColor', type: 'color' },
  ],
  line: [
    { label: 'fromId', key: 'fromId', type: 'select' },
    { label: 'fromAnchor', key: 'fromAnchor', type: 'select', options: ['auto', 'top', 'right', 'bottom', 'left', 'center'] },
    { label: 'toId', key: 'toId', type: 'select' },
    { label: 'toAnchor', key: 'toAnchor', type: 'select', options: ['auto', 'top', 'right', 'bottom', 'left', 'center'] },
    { label: 'x1 (fixed)', key: 'x1', type: 'number' },
    { label: 'y1 (fixed)', key: 'y1', type: 'number' },
    { label: 'x2 (fixed)', key: 'x2', type: 'number' },
    { label: 'y2 (fixed)', key: 'y2', type: 'number' },
    { label: 'stroke', key: 'stroke', type: 'color' },
    { label: 'strokeWidth', key: 'strokeWidth', type: 'number', step: 0.5 },
    { label: 'strokeDasharray', key: 'strokeDasharray', type: 'text' },
    { label: 'headStart', key: 'headStart', type: 'select', options: ['none', 'arrow', 'triangle', 'triangle-open', 'circle', 'circle-open', 'diamond', 'diamond-open', 'bar'] },
    { label: 'headEnd', key: 'headEnd', type: 'select', options: ['none', 'arrow', 'triangle', 'triangle-open', 'circle', 'circle-open', 'diamond', 'diamond-open', 'bar'] },
  ],
  arrow: [
    { label: 'fromId', key: 'fromId', type: 'select' },
    { label: 'fromAnchor', key: 'fromAnchor', type: 'select', options: ['auto', 'top', 'right', 'bottom', 'left', 'center'] },
    { label: 'toId', key: 'toId', type: 'select' },
    { label: 'toAnchor', key: 'toAnchor', type: 'select', options: ['auto', 'top', 'right', 'bottom', 'left', 'center'] },
    { label: 'x1 (fixed)', key: 'x1', type: 'number' },
    { label: 'y1 (fixed)', key: 'y1', type: 'number' },
    { label: 'x2 (fixed)', key: 'x2', type: 'number' },
    { label: 'y2 (fixed)', key: 'y2', type: 'number' },
    { label: 'curvature', key: 'curvature', type: 'number', step: 5 },
    { label: 'stroke', key: 'stroke', type: 'color' },
    { label: 'strokeWidth', key: 'strokeWidth', type: 'number', step: 0.5 },
    { label: 'strokeDasharray', key: 'strokeDasharray', type: 'text' },
    { label: 'label', key: 'label', type: 'text' },
    { label: 'labelColor', key: 'labelColor', type: 'color' },
    { label: 'headStart', key: 'headStart', type: 'select', options: ['none', 'arrow', 'triangle', 'triangle-open', 'circle', 'circle-open', 'diamond', 'diamond-open', 'bar'] },
    { label: 'headEnd', key: 'headEnd', type: 'select', options: ['none', 'arrow', 'triangle', 'triangle-open', 'circle', 'circle-open', 'diamond', 'diamond-open', 'bar'] },
  ],
  text: [
    { label: 'x', key: 'x', type: 'number' },
    { label: 'y', key: 'y', type: 'number' },
    { label: 'rotation°', key: 'rotation', type: 'number' },
    { label: 'content', key: 'content', type: 'text' },
    { label: 'fontSize', key: 'fontSize', type: 'number' },
    { label: 'fontWeight', key: 'fontWeight', type: 'text' },
    { label: 'color', key: 'color', type: 'color' },
    { label: 'textAnchor', key: 'textAnchor', type: 'select', options: ['start', 'middle', 'end'] },
  ],
  image: [
    { label: 'src', key: 'src', type: 'text' },
    { label: 'x', key: 'x', type: 'number' },
    { label: 'y', key: 'y', type: 'number' },
    { label: 'width', key: 'width', type: 'number' },
    { label: 'height', key: 'height', type: 'number' },
    { label: 'rotation°', key: 'rotation', type: 'number' },
    { label: 'opacity', key: 'opacity', type: 'number', step: 0.1 },
  ],
  path: [
    { label: 'x (translate)', key: 'x', type: 'number' },
    { label: 'y (translate)', key: 'y', type: 'number' },
    { label: 'd (SVG path)', key: 'd', type: 'text' },
    { label: 'fill', key: 'fill', type: 'color' },
    { label: 'stroke', key: 'stroke', type: 'color' },
    { label: 'strokeWidth', key: 'strokeWidth', type: 'number', step: 0.5 },
    { label: 'strokeDasharray', key: 'strokeDasharray', type: 'text' },
    { label: 'rotation°', key: 'rotation', type: 'number' },
    { label: 'opacity', key: 'opacity', type: 'number', step: 0.1 },
  ],
  polygon: [
    { label: 'points', key: 'points', type: 'text' },
    { label: 'fill', key: 'fill', type: 'color' },
    { label: 'stroke', key: 'stroke', type: 'color' },
    { label: 'strokeWidth', key: 'strokeWidth', type: 'number', step: 0.5 },
    { label: 'opacity', key: 'opacity', type: 'number', step: 0.1 },
  ],
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function initProperties(root: HTMLElement): void {
  panelEl = root;
  subscribe(renderWithFocusRetention);
  if (panelEl) {
    panelEl.addEventListener('input', onInput);
    panelEl.addEventListener('change', onInput);
    panelEl.addEventListener('click', onClick);
    panelEl.addEventListener('compositionstart', () => {
      isComposing = true;
    });
    panelEl.addEventListener('compositionend', () => {
      isComposing = false;
      maybeFlushPendingRender();
    });
    panelEl.addEventListener('focusin', (e) => {
      const t = e.target as HTMLElement;
      if (isTextInput(t)) textInputFocused = true;
    });
    panelEl.addEventListener('focusout', (e) => {
      const t = e.target as HTMLElement;
      if (isTextInput(t)) {
        setTimeout(() => {
          const active = document.activeElement as HTMLElement | null;
          if (!active || !panelEl?.contains(active) || !isTextInput(active)) {
            textInputFocused = false;
            maybeFlushPendingRender();
          }
        }, 0);
      }
    });
  }
  renderWithFocusRetention();
}

function isTextInput(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    return t === 'text' || t === 'number' || t === 'search' || t === 'email' || t === 'tel' || t === 'url' || t === 'password';
  }
  return false;
}

function maybeFlushPendingRender(): void {
  if (pendingRender && !isComposing && !textInputFocused) {
    pendingRender = false;
    renderWithFocusRetention();
  }
}

interface FocusSnapshot {
  scope: 'field' | 'effect' | 'add-effect';
  fieldKey?: string;
  effectIdx?: string;
  effectField?: string;
  addEffectControl?: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  scrollTop: number;
}

function captureFocus(): FocusSnapshot | null {
  if (!panelEl) return null;
  const active = document.activeElement as HTMLElement | null;
  if (!active || !panelEl.contains(active)) return null;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement)) {
    return null;
  }
  const scrollTop = panelEl.scrollTop;
  let selectionStart: number | null = null;
  let selectionEnd: number | null = null;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    try {
      selectionStart = active.selectionStart;
      selectionEnd = active.selectionEnd;
    } catch {
      selectionStart = null;
      selectionEnd = null;
    }
  }
  const fieldLabel = active.closest<HTMLElement>('[data-field-key]');
  const effectRow = active.closest<HTMLElement>('[data-effect-idx]');
  const effectField = active.closest<HTMLElement>('[data-effect-field]');
  if (fieldLabel) {
    return { scope: 'field', fieldKey: fieldLabel.dataset.fieldKey, selectionStart, selectionEnd, scrollTop };
  }
  if (effectRow && effectField) {
    return {
      scope: 'effect',
      effectIdx: effectRow.dataset.effectIdx,
      effectField: effectField.dataset.effectField,
      selectionStart,
      selectionEnd,
      scrollTop,
    };
  }
  if (active.id === 'studio-new-effect-type' || active.id === 'studio-new-effect-target') {
    return { scope: 'add-effect', addEffectControl: active.id, selectionStart, selectionEnd, scrollTop };
  }
  return null;
}

function restoreFocus(snap: FocusSnapshot | null): void {
  if (!snap || !panelEl) return;
  panelEl.scrollTop = snap.scrollTop;
  let target: HTMLElement | null = null;
  if (snap.scope === 'field' && snap.fieldKey) {
    target = panelEl.querySelector<HTMLElement>(
      `[data-field-key="${cssEscapeAttr(snap.fieldKey)}"] [data-field-input]`,
    );
  } else if (snap.scope === 'effect' && snap.effectIdx && snap.effectField) {
    target = panelEl.querySelector<HTMLElement>(
      `[data-effect-idx="${cssEscapeAttr(snap.effectIdx)}"] [data-effect-field="${cssEscapeAttr(snap.effectField)}"] [data-effect-input]`,
    );
  } else if (snap.scope === 'add-effect' && snap.addEffectControl) {
    target = document.getElementById(snap.addEffectControl);
  }
  if (!target) return;
  target.focus();
  if (
    snap.selectionStart !== null &&
    snap.selectionEnd !== null &&
    (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
  ) {
    const setRange = target.setSelectionRange?.bind(target);
    if (typeof setRange === 'function') {
      try {
        setRange(snap.selectionStart, snap.selectionEnd);
      } catch {
        return;
      }
    }
  }
}

function cssEscapeAttr(s: string): string {
  return s.replace(/["\\]/g, (m) => `\\${m}`);
}

function renderWithFocusRetention(): void {
  if (isComposing || textInputFocused) {
    pendingRender = true;
    return;
  }
  const snap = captureFocus();
  render();
  if (snap) restoreFocus(snap);
}

function render(): void {
  if (!panelEl) return;
  const def = getDef();
  const sel = getSelection();
  if (!def) {
    panelEl.innerHTML = '<p class="studio-props-empty">애니메이션을 열거나 새로 만드세요.</p>';
    return;
  }

  const stepIdx = getCurrentStepIdx();
  const stepHint =
    stepIdx < 0
      ? '<span class="studio-step-hint">📍 base state (step 추가 전)</span>'
      : `<span class="studio-step-hint">📍 ${escapeHtml(def.steps[stepIdx]?.label || def.steps[stepIdx]?.id || '')} 시점</span>`;

  if (sel.kind === 'none') {
    panelEl.innerHTML = `
      ${stepHint}
      <div class="studio-props-header"><span class="studio-props-header-title">애니메이션 메타</span><span class="studio-props-header-type">${escapeHtml(def.id)}</span></div>
      ${textField('title', 'meta.title', def.title)}
      ${textField('description', 'meta.description', def.description)}
      ${numberField('canvas.width', 'canvas.width', def.canvas.width)}
      ${numberField('canvas.height', 'canvas.height', def.canvas.height)}
      ${colorField('canvas.background', 'canvas.background', def.canvas.background)}
      <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">설정</span></div>
      ${checkboxField('loop', 'settings.loop', def.settings.loop)}
      ${checkboxField('autoplay', 'settings.autoplay', def.settings.autoplay)}
    `;
    return;
  }
  if (sel.kind === 'element') {
    const el = def.elements.find((e) => e.id === sel.elementId);
    if (!el) { setSelection({ kind: 'none' }); return; }
    renderElementForm(def, el, stepIdx);
    return;
  }
  if (sel.kind === 'step') {
    const step = def.steps.find((s) => s.id === sel.stepId);
    if (!step) { setSelection({ kind: 'none' }); return; }
    renderStepForm(def, step);
  }
}

function textField(label: string, key: string, value: string | undefined): string {
  return `<label class="studio-field" data-field-key="${escapeHtml(key)}"><span>${escapeHtml(label)}</span>
    <input type="text" value="${escapeHtml(String(value ?? ''))}" data-field-input /></label>`;
}
function numberField(label: string, key: string, value: number | undefined, step = 1): string {
  return `<label class="studio-field" data-field-key="${escapeHtml(key)}"><span>${escapeHtml(label)}</span>
    <input type="number" step="${step}" value="${value ?? 0}" data-field-input /></label>`;
}
function normalizeHexColor(value: string | undefined): string {
  if (!value) return '#000000';
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return '#' + value.slice(1).split('').map((c) => c + c).join('');
  }
  return '#000000';
}

function colorField(label: string, key: string, value: string | undefined): string {
  const hex = normalizeHexColor(value);
  const isCustom = value && value !== hex;
  const note = isCustom ? ` <span class="studio-color-note" title="원래 값: ${escapeHtml(value!)}">(${escapeHtml(value!)})</span>` : '';
  return `<label class="studio-field" data-field-key="${escapeHtml(key)}"><span>${escapeHtml(label)}${note}</span>
    <input type="color" value="${escapeHtml(hex)}" data-field-input /></label>`;
}
function selectField(label: string, key: string, value: string | undefined, options: { value: string }[]): string {
  const opts = options.map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.value || '— 없음 —')}</option>`).join('');
  return `<label class="studio-field" data-field-key="${escapeHtml(key)}"><span>${escapeHtml(label)}</span>
    <select data-field-input><option value="">— 없음 —</option>${opts}</select></label>`;
}
function checkboxField(label: string, key: string, value: boolean): string {
  return `<label class="studio-field" data-field-key="${escapeHtml(key)}"><span>
    <input type="checkbox" data-field-input ${value ? 'checked' : ''}/> ${escapeHtml(label)}</span></label>`;
}

function renderElementForm(def: AnimationDef, el: AnimationElement, stepIdx: number): void {
  if (!panelEl) return;
  const snap = getCurrentSnapshot();
  const state = snap.get(el.id);
  if (!state) return;
  const fields = FIELDS_BY_TYPE[el.type] ?? [];
  const otherEls = def.elements.filter((e) => e.id !== el.id).map((e) => ({ value: e.id }));

  const currentStepKeyframes =
    stepIdx >= 0 ? def.steps[stepIdx]?.keyframes[el.id] ?? {} : {};
  const overriddenKeys = new Set(Object.keys(currentStepKeyframes));

  const visibleInCurrent = state.visible;
  const visibilityRow = `
    <label class="studio-field" data-field-key="visible">
      <span>이 step 에서 보임 ${overriddenKeys.has('visible') ? '<span class="studio-prop-badge">변경됨</span>' : ''}</span>
      <input type="checkbox" data-field-input ${visibleInCurrent ? 'checked' : ''}/>
    </label>`;

  const fieldsHtml = fields
    .map((f) => {
      const raw = state[f.key];
      const isOverride = overriddenKeys.has(f.key);
      const badge = isOverride ? ` <span class="studio-prop-badge">변경됨 <button type="button" data-clear-key="${escapeHtml(f.key)}" title="이 step의 변경 제거">✕</button></span>` : '';
      let inner = '';
      if (f.type === 'text') inner = textField(f.label, f.key, String(raw ?? ''));
      else if (f.type === 'number') inner = numberField(f.label, f.key, Number(raw ?? 0), f.step);
      else if (f.type === 'color') inner = colorField(f.label, f.key, String(raw ?? '#000000'));
      else if (f.type === 'select') {
        const opts = (f.key === 'fromId' || f.key === 'toId')
          ? otherEls
          : (f.options ?? []).map((v) => ({ value: v }));
        inner = selectField(f.label, f.key, raw ? String(raw) : undefined, opts);
      }
      return inner.replace('<span>', `<span>`).replace(`<span>${escapeHtml(f.label)}</span>`, `<span>${escapeHtml(f.label)}${badge}</span>`);
    })
    .join('');

  const baseEl = el as unknown as Record<string, unknown>;
  const animationFields = `
    <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">애니메이션 동작</span></div>
    ${selectField('entryMode (등장)', 'entryMode', String(baseEl.entryMode ?? 'instant'), ENTRY_MODE_OPTIONS.map((v) => ({ value: v })))}
    ${selectField('exitMode (사라짐)', 'exitMode', String(baseEl.exitMode ?? 'instant'), EXIT_MODE_OPTIONS.map((v) => ({ value: v })))}
    ${selectField('transitionEase (개별)', 'transitionEase', String(baseEl.transitionEase ?? ''), TRANSITION_EASE_OPTIONS.map((v) => ({ value: v })))}
  `;

  panelEl.innerHTML = `
    <div class="studio-step-hint-row"><span class="studio-step-hint">📍 ${stepIdx < 0 ? 'base state' : escapeHtml(def.steps[stepIdx]?.label || def.steps[stepIdx]?.id || '')}</span></div>
    <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(el.id)}</span><span class="studio-props-header-type">${escapeHtml(el.type)}</span></div>
    ${visibilityRow}
    ${fieldsHtml}
    ${animationFields}
  `;
}

const ENTRY_MODE_OPTIONS = ['instant', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'pop'];
const EXIT_MODE_OPTIONS = ENTRY_MODE_OPTIONS;
const TRANSITION_EASE_OPTIONS = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'spring'];

function renderStepForm(def: AnimationDef, step: AnimationStep): void {
  if (!panelEl) return;
  const elementIds = def.elements.map((e) => e.id);
  const overridesHtml =
    Object.keys(step.keyframes).length === 0
      ? '<p class="studio-props-empty">이 step에서 변경된 속성이 없습니다.<br/>요소를 선택해서 속성을 바꾸면 자동으로 keyframe이 생성됩니다.</p>'
      : Object.entries(step.keyframes)
          .map(([elId, kf]) => {
            const keys = Object.keys(kf);
            return `<div class="studio-keyframe-summary"><strong>${escapeHtml(elId)}</strong> <span>${keys.map((k) => `<code>${escapeHtml(k)}</code>`).join(' ')}</span></div>`;
          })
          .join('');

  const effectsHtml = step.effects.length === 0
    ? '<p class="studio-props-empty">효과 없음.</p>'
    : step.effects.map((eff, i) => effectRow(eff, i, elementIds)).join('');

  const elemOptions = elementIds.map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('');

  panelEl.innerHTML = `
    <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(step.id)}</span><span class="studio-props-header-type">step</span></div>
    ${textField('label', 'step.label', step.label)}
    ${numberField('duration (ms)', 'step.duration', step.duration, 50)}
    ${selectField('ease', 'step.ease', step.ease, [{ value: 'linear' }, { value: 'easeIn' }, { value: 'easeOut' }, { value: 'easeInOut' }])}

    <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">Keyframes (${Object.keys(step.keyframes).length})</span></div>
    ${overridesHtml}

    <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">Effects (${step.effects.length})</span></div>
    ${effectsHtml}
    <div class="studio-add-effect-bar">
      <select id="studio-new-effect-type"><option value="highlight">highlight</option><option value="pulse">pulse</option><option value="flow">flow</option></select>
      <select id="studio-new-effect-target">${elemOptions}</select>
      <button type="button" id="studio-add-effect" class="studio-btn">＋ effect</button>
    </div>
  `;
}

function effectRow(eff: AnimationEffect, idx: number, elementIds: string[]): string {
  const elemOpts = elementIds
    .map((id) => `<option value="${escapeHtml(id)}" ${id === eff.elementId ? 'selected' : ''}>${escapeHtml(id)}</option>`)
    .join('');
  let extra = '';
  if (eff.type === 'highlight' || eff.type === 'flow') {
    extra += `<label class="studio-field" data-effect-field="color"><span>color</span><input type="color" value="${escapeHtml((eff as { color: string }).color)}" data-effect-input /></label>`;
  }
  if (eff.type === 'flow') {
    extra += `<label class="studio-field" data-effect-field="particles"><span>particles</span><input type="number" min="1" max="10" value="${(eff as { particles: number }).particles}" data-effect-input /></label>`;
    extra += `<label class="studio-field" data-effect-field="radius"><span>radius</span><input type="number" min="1" step="0.5" value="${(eff as { radius: number }).radius}" data-effect-input /></label>`;
  }
  if (eff.type === 'pulse') {
    extra += `<label class="studio-field" data-effect-field="scale"><span>scale</span><input type="number" min="0.5" max="3" step="0.05" value="${(eff as { scale: number }).scale}" data-effect-input /></label>`;
  }
  return `<div class="studio-effect-row" data-effect-idx="${idx}">
    <div class="studio-effect-header">
      <strong>${escapeHtml(eff.type)}</strong>
      <button type="button" class="studio-element-list-delete" data-delete-effect="${idx}" title="삭제">✕</button>
    </div>
    <label class="studio-field" data-effect-field="elementId"><span>target</span>
      <select data-effect-input>${elemOpts}</select>
    </label>
    <div class="studio-field-row">
      <label class="studio-field" data-effect-field="duration"><span>duration (ms)</span>
        <input type="number" min="0" step="50" value="${eff.duration}" data-effect-input />
      </label>
      <label class="studio-field" data-effect-field="delay"><span>delay (ms)</span>
        <input type="number" min="0" step="50" value="${eff.delay}" data-effect-input />
      </label>
    </div>
    ${extra}
  </div>`;
}

function onInput(e: Event): void {
  const target = e.target as HTMLElement;
  const isEffect = target.matches('[data-effect-input]');
  const isField = target.matches('[data-field-input]');
  if (!isField && !isEffect) return;

  const def = getDef();
  if (!def) return;
  const sel = getSelection();

  if (isEffect) {
    const row = target.closest<HTMLElement>('[data-effect-idx]');
    const fieldLabel = target.closest<HTMLElement>('[data-effect-field]');
    if (!row || !fieldLabel || sel.kind !== 'step') return;
    const idx = Number(row.dataset.effectIdx);
    const key = fieldLabel.dataset.effectField ?? '';
    const input = target as HTMLInputElement | HTMLSelectElement;
    const value: unknown =
      'type' in input && input.type === 'number' ? Number(input.value) : input.value;
    updateEffect(sel.stepId, idx, { [key]: value } as Partial<import('../../animations/schema').AnimationEffect>);
    return;
  }

  const fieldLabel = target.closest<HTMLElement>('[data-field-key]');
  if (!fieldLabel) return;
  const key = fieldLabel.dataset.fieldKey ?? '';
  const input = target as HTMLInputElement | HTMLSelectElement;
  let value: unknown;
  if ('type' in input && input.type === 'checkbox') value = (input as HTMLInputElement).checked;
  else if ('type' in input && input.type === 'number') value = Number(input.value);
  else value = input.value;

  if (sel.kind === 'none') {
    if (key === 'meta.title') updateMeta({ title: String(value) });
    else if (key === 'meta.description') updateMeta({ description: String(value) });
    else if (key === 'canvas.width') updateCanvas({ width: Number(value) });
    else if (key === 'canvas.height') updateCanvas({ height: Number(value) });
    else if (key === 'canvas.background') updateCanvas({ background: String(value) });
    else if (key === 'settings.loop') updateSettings({ loop: Boolean(value) });
    else if (key === 'settings.autoplay') updateSettings({ autoplay: Boolean(value) });
    return;
  }

  if (sel.kind === 'element') {
    if (key === 'visible') {
      setElementVisibility(sel.elementId, Boolean(value));
      return;
    }
    if (BASE_ONLY_KEYS.has(key)) {
      const v = value === '' ? undefined : (value as string);
      setElementBase(sel.elementId, { [key]: v });
      return;
    }
    if (value === '' && ['subtitle', 'label', 'strokeDasharray'].includes(key)) {
      setElementKeyframe(sel.elementId, { [key]: null });
      return;
    }
    setElementKeyframe(sel.elementId, { [key]: value as string | number | boolean });
    return;
  }

  if (sel.kind === 'step') {
    if (key === 'step.label') updateStep(sel.stepId, { label: String(value) });
    else if (key === 'step.duration') updateStep(sel.stepId, { duration: Number(value) });
    else if (key === 'step.ease') updateStep(sel.stepId, { ease: value as AnimationStep['ease'] });
    return;
  }
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
  const clearBtn = target.closest<HTMLElement>('[data-clear-key]');
  if (clearBtn) {
    const key = clearBtn.dataset.clearKey ?? '';
    const sel = getSelection();
    if (sel.kind === 'element') clearKeyframeProp(sel.elementId, key);
    return;
  }
  if (target.matches('#studio-add-effect') || target.closest('#studio-add-effect')) {
    const typeSel = panelEl?.querySelector<HTMLSelectElement>('#studio-new-effect-type');
    const targetSel = panelEl?.querySelector<HTMLSelectElement>('#studio-new-effect-target');
    const sel = getSelection();
    if (!typeSel || !targetSel || sel.kind !== 'step') return;
    const type = typeSel.value as 'highlight' | 'pulse' | 'flow';
    const elementId = targetSel.value;
    if (!elementId) return;
    const eff: AnimationEffect =
      type === 'highlight'
        ? { type: 'highlight', elementId, color: '#facc15', duration: 500, delay: 0 }
        : type === 'pulse'
          ? { type: 'pulse', elementId, scale: 1.12, duration: 500, delay: 0 }
          : { type: 'flow', elementId, color: '#facc15', particles: 3, radius: 4, duration: 800, delay: 0 };
    addEffect(sel.stepId, eff);
    return;
  }
  const delEff = target.closest<HTMLElement>('[data-delete-effect]');
  if (delEff) {
    const idx = Number(delEff.dataset.deleteEffect);
    const sel = getSelection();
    if (sel.kind === 'step') removeEffect(sel.stepId, idx);
  }
}
