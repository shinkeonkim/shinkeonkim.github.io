import { parse as parseYaml } from 'yaml';
import { escapeHtml } from '@/dev-only/editor/lib/utils';
import type { MarkdownToolbar } from '@/dev-only/editor/ui/toolbar';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

function extractFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return {};
  try {
    const parsed = parseYaml(m[1]);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

const KEY_LABEL: Record<string, string> = {
  title: '제목',
  description: '설명',
  date: '날짜',
  updated: '수정일',
  tags: '태그',
  category: '카테고리',
  series: '시리즈',
  cover: '커버',
  coverAlt: '커버 alt',
  thumbnail: '썸네일',
  draft: '비공개',
  references: '출처',
  status: '상태',
  start: '시작일',
  end: '종료일',
  teamSize: '팀 크기',
  role: '역할',
};

const SUMMARY_KEYS = [
  'title',
  'description',
  'date',
  'updated',
  'tags',
  'category',
  'series',
  'cover',
  'coverAlt',
  'thumbnail',
  'draft',
  'status',
];

type EditorKind = 'text' | 'date' | 'number' | 'boolean' | 'select' | 'tags';

interface EditorSpec {
  kind: EditorKind;
  options?: string[];
}

const EDITORS: Record<string, EditorSpec> = {
  title: { kind: 'text' },
  description: { kind: 'text' },
  date: { kind: 'date' },
  updated: { kind: 'date' },
  start: { kind: 'date' },
  end: { kind: 'date' },
  tags: { kind: 'tags' },
  category: { kind: 'text' },
  series: { kind: 'text' },
  cover: { kind: 'text' },
  coverAlt: { kind: 'text' },
  thumbnail: { kind: 'text' },
  role: { kind: 'text' },
  teamSize: { kind: 'number' },
  draft: { kind: 'boolean' },
  status: { kind: 'select', options: ['ongoing', 'completed', 'archived'] },
};

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '<em class="empty">(없음)</em>';
  if (Array.isArray(value)) {
    if (value.length === 0) return '<em class="empty">(빈 배열)</em>';
    return value
      .map((v) => {
        if (typeof v === 'string') return `<span class="fm-pill">${escapeHtml(v)}</span>`;
        if (v && typeof v === 'object') return `<span class="fm-pill">${escapeHtml(JSON.stringify(v))}</span>`;
        return `<span class="fm-pill">${escapeHtml(String(v))}</span>`;
      })
      .join(' ');
  }
  if (typeof value === 'boolean') return value ? '<span class="fm-pill fm-pill-bool">true</span>' : '<span class="fm-pill">false</span>';
  if (value instanceof Date) return escapeHtml(value.toISOString().slice(0, 10));
  return escapeHtml(String(value));
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return '';
}

export class FrontmatterPanel {
  private root: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private toolbar: MarkdownToolbar;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private editingKey: string | null = null;

  constructor(root: HTMLElement, textarea: HTMLTextAreaElement, toolbar: MarkdownToolbar) {
    this.root = root;
    this.textarea = textarea;
    this.toolbar = toolbar;
    this.render();
    this.textarea.addEventListener('input', this.schedule);
    this.root.addEventListener('click', (e) => this.handleRowClick(e));
    this.root.addEventListener('keydown', (e) => this.handleRowKeydown(e));
  }

  private handleRowClick(e: Event): void {
    if (this.editingKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('input,select')) return;
    const row = target.closest<HTMLElement>('.fm-row-editable');
    if (!row) return;
    const key = row.dataset.fmKey ?? '';
    const spec = EDITORS[key];
    if (!spec) return;
    const fm = this.parseCurrent();
    this.startEdit(row, key, spec, fm[key]);
  }

  private handleRowKeydown(e: Event): void {
    const ke = e as KeyboardEvent;
    if (ke.key !== 'Enter' && ke.key !== ' ') return;
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('.fm-row-editable');
    if (!row || row !== target) return;
    e.preventDefault();
    this.handleRowClick(e);
  }

  private schedule = (): void => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(), 250);
  };

  private parseCurrent(): Record<string, unknown> {
    const raw = this.textarea.value;
    if (!raw.startsWith('---')) return {};
    return extractFrontmatter(raw);
  }

  private render(): void {
    if (this.editingKey) return;
    const fm = this.parseCurrent();
    if (Object.keys(fm).length === 0) {
      this.root.hidden = true;
      this.root.innerHTML = '';
      return;
    }
    this.root.hidden = false;
    const rows: string[] = [];
    for (const key of SUMMARY_KEYS) {
      if (!(key in fm)) continue;
      const label = KEY_LABEL[key] ?? key;
      const value = formatValue(fm[key]);
      const editable = key in EDITORS;
      rows.push(
        `<div class="fm-row${editable ? ' fm-row-editable' : ''}" data-fm-key="${escapeHtml(key)}"${editable ? ' role="button" tabindex="0" title="클릭하여 편집"' : ''}><span class="fm-key">${escapeHtml(label)}</span><span class="fm-val">${value}</span></div>`,
      );
    }
    const otherKeys = Object.keys(fm).filter((k) => !SUMMARY_KEYS.includes(k));
    if (otherKeys.length > 0) {
      const items = otherKeys
        .map((k) => `<div class="fm-row fm-extra"><span class="fm-key">${escapeHtml(k)}</span><span class="fm-val">${formatValue(fm[k])}</span></div>`)
        .join('');
      rows.push(`<details class="fm-extras"><summary>+${otherKeys.length} 추가 필드</summary>${items}</details>`);
    }
    this.root.innerHTML = `
      <details class="fm-panel-details" open>
        <summary class="fm-panel-summary">📑 Frontmatter <span class="fm-panel-hint">(클릭하여 편집)</span></summary>
        <div class="fm-panel-grid">
          ${rows.join('')}
        </div>
      </details>
    `;
  }

  private startEdit(row: HTMLElement, key: string, spec: EditorSpec, value: unknown): void {
    if (this.editingKey) return;
    if (spec.kind === 'boolean') {
      const next = !(value === true);
      this.toolbar.upsertFrontmatter({ [key]: next });
      return;
    }
    this.editingKey = key;
    const valSpan = row.querySelector<HTMLElement>('.fm-val');
    if (!valSpan) {
      this.editingKey = null;
      return;
    }
    const original = valSpan.innerHTML;
    const editor = this.buildEditor(spec, value);
    valSpan.innerHTML = '';
    valSpan.appendChild(editor);
    if (editor instanceof HTMLInputElement || editor instanceof HTMLSelectElement) {
      editor.focus();
      if (editor instanceof HTMLInputElement) editor.select();
    }
    let settled = false;
    const clearScheduledRender = (): void => {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    };
    const commit = (): void => {
      if (settled) return;
      settled = true;
      const newVal = this.readEditor(spec, editor);
      this.editingKey = null;
      if (newVal === null) {
        valSpan.innerHTML = original;
        return;
      }
      this.toolbar.upsertFrontmatter({ [key]: newVal });
      clearScheduledRender();
      this.render();
      clearScheduledRender();
    };
    const cancel = (): void => {
      if (settled) return;
      settled = true;
      this.editingKey = null;
      valSpan.innerHTML = original;
      clearScheduledRender();
      this.render();
    };
    editor.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (ke.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });
    editor.addEventListener('blur', () => commit());
  }

  private buildEditor(spec: EditorSpec, value: unknown): HTMLElement {
    if (spec.kind === 'select') {
      const sel = document.createElement('select');
      sel.className = 'fm-edit-input';
      for (const opt of spec.options ?? []) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (value === opt) o.selected = true;
        sel.appendChild(o);
      }
      return sel;
    }
    const input = document.createElement('input');
    input.className = 'fm-edit-input';
    if (spec.kind === 'date') {
      input.type = 'date';
      input.value = toIsoDate(value);
    } else if (spec.kind === 'number') {
      input.type = 'number';
      input.value = typeof value === 'number' ? String(value) : '';
    } else if (spec.kind === 'tags') {
      input.type = 'text';
      input.value = Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
      input.placeholder = '쉼표로 구분 (예: meta, blog, tip)';
    } else {
      input.type = 'text';
      input.value = value === null || value === undefined ? '' : String(value);
    }
    return input;
  }

  private readEditor(spec: EditorSpec, editor: HTMLElement): unknown {
    if (editor instanceof HTMLSelectElement) return editor.value;
    if (!(editor instanceof HTMLInputElement)) return null;
    const raw = editor.value.trim();
    if (spec.kind === 'tags') {
      const tags = raw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      return tags;
    }
    if (spec.kind === 'number') {
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    if (spec.kind === 'date') {
      return raw || null;
    }
    return raw;
  }

  refresh(): void {
    this.render();
  }
}
