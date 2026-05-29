import {
  addAppearance,
  addChapter,
  addEffect,
  deleteChapter,
  deleteEffect,
  getCurrentTime,
  getDef,
  getSelection,
  removeAppearance,
  removeTrack,
  removeTrackKeyframe,
  setCurrentTime,
  setSelection,
  setTrackKeyframe,
  setElementValueAtTime,
  subscribe,
  updateAppearance,
  updateCanvas,
  updateChapter,
  updateDuration,
  updateEffect,
  updateElementBase,
  updateMeta,
  updateSettings,
  uniqueChapterId,
  uniqueEffectId,
} from './state';
import type {
  AnimationDef,
  AnimationElement,
  AnimationEffect,
  Appearance,
  Chapter,
  EntryMode,
  ExitMode,
} from '../../animations/schema';
import { captureFocusWithin, restoreFocusWithin } from './studio-focus';
import { alignSelected, distributeSelected, type AlignKind, type DistributeKind } from './studio-align';
import { ungroupElement } from './studio-groups';

let panelEl: HTMLElement | null = null;
const closedSections = new Set<string>();

export function initProperties(root: HTMLElement): void {
  panelEl = root;
  subscribe(render);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('click', onClick);
  root.addEventListener('toggle', onSectionToggle, true);
  root.addEventListener('wheel', onNumberWheel, { passive: false });
  render();
}

function onSectionToggle(e: Event): void {
  const t = e.target as HTMLElement;
  if (!(t instanceof HTMLDetailsElement)) return;
  const name = t.dataset.section;
  if (!name) return;
  if (t.open) closedSections.delete(name);
  else closedSections.add(name);
}

function onNumberWheel(e: WheelEvent): void {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== 'number') return;
  if (document.activeElement !== target) return;
  e.preventDefault();
  const step = Number(target.step) || 1;
  const multiplier = e.shiftKey ? 10 : 1;
  const dir = e.deltaY < 0 ? 1 : -1;
  const newVal = (Number(target.value) || 0) + dir * step * multiplier;
  target.value = String(newVal);
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

function section(name: string, headerInner: string, contentInner: string): string {
  const isOpen = !closedSections.has(name);
  return `<details class="studio-props-section" ${isOpen ? 'open' : ''} data-section="${escapeHtml(name)}">
    <summary class="studio-props-header studio-props-summary">${headerInner}</summary>
    <div class="studio-props-section-body">${contentInner}</div>
  </details>`;
}

function render(): void {
  if (!panelEl) return;
  const focusSnap = captureFocusWithin(panelEl);
  renderInner();
  restoreFocusWithin(panelEl, focusSnap);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textField(label: string, key: string, value: string | undefined): string {
  return `<label class="studio-field">
    <span>${escapeHtml(label)}</span>
    <input type="text" data-prop-key="${escapeHtml(key)}" value="${escapeHtml(value ?? '')}" />
  </label>`;
}

function numberField(label: string, key: string, value: number | undefined, step = 1): string {
  return `<label class="studio-field">
    <span>${escapeHtml(label)}</span>
    <input type="number" step="${step}" data-prop-key="${escapeHtml(key)}" value="${value ?? 0}" />
  </label>`;
}

function colorField(label: string, key: string, value: string | undefined): string {
  const v = value ?? '#000000';
  return `<label class="studio-field studio-field-color">
    <span>${escapeHtml(label)}</span>
    <input type="color" data-prop-key="${escapeHtml(key)}" value="${escapeHtml(v.slice(0, 7))}" />
    <input type="text" data-prop-key="${escapeHtml(key)}" value="${escapeHtml(v)}" />
  </label>`;
}

function checkboxField(label: string, key: string, value: boolean): string {
  return `<label class="studio-field studio-field-checkbox">
    <input type="checkbox" data-prop-key="${escapeHtml(key)}" ${value ? 'checked' : ''} />
    <span>${escapeHtml(label)}</span>
  </label>`;
}

function selectField(label: string, key: string, value: string, options: { value: string; label?: string }[]): string {
  return `<label class="studio-field">
    <span>${escapeHtml(label)}</span>
    <select data-prop-key="${escapeHtml(key)}">
      ${options.map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label ?? o.value)}</option>`).join('')}
    </select>
  </label>`;
}

function renderInner(): void {
  if (!panelEl) return;
  const def = getDef();
  const sel = getSelection();
  if (!def) {
    panelEl.innerHTML = '<p class="studio-props-empty">애니메이션을 열거나 새로 만드세요.</p>';
    return;
  }

  const timeHint = `<span class="studio-step-hint">📍 t = ${getCurrentTime()} ms / ${def.duration} ms</span>`;

  if (sel.kind === 'none') {
    const metaHeader = `<span class="studio-props-header-title">애니메이션 메타</span><span class="studio-props-header-type">${escapeHtml(def.id)}</span>`;
    const metaBody = [
      textField('title', 'meta.title', def.title),
      textField('description', 'meta.description', def.description),
      numberField('duration (ms)', 'meta.duration', def.duration, 100),
      numberField('canvas.width', 'canvas.width', def.canvas.width),
      numberField('canvas.height', 'canvas.height', def.canvas.height),
      colorField('canvas.background', 'canvas.background', def.canvas.background),
    ].join('');
    const settingsHeader = `<span class="studio-props-header-title">설정</span>`;
    const settingsBody = [
      checkboxField('loop', 'settings.loop', def.settings.loop),
      checkboxField('autoplay', 'settings.autoplay', def.settings.autoplay),
      checkboxField('자막 표시 (caption)', 'settings.showCaption', def.settings.showCaption ?? false),
      checkboxField('목차 표시 (chapter list)', 'settings.showChapterList', def.settings.showChapterList ?? false),
    ].join('');
    panelEl.innerHTML = `
      ${timeHint}
      ${section('meta', metaHeader, metaBody)}
      ${section('settings', settingsHeader, settingsBody)}
      <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">목차 (${def.chapters.length})</span></div>
      <button type="button" class="studio-btn" data-add-chapter>＋ 현재 시간에 chapter 추가</button>
      <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">효과 (${def.effects.length})</span></div>
      <div class="studio-add-effect-bar">
        <select id="studio-new-effect-type">
          <option value="highlight">highlight</option>
          <option value="pulse">pulse</option>
          <option value="flow">flow</option>
        </select>
        <button type="button" class="studio-btn" data-add-effect>＋ 효과</button>
      </div>
    `;
    return;
  }

  if (sel.kind === 'elements') {
    const alignBtn = (kind: string, label: string, title: string): string =>
      `<button type="button" class="studio-btn studio-align-btn" data-align="${kind}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${label}</button>`;
    const distributeDisabled = sel.elementIds.length < 3 ? 'disabled' : '';
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">다중 선택</span><span class="studio-props-header-type">${sel.elementIds.length} elements</span></div>
      <p class="studio-props-empty" style="margin-bottom:0.4rem">${sel.elementIds.length}개 element 선택됨.<br/>
      <span style="font-size:0.72rem;color:var(--color-fg-muted)">캔버스 드래그 / 화살표키 = 함께 이동<br/>Delete = 모두 삭제 · ⌘D = 복제<br/>⌘C / ⌘X = 모두 복사 / 잘라내기</span></p>
      <div class="studio-align-section">
        <div class="studio-align-title">정렬</div>
        <div class="studio-align-row">
          ${alignBtn('left', '⫷', '왼쪽 정렬')}
          ${alignBtn('center-h', '⊟', '가로 중앙')}
          ${alignBtn('right', '⫸', '오른쪽 정렬')}
        </div>
        <div class="studio-align-row">
          ${alignBtn('top', '⫶', '위쪽 정렬')}
          ${alignBtn('middle-v', '⊟', '세로 중앙')}
          ${alignBtn('bottom', '⫶', '아래쪽 정렬')}
        </div>
        <div class="studio-align-title" style="margin-top:0.5rem">분포 (≥3개)</div>
        <div class="studio-align-row">
          <button type="button" class="studio-btn studio-align-btn" data-distribute="horizontal" title="가로 균등 분포" ${distributeDisabled}>↔</button>
          <button type="button" class="studio-btn studio-align-btn" data-distribute="vertical" title="세로 균등 분포" ${distributeDisabled}>↕</button>
        </div>
      </div>
      <button type="button" class="studio-btn" data-save-as-asset style="margin-top:0.6rem">📦 자산으로 저장</button>
      <ul style="font-family:var(--font-mono);font-size:0.72rem;color:var(--color-fg-muted);padding-left:1rem;margin:0.6rem 0 0">
        ${sel.elementIds.map((id) => `<li>${escapeHtml(id)}</li>`).join('')}
      </ul>
    `;
    return;
  }

  if (sel.kind === 'element') {
    const el = def.elements.find((e) => e.id === sel.elementId);
    if (!el) {
      setSelection({ kind: 'none' });
      return;
    }
    renderElementForm(def, el);
    return;
  }

  if (sel.kind === 'chapter') {
    const ch = def.chapters.find((c) => c.id === sel.chapterId);
    if (!ch) {
      setSelection({ kind: 'none' });
      return;
    }
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(ch.id)}</span><span class="studio-props-header-type">chapter</span></div>
      ${numberField('time (ms)', 'chapter.time', ch.time, 50)}
      ${textField('label', 'chapter.label', ch.label)}
      ${textField('subtitle', 'chapter.subtitle', ch.subtitle)}
      <button type="button" class="studio-btn studio-btn-danger" data-delete-chapter style="margin-top:0.6rem">🗑 chapter 삭제</button>
    `;
    return;
  }

  if (sel.kind === 'effect') {
    const eff = def.effects.find((e) => e.id === sel.effectId);
    if (!eff) {
      setSelection({ kind: 'none' });
      return;
    }
    const elemOpts = def.elements.map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === eff.elementId ? 'selected' : ''}>${escapeHtml(e.id)}</option>`).join('');
    const typeOpts = (['highlight', 'pulse', 'flow'] as const).map((t) => `<option value="${t}" ${t === eff.type ? 'selected' : ''}>${t}</option>`).join('');
    let specific = '';
    if (eff.type === 'highlight') {
      specific = colorField('color', 'effect.color', eff.color);
    } else if (eff.type === 'pulse') {
      specific = numberField('scale', 'effect.scale', eff.scale, 0.05);
    } else {
      specific = colorField('color', 'effect.color', eff.color) +
        numberField('particles', 'effect.particles', eff.particles, 1) +
        numberField('radius', 'effect.radius', eff.radius, 0.5);
    }
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(eff.id)}</span><span class="studio-props-header-type">effect</span></div>
      <label class="studio-field"><span>type</span><select data-prop-key="effect.type">${typeOpts}</select></label>
      <label class="studio-field"><span>elementId</span><select data-prop-key="effect.elementId">${elemOpts}</select></label>
      ${numberField('time (ms)', 'effect.time', eff.time, 50)}
      ${numberField('duration (ms)', 'effect.duration', eff.duration, 50)}
      ${specific}
      <button type="button" class="studio-btn studio-btn-danger" data-delete-effect style="margin-top:0.6rem">🗑 효과 삭제</button>
    `;
    return;
  }
}

function renderElementForm(def: AnimationDef, el: AnimationElement): void {
  if (!panelEl) return;
  const timeHint = `<span class="studio-step-hint">📍 t = ${getCurrentTime()} ms</span>`;

  if (el.type === 'group') {
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(el.name || el.id)}</span><span class="studio-props-header-type">group · ${el.childIds.length} children</span></div>
      ${textField('name (별칭)', 'el.name', el.name ?? '')}
      <div class="studio-props-empty" style="font-size:0.72rem;margin:0.4rem 0">
        그룹은 자식 요소를 함께 이동합니다.<br/>
        Alt+클릭으로 자식을 직접 선택할 수 있습니다.<br/>
        ⌘⇧G 로 그룹 해제.
      </div>
      <button type="button" class="studio-btn studio-btn-danger" data-ungroup style="margin-top:0.4rem">⬚ 그룹 해제 (⌘⇧G)</button>
      <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">자식 (${el.childIds.length})</span></div>
      <ul style="font-family:var(--font-mono);font-size:0.72rem;color:var(--color-fg-muted);padding-left:1rem;margin:0">
        ${el.childIds.map((cid) => `<li><a href="#" data-select-child="${escapeHtml(cid)}" style="color:inherit">${escapeHtml(cid)}</a></li>`).join('')}
      </ul>
    `;
    return;
  }

  const baseFields = renderBaseFields(el);
  const appearances = renderAppearances(def, el);
  const tracks = renderTracks(el);

  const baseHeader = `<span class="studio-props-header-title">${escapeHtml(el.id)}</span><span class="studio-props-header-type">${escapeHtml(el.type)}</span>`;
  const apHeader = `<span class="studio-props-header-title">출현 (Appearances)</span><button type="button" class="studio-btn studio-btn-small" data-add-appearance>＋</button>`;
  const tracksHeader = `<span class="studio-props-header-title">키프레임 트랙 (${el.tracks.length})</span>`;

  panelEl.innerHTML = `
    ${timeHint}
    ${section('el-base', baseHeader, baseFields)}
    ${section('el-appearances', apHeader, appearances)}
    ${section('el-tracks', tracksHeader, tracks)}
    <div class="studio-props-empty" style="font-size:0.72rem;margin-top:0.5rem">
      base 속성을 변경하면 → t=${getCurrentTime()} ms 에 keyframe 추가<br/>
      트랙이 없는 속성은 base 값이 항상 사용됨
    </div>
  `;
}

function renderBaseFields(el: AnimationElement): string {
  const numberFields: { label: string; key: string; value: number; step?: number }[] = [];
  const colorFields: { label: string; key: string; value: string }[] = [];
  const textFields: { label: string; key: string; value: string }[] = [];
  const e = el as unknown as Record<string, unknown>;

  textFields.push({ label: 'name (별칭)', key: 'name', value: (e.name as string | undefined) ?? '' });

  if (el.type === 'rect' || el.type === 'image' || el.type === 'text') {
    numberFields.push({ label: 'x', key: 'x', value: e.x as number });
    numberFields.push({ label: 'y', key: 'y', value: e.y as number });
  }
  if (el.type === 'rect' || el.type === 'image') {
    numberFields.push({ label: 'width', key: 'width', value: e.width as number });
    numberFields.push({ label: 'height', key: 'height', value: e.height as number });
  }
  if (el.type === 'circle') {
    numberFields.push({ label: 'cx', key: 'cx', value: e.cx as number });
    numberFields.push({ label: 'cy', key: 'cy', value: e.cy as number });
    numberFields.push({ label: 'r', key: 'r', value: e.r as number });
  }
  if (el.type === 'line' || el.type === 'arrow') {
    if (typeof e.x1 === 'number') {
      numberFields.push({ label: 'x1', key: 'x1', value: e.x1 as number });
      numberFields.push({ label: 'y1', key: 'y1', value: e.y1 as number });
      numberFields.push({ label: 'x2', key: 'x2', value: e.x2 as number });
      numberFields.push({ label: 'y2', key: 'y2', value: e.y2 as number });
    }
  }
  if (el.type === 'text') {
    textFields.push({ label: 'content', key: 'content', value: e.content as string });
    numberFields.push({ label: 'fontSize', key: 'fontSize', value: e.fontSize as number });
  }
  if (el.type === 'rect' || el.type === 'circle' || el.type === 'polygon' || el.type === 'path') {
    colorFields.push({ label: 'fill', key: 'fill', value: e.fill as string });
    colorFields.push({ label: 'stroke', key: 'stroke', value: e.stroke as string });
    numberFields.push({ label: 'strokeWidth', key: 'strokeWidth', value: e.strokeWidth as number, step: 0.5 });
  }
  if (el.type === 'line' || el.type === 'arrow') {
    colorFields.push({ label: 'stroke', key: 'stroke', value: e.stroke as string });
    numberFields.push({ label: 'strokeWidth', key: 'strokeWidth', value: e.strokeWidth as number, step: 0.5 });
  }
  if (el.type === 'rect' || el.type === 'circle') {
    if ((e.label as string | undefined) !== undefined) {
      textFields.push({ label: 'label', key: 'label', value: (e.label as string) ?? '' });
      colorFields.push({ label: 'labelColor', key: 'labelColor', value: (e.labelColor as string) ?? '#000' });
    }
  }
  if (el.type === 'text') {
    colorFields.push({ label: 'color', key: 'color', value: e.color as string });
  }
  numberFields.push({ label: 'rotation', key: 'rotation', value: e.rotation as number, step: 5 });

  const html = [
    ...textFields.map((f) => textField(f.label, `el.${f.key}`, f.value)),
    ...numberFields.map((f) => numberField(f.label, `el.${f.key}`, f.value, f.step)),
    ...colorFields.map((f) => colorField(f.label, `el.${f.key}`, f.value)),
  ];
  return html.join('');
}

function renderAppearances(def: AnimationDef, el: AnimationElement): string {
  if (el.appearances.length === 0) {
    return '<p class="studio-props-empty">appearance 없음. 추가하세요.</p>';
  }
  const modes: { value: string; label?: string }[] = [
    { value: 'instant' },
    { value: 'fade' },
    { value: 'slide-left' },
    { value: 'slide-right' },
    { value: 'slide-up' },
    { value: 'slide-down' },
    { value: 'zoom' },
    { value: 'pop' },
  ];
  return el.appearances
    .map((ap, idx) => `
      <div class="studio-appearance-row">
        <div class="studio-appearance-row-head">
          <span class="studio-appearance-row-title">#${idx + 1}</span>
          <button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-remove-appearance="${idx}">✕</button>
        </div>
        ${numberField('start (ms)', `ap.${idx}.start`, ap.start, 50)}
        ${numberField('end (ms)', `ap.${idx}.end`, ap.end, 50)}
        ${selectField('entry', `ap.${idx}.entryMode`, ap.entryMode ?? 'instant', modes)}
        ${numberField('entry dur', `ap.${idx}.entryDuration`, ap.entryDuration, 50)}
        ${selectField('exit', `ap.${idx}.exitMode`, ap.exitMode ?? 'instant', modes)}
        ${numberField('exit dur', `ap.${idx}.exitDuration`, ap.exitDuration, 50)}
      </div>
    `)
    .join('');
}

function renderTracks(el: AnimationElement): string {
  if (el.tracks.length === 0) {
    return '<p class="studio-props-empty" style="font-size:0.72rem">트랙 없음. 시간 t&gt;0 에서 base 속성을 바꾸면 자동 생성됩니다.</p>';
  }
  return el.tracks
    .map((t) => {
      const list = t.keyframes
        .map((kf, idx) => `<li>
          <button type="button" class="studio-tl-kf-btn" data-jump-time="${kf.time}" title="${kf.time}ms 로 이동">t=${kf.time}ms</button>
          <code>${escapeHtml(String(kf.value))}</code>
          <button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-remove-kf-prop="${escapeHtml(t.property)}" data-remove-kf-time="${kf.time}" data-kf-idx="${idx}" title="삭제">✕</button>
        </li>`)
        .join('');
      return `
        <div class="studio-track-row">
          <div class="studio-track-row-head">
            <span class="studio-track-row-prop">${escapeHtml(t.property)}</span>
            <span class="studio-track-row-count">${t.keyframes.length} kf</span>
            <button type="button" class="studio-btn studio-btn-small" data-add-kf="${escapeHtml(t.property)}" title="현재 시간에 keyframe 추가">＋ kf</button>
            <button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-remove-track="${escapeHtml(t.property)}" title="트랙 삭제">✕</button>
          </div>
          <ul class="studio-track-list">${list}</ul>
        </div>
      `;
    })
    .join('');
}

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  const key = target.dataset.propKey;
  if (!key) return;
  let value: string | number | boolean = target.value;
  if (target.type === 'number') value = Number(target.value);
  else if (target.type === 'checkbox') value = target.checked;
  apply(key, value);
}

function onChange(e: Event): void {
  onInput(e);
}

function apply(key: string, value: string | number | boolean): void {
  const def = getDef();
  if (!def) return;
  const sel = getSelection();

  if (key === 'meta.title') updateMeta({ title: String(value) });
  else if (key === 'meta.description') updateMeta({ description: String(value) });
  else if (key === 'meta.duration') updateDuration(Number(value));
  else if (key === 'canvas.width') updateCanvas({ width: Number(value) });
  else if (key === 'canvas.height') updateCanvas({ height: Number(value) });
  else if (key === 'canvas.background') updateCanvas({ background: String(value) });
  else if (key === 'settings.loop') updateSettings({ loop: Boolean(value) });
  else if (key === 'settings.autoplay') updateSettings({ autoplay: Boolean(value) });
  else if (key === 'settings.showCaption') updateSettings({ showCaption: Boolean(value) });
  else if (key === 'settings.showChapterList') updateSettings({ showChapterList: Boolean(value) });
  else if (key.startsWith('el.') && sel.kind === 'element') {
    const prop = key.slice(3);
    const time = getCurrentTime();
    const el = def.elements.find((e) => e.id === sel.elementId);
    if (!el) return;
    const hasTrack = el.tracks.some((t) => t.property === prop);
    if (hasTrack) {
      setTrackKeyframe(sel.elementId, prop, time, value);
    } else {
      updateElementBase(sel.elementId, { [prop]: value });
    }
  } else if (key.startsWith('ap.') && sel.kind === 'element') {
    const [, idxStr, prop] = key.split('.');
    const idx = Number(idxStr);
    const patch: Partial<Appearance> = {};
    if (prop === 'start') patch.start = Number(value);
    else if (prop === 'end') patch.end = Number(value);
    else if (prop === 'entryMode') patch.entryMode = value as EntryMode;
    else if (prop === 'entryDuration') patch.entryDuration = Number(value);
    else if (prop === 'exitMode') patch.exitMode = value as ExitMode;
    else if (prop === 'exitDuration') patch.exitDuration = Number(value);
    updateAppearance(sel.elementId, idx, patch);
  } else if (key === 'chapter.time' && sel.kind === 'chapter') {
    updateChapter(sel.chapterId, { time: Number(value) });
  } else if (key === 'chapter.label' && sel.kind === 'chapter') {
    updateChapter(sel.chapterId, { label: String(value) });
  } else if (key === 'chapter.subtitle' && sel.kind === 'chapter') {
    updateChapter(sel.chapterId, { subtitle: String(value) });
  } else if (key.startsWith('effect.') && sel.kind === 'effect') {
    const prop = key.slice(7);
    const patch: Record<string, unknown> = {};
    if (prop === 'time' || prop === 'duration' || prop === 'scale' || prop === 'particles' || prop === 'radius') {
      patch[prop] = Number(value);
    } else {
      patch[prop] = value;
    }
    updateEffect(sel.effectId, patch as Partial<AnimationEffect>);
  }
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
  const def = getDef();
  if (!def) return;
  const sel = getSelection();

  const alignBtn = target.closest<HTMLElement>('[data-align]');
  if (alignBtn) {
    alignSelected(alignBtn.dataset.align as AlignKind);
    return;
  }
  const distBtn = target.closest<HTMLElement>('[data-distribute]');
  if (distBtn) {
    distributeSelected(distBtn.dataset.distribute as DistributeKind);
    return;
  }

  if (target.closest('[data-ungroup]') && sel.kind === 'element') {
    ungroupElement(sel.elementId);
    return;
  }
  const childLink = target.closest<HTMLElement>('[data-select-child]');
  if (childLink) {
    e.preventDefault();
    setSelection({ kind: 'element', elementId: childLink.dataset.selectChild ?? '' });
    return;
  }

  if (target.closest('[data-add-chapter]')) {
    const id = uniqueChapterId();
    addChapter({ id, time: getCurrentTime(), label: `Chapter ${id.split('-')[1]}`, subtitle: '' });
    return;
  }
  if (target.closest('[data-delete-chapter]') && sel.kind === 'chapter') {
    deleteChapter(sel.chapterId);
    return;
  }
  if (target.closest('[data-add-effect]')) {
    const typeSel = document.getElementById('studio-new-effect-type') as HTMLSelectElement | null;
    const type = (typeSel?.value ?? 'highlight') as 'highlight' | 'pulse' | 'flow';
    const firstEl = def.elements[0];
    if (!firstEl) return;
    const id = uniqueEffectId();
    const base = { id, elementId: firstEl.id, time: getCurrentTime(), duration: 500 };
    let eff: AnimationEffect;
    if (type === 'highlight') eff = { ...base, type: 'highlight', color: '#facc15' };
    else if (type === 'pulse') eff = { ...base, type: 'pulse', scale: 1.12 };
    else eff = { ...base, type: 'flow', color: '#facc15', particles: 3, radius: 4, duration: 800 };
    addEffect(eff);
    return;
  }
  if (target.closest('[data-delete-effect]') && sel.kind === 'effect') {
    deleteEffect(sel.effectId);
    return;
  }
  const removeAp = target.closest<HTMLElement>('[data-remove-appearance]');
  if (removeAp && sel.kind === 'element') {
    const idx = Number(removeAp.dataset.removeAppearance);
    removeAppearance(sel.elementId, idx);
    return;
  }
  const removeTk = target.closest<HTMLElement>('[data-remove-track]');
  if (removeTk && sel.kind === 'element') {
    removeTrack(sel.elementId, removeTk.dataset.removeTrack ?? '');
    return;
  }
  const removeKf = target.closest<HTMLElement>('[data-remove-kf-prop]');
  if (removeKf && sel.kind === 'element') {
    const prop = removeKf.dataset.removeKfProp ?? '';
    const time = Number(removeKf.dataset.removeKfTime ?? '0');
    removeTrackKeyframe(sel.elementId, prop, time);
    return;
  }
  const addKf = target.closest<HTMLElement>('[data-add-kf]');
  if (addKf && sel.kind === 'element') {
    const prop = addKf.dataset.addKf ?? '';
    const el = def.elements.find((e) => e.id === sel.elementId);
    const baseVal = el ? (el as unknown as Record<string, unknown>)[prop] : undefined;
    if (typeof baseVal === 'string' || typeof baseVal === 'number' || typeof baseVal === 'boolean') {
      setTrackKeyframe(sel.elementId, prop, getCurrentTime(), baseVal);
    }
    return;
  }
  const jumpTime = target.closest<HTMLElement>('[data-jump-time]');
  if (jumpTime) {
    setCurrentTime(Number(jumpTime.dataset.jumpTime ?? '0'));
    return;
  }
  const addAp = target.closest('[data-add-appearance]');
  if (addAp && sel.kind === 'element') {
    addAppearance(sel.elementId, { start: getCurrentTime(), end: def.duration, entryDuration: 300, exitDuration: 300 });
    return;
  }
}
