import { setStatus } from './status';
import { openModal } from './modal';

export interface ToolbarDeps {
  textarea: HTMLTextAreaElement;
  openImagePicker: () => void;
  openImageDialogFor: (purpose: 'cover' | 'thumbnail') => void;
  openReferencesPicker: () => void;
}

interface Selection {
  start: number;
  end: number;
  before: string;
  selected: string;
  after: string;
}

const CWO_SINGLE = `<CodeWithOutput
  language="bash"
  label="$ bash"
  outputLanguage="text"
  outputLabel="stdout"
  title="제목"
  code={\`echo "Hello"\`}
  output={\`Hello\`}
/>`;

const CWO_MULTI = `<CodeWithOutput
  outputLanguage="text"
  outputLabel="stdout"
  title="멀티 언어 데모"
  output={\`결과\`}
  variants={[
    { label: 'python', language: 'python', code: \`print("hi")\` },
    { label: 'typescript', language: 'ts', code: \`console.log("hi")\` },
  ]}
/>`;

const MERMAID_TEMPLATES: Record<string, string> = {
  flowchart: '```mermaid\nflowchart LR\n  A[시작] --> B{판단}\n  B -->|예| C[처리]\n  B -->|아니오| D[종료]\n```',
  sequence: '```mermaid\nsequenceDiagram\n  participant A as 클라이언트\n  participant B as 서버\n  A->>B: 요청\n  B-->>A: 응답\n```',
  state: '```mermaid\nstateDiagram-v2\n  [*] --> Idle\n  Idle --> Running: start\n  Running --> Idle: stop\n  Running --> [*]: done\n```',
  class: '```mermaid\nclassDiagram\n  class Animal {\n    +String name\n    +eat()\n  }\n  class Dog\n  Animal <|-- Dog\n```',
  er: '```mermaid\nerDiagram\n  POST ||--o{ TAG_LINK : has\n  TAG ||--o{ TAG_LINK : tagged\n  POST {\n    string slug PK\n    string title\n  }\n```',
};

export class MarkdownToolbar {
  private textarea: HTMLTextAreaElement;
  private deps: ToolbarDeps;

  constructor(deps: ToolbarDeps) {
    this.deps = deps;
    this.textarea = deps.textarea;
  }

  bind(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-md]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.dataset.md;
        if (key) void this.handle(key);
        this.closeMenus(root);
      });
    });

    root.querySelectorAll<HTMLElement>('[data-md-menu]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = btn.dataset.mdMenu;
        const menu = root.querySelector<HTMLElement>(`[data-menu="${key}"]`);
        const willOpen = menu && menu.hidden;
        this.closeMenus(root);
        if (willOpen && menu) {
          menu.hidden = false;
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.editor-md-dropdown')) this.closeMenus(root);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeMenus(root);
    });

    this.textarea.addEventListener('keydown', (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        this.wrapSel('**', '**', '굵게');
      } else if (key === 'i') {
        e.preventDefault();
        this.wrapSel('*', '*', '기울임');
      } else if (key === 'k') {
        e.preventDefault();
        void this.handleLink();
      }
    });
  }

  private closeMenus(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('.editor-md-menu').forEach((m) => (m.hidden = true));
    root.querySelectorAll<HTMLElement>('[data-md-menu]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  private getSel(): Selection {
    const { selectionStart, selectionEnd, value } = this.textarea;
    return {
      start: selectionStart,
      end: selectionEnd,
      before: value.slice(0, selectionStart),
      selected: value.slice(selectionStart, selectionEnd),
      after: value.slice(selectionEnd),
    };
  }

  setValue(newValue: string, selStart?: number, selEnd?: number): void {
    this.textarea.value = newValue;
    if (selStart !== undefined) {
      this.textarea.selectionStart = selStart;
      this.textarea.selectionEnd = selEnd ?? selStart;
    }
    this.textarea.focus();
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  wrapSel(prefix: string, suffix: string, placeholder: string): void {
    const s = this.getSel();
    const text = s.selected || placeholder;
    const newValue = s.before + prefix + text + suffix + s.after;
    const startAt = s.start + prefix.length;
    this.setValue(newValue, startAt, startAt + text.length);
  }

  prefixLines(prefix: string): void {
    const s = this.getSel();
    const value = this.textarea.value;
    const lineStart = value.lastIndexOf('\n', s.start - 1) + 1;
    let lineEnd = value.indexOf('\n', s.end);
    if (lineEnd < 0) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const transformed = block
      .split('\n')
      .map((l) => (l.startsWith(prefix) ? l : prefix + l))
      .join('\n');
    const next = value.slice(0, lineStart) + transformed + value.slice(lineEnd);
    this.setValue(next, lineStart + transformed.length, lineStart + transformed.length);
  }

  insertBlock(text: string): void {
    const s = this.getSel();
    const needLead = s.before && !s.before.endsWith('\n\n') ? (s.before.endsWith('\n') ? '\n' : '\n\n') : '';
    const needTrail = s.after && !s.after.startsWith('\n') ? '\n\n' : '\n';
    const block = needLead + text + needTrail;
    const next = s.before + block + s.after;
    const cursor = s.before.length + needLead.length + text.length;
    this.setValue(next, cursor, cursor);
  }

  private async handleLink(): Promise<void> {
    const result = await openModal({
      title: '링크 삽입',
      fields: [
        { name: 'url', label: 'URL', placeholder: 'https://…', required: true },
        { name: 'text', label: '표시 텍스트', placeholder: '비우면 URL 사용' },
      ],
      confirmLabel: '삽입',
    });
    if (!result.confirmed) return;
    const url = result.values.url.trim();
    if (!url) return;
    const s = this.getSel();
    const text = s.selected || result.values.text.trim() || url;
    const next = s.before + '[' + text + '](' + url + ')' + s.after;
    const cursor = s.before.length + text.length + url.length + 4;
    this.setValue(next, cursor, cursor);
  }

  upsertFrontmatter(updates: Record<string, unknown>): void {
    const raw = this.textarea.value;
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---(\n|$)/);
    let existingLines: string[] = [];
    let rest = raw;
    if (fmMatch) {
      existingLines = fmMatch[1].split('\n');
      rest = raw.slice(fmMatch[0].length);
    }
    const updated = new Set<string>();
    const out: string[] = [];
    for (const line of existingLines) {
      const m = line.match(/^([\w-]+)\s*:/);
      if (m && Object.prototype.hasOwnProperty.call(updates, m[1])) {
        const v = updates[m[1]];
        if (v === null || v === undefined) {
          updated.add(m[1]);
          continue;
        }
        out.push(serializeYamlPair(m[1], v));
        updated.add(m[1]);
      } else {
        out.push(line);
      }
    }
    for (const [k, v] of Object.entries(updates)) {
      if (!updated.has(k) && v !== null && v !== undefined) out.push(serializeYamlPair(k, v));
    }
    const newFm = '---\n' + out.join('\n') + '\n---\n';
    const trimmedRest = rest.replace(/^\n+/, '');
    const next = newFm + (trimmedRest ? '\n' + trimmedRest : '\n');
    this.setValue(next, newFm.length, newFm.length);
    setStatus(`frontmatter 갱신: ${Object.keys(updates).join(', ')}`, 'ok');
  }

  private async handle(key: string): Promise<void> {
    switch (key) {
      case 'bold':
        this.wrapSel('**', '**', '굵게');
        break;
      case 'italic':
        this.wrapSel('*', '*', '기울임');
        break;
      case 'strike':
        this.wrapSel('~~', '~~', '취소선');
        break;
      case 'code':
        this.wrapSel('`', '`', 'code');
        break;
      case 'link':
        await this.handleLink();
        break;
      case 'image':
        this.deps.openImagePicker();
        break;
      case 'h1':
        this.prefixLines('# ');
        break;
      case 'h2':
        this.prefixLines('## ');
        break;
      case 'h3':
        this.prefixLines('### ');
        break;
      case 'ul':
        this.prefixLines('- ');
        break;
      case 'ol':
        this.prefixLines('1. ');
        break;
      case 'task':
        this.prefixLines('- [ ] ');
        break;
      case 'quote':
        this.prefixLines('> ');
        break;
      case 'codeblock': {
        const r = await openModal({
          title: '코드 블록 삽입',
          fields: [{ name: 'lang', label: '언어 (예: ts, python, bash)', placeholder: '비우면 일반 코드' }],
          confirmLabel: '삽입',
        });
        if (!r.confirmed) return;
        const lang = r.values.lang.trim();
        const s = this.getSel();
        const text = s.selected || '코드';
        this.insertBlock('```' + lang + '\n' + text + '\n```');
        break;
      }
      case 'table':
        this.insertBlock('| 컬럼1 | 컬럼2 | 컬럼3 |\n|---|---|---|\n| 셀1 | 셀2 | 셀3 |\n| 셀4 | 셀5 | 셀6 |');
        break;
      case 'hr':
        this.insertBlock('---');
        break;
      case 'callout-note':
        this.insertBlock('> [!NOTE]\n> 정보 내용');
        break;
      case 'callout-tip':
        this.insertBlock('> [!TIP]\n> 팁 내용');
        break;
      case 'callout-important':
        this.insertBlock('> [!IMPORTANT]\n> 중요한 내용');
        break;
      case 'callout-warning':
        this.insertBlock('> [!WARNING]\n> 경고 내용');
        break;
      case 'callout-caution':
        this.insertBlock('> [!CAUTION]\n> 주의 내용');
        break;
      case 'cwo-single':
        this.insertBlock(CWO_SINGLE);
        break;
      case 'cwo-multi':
        this.insertBlock(CWO_MULTI);
        break;
      case 'mermaid-flowchart':
      case 'mermaid-sequence':
      case 'mermaid-state':
      case 'mermaid-class':
      case 'mermaid-er': {
        const name = key.replace('mermaid-', '');
        this.insertBlock(MERMAID_TEMPLATES[name]);
        break;
      }
      case 'wikilink':
        this.wrapSel('[[', ']]', '페이지명');
        break;
      case 'fm-cover':
        this.deps.openImageDialogFor('cover');
        break;
      case 'fm-thumbnail':
        this.deps.openImageDialogFor('thumbnail');
        break;
      case 'fm-series': {
        const r = await openModal({
          title: '시리즈 설정',
          fields: [
            { name: 'name', label: '시리즈 이름', required: true },
            { name: 'order', label: '이 글의 시리즈 순서 (숫자, 비우면 자동)', placeholder: '예: 1' },
          ],
        });
        if (!r.confirmed || !r.values.name.trim()) return;
        const update: Record<string, unknown> = { series: r.values.name.trim() };
        if (r.values.order.trim()) {
          const n = Number(r.values.order.trim());
          if (!Number.isNaN(n)) update.seriesOrder = n;
        }
        this.upsertFrontmatter(update);
        break;
      }
      case 'fm-category': {
        const r = await openModal({
          title: '카테고리 설정',
          fields: [{ name: 'category', label: '카테고리 슬러그', placeholder: '폴더명 권장', required: true }],
        });
        if (!r.confirmed || !r.values.category.trim()) return;
        this.upsertFrontmatter({ category: r.values.category.trim() });
        break;
      }
      case 'fm-tags': {
        const r = await openModal({
          title: '태그 추가',
          fields: [{ name: 'tags', label: '태그 (쉼표 구분)', placeholder: 'astro, perf', required: true }],
        });
        if (!r.confirmed) return;
        const tags = r.values.tags.split(',').map((s) => s.trim()).filter(Boolean);
        if (tags.length > 0) this.upsertFrontmatter({ tags });
        break;
      }
      case 'fm-references':
        this.deps.openReferencesPicker();
        break;
      default:
        break;
    }
  }
}

function serializeYamlPair(key: string, value: unknown): string {
  if (typeof value === 'string') return `${key}: ${JSON.stringify(value)}`;
  if (typeof value === 'number' || typeof value === 'boolean') return `${key}: ${value}`;
  if (Array.isArray(value)) return `${key}: [${value.map((v) => JSON.stringify(v)).join(', ')}]`;
  return `${key}: ${JSON.stringify(value)}`;
}
