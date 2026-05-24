import { parseFrontmatter } from '@astrojs/markdown-remark';
import { escapeHtml } from './utils';
import type { MarkdownToolbar } from './toolbar';

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

export class FrontmatterPanel {
  private root: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private toolbar: MarkdownToolbar;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(root: HTMLElement, textarea: HTMLTextAreaElement, toolbar: MarkdownToolbar) {
    this.root = root;
    this.textarea = textarea;
    this.toolbar = toolbar;
    this.render();
    this.textarea.addEventListener('input', this.schedule);
  }

  private schedule = (): void => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(), 250);
  };

  private parseCurrent(): Record<string, unknown> {
    const raw = this.textarea.value;
    if (!raw.startsWith('---')) return {};
    try {
      const result = parseFrontmatter(raw) as { frontmatter?: Record<string, unknown> };
      return result.frontmatter ?? {};
    } catch {
      return {};
    }
  }

  private render(): void {
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
      rows.push(
        `<div class="fm-row"><span class="fm-key">${escapeHtml(label)}</span><span class="fm-val">${value}</span></div>`,
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
        <summary class="fm-panel-summary">📑 Frontmatter</summary>
        <div class="fm-panel-grid">
          ${rows.join('')}
        </div>
      </details>
    `;
  }

  refresh(): void {
    this.render();
  }
}
