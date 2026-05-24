interface MatchRange {
  start: number;
  end: number;
}

export class FindReplaceBar {
  private textarea: HTMLTextAreaElement;
  private bar: HTMLElement;
  private findInput: HTMLInputElement;
  private replaceInput: HTMLInputElement;
  private caseToggle: HTMLInputElement;
  private regexToggle: HTMLInputElement;
  private countLabel: HTMLElement;
  private matches: MatchRange[] = [];
  private currentIndex = -1;
  private open = false;

  constructor(textarea: HTMLTextAreaElement) {
    this.textarea = textarea;
    this.bar = this.build();
    textarea.parentElement?.insertBefore(this.bar, textarea);
    this.findInput = this.bar.querySelector<HTMLInputElement>('[data-find]')!;
    this.replaceInput = this.bar.querySelector<HTMLInputElement>('[data-replace]')!;
    this.caseToggle = this.bar.querySelector<HTMLInputElement>('[data-case]')!;
    this.regexToggle = this.bar.querySelector<HTMLInputElement>('[data-regex]')!;
    this.countLabel = this.bar.querySelector<HTMLElement>('[data-count]')!;
    this.bindEvents();
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(seed?: string): void {
    this.open = true;
    this.bar.hidden = false;
    if (seed !== undefined) this.findInput.value = seed;
    else if (!this.findInput.value && this.textarea.selectionStart !== this.textarea.selectionEnd) {
      this.findInput.value = this.textarea.value.slice(
        this.textarea.selectionStart,
        this.textarea.selectionEnd,
      );
    }
    this.findInput.focus();
    this.findInput.select();
    this.search();
  }

  close(): void {
    this.open = false;
    this.bar.hidden = true;
    this.matches = [];
    this.currentIndex = -1;
    this.textarea.focus();
  }

  private build(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'editor-find-bar';
    el.hidden = true;
    el.innerHTML = `
      <div class="editor-find-row">
        <input type="text" data-find class="editor-find-input" placeholder="찾기" aria-label="찾기" />
        <span data-count class="editor-find-count">0/0</span>
        <button type="button" data-find-prev title="이전 (Shift+Enter)" aria-label="이전">↑</button>
        <button type="button" data-find-next title="다음 (Enter)" aria-label="다음">↓</button>
        <label class="editor-find-flag"><input type="checkbox" data-case /> Aa</label>
        <label class="editor-find-flag"><input type="checkbox" data-regex /> .*</label>
        <button type="button" data-find-close class="editor-find-close" aria-label="닫기">✕</button>
      </div>
      <div class="editor-find-row">
        <input type="text" data-replace class="editor-find-input" placeholder="바꿀 텍스트" aria-label="바꿀 텍스트" />
        <button type="button" data-replace-one>바꾸기</button>
        <button type="button" data-replace-all>모두 바꾸기</button>
      </div>
    `;
    return el;
  }

  private bindEvents(): void {
    const trigger = () => this.search();
    this.findInput.addEventListener('input', trigger);
    this.caseToggle.addEventListener('change', trigger);
    this.regexToggle.addEventListener('change', trigger);
    this.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) this.gotoPrev();
        else this.gotoNext();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
    this.replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.replaceCurrent();
      }
      if (e.key === 'Escape') this.close();
    });
    this.bar.querySelector('[data-find-next]')?.addEventListener('click', () => this.gotoNext());
    this.bar.querySelector('[data-find-prev]')?.addEventListener('click', () => this.gotoPrev());
    this.bar.querySelector('[data-find-close]')?.addEventListener('click', () => this.close());
    this.bar.querySelector('[data-replace-one]')?.addEventListener('click', () => this.replaceCurrent());
    this.bar.querySelector('[data-replace-all]')?.addEventListener('click', () => this.replaceAll());
  }

  private buildRegex(): RegExp | null {
    const needle = this.findInput.value;
    if (!needle) return null;
    const flags = this.caseToggle.checked ? 'g' : 'gi';
    try {
      if (this.regexToggle.checked) return new RegExp(needle, flags);
      return new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    } catch {
      return null;
    }
  }

  private search(): void {
    const re = this.buildRegex();
    this.matches = [];
    if (!re) {
      this.countLabel.textContent = '0/0';
      return;
    }
    const text = this.textarea.value;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      this.matches.push({ start: match.index, end: match.index + match[0].length });
      if (match.index === re.lastIndex) re.lastIndex++;
    }
    this.currentIndex = this.matches.length > 0 ? 0 : -1;
    this.highlight();
  }

  private highlight(): void {
    this.countLabel.textContent = `${this.currentIndex >= 0 ? this.currentIndex + 1 : 0}/${this.matches.length}`;
    if (this.currentIndex < 0) return;
    const m = this.matches[this.currentIndex];
    this.textarea.focus();
    this.textarea.setSelectionRange(m.start, m.end);
    this.scrollIntoView(m.start);
  }

  private scrollIntoView(pos: number): void {
    const text = this.textarea.value.slice(0, pos);
    const lineNo = text.split('\n').length - 1;
    const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight || '20');
    const target = lineNo * lineHeight;
    if (target < this.textarea.scrollTop || target > this.textarea.scrollTop + this.textarea.clientHeight - lineHeight) {
      this.textarea.scrollTop = Math.max(0, target - this.textarea.clientHeight / 2);
    }
  }

  private gotoNext(): void {
    if (this.matches.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.matches.length;
    this.highlight();
  }

  private gotoPrev(): void {
    if (this.matches.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
    this.highlight();
  }

  private replaceCurrent(): void {
    if (this.currentIndex < 0 || !this.matches[this.currentIndex]) return;
    const m = this.matches[this.currentIndex];
    const replaceText = this.replaceInput.value;
    const before = this.textarea.value.slice(0, m.start);
    const after = this.textarea.value.slice(m.end);
    this.textarea.value = before + replaceText + after;
    this.textarea.setSelectionRange(m.start, m.start + replaceText.length);
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    this.search();
  }

  private replaceAll(): void {
    const re = this.buildRegex();
    if (!re || this.matches.length === 0) return;
    const replaceText = this.replaceInput.value;
    this.textarea.value = this.textarea.value.replace(re, replaceText);
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    this.search();
  }
}
