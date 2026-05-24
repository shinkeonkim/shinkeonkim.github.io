import { api } from './api';
import { ScrollSync } from './scroll-sync';
import type { Ext } from './state';

export class PreviewPane {
  private container: HTMLElement;
  private content: HTMLElement;
  private toggle: HTMLInputElement;
  private getText: () => string;
  private getExt: () => Ext;
  private token = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sync: ScrollSync | null;

  constructor(opts: {
    container: HTMLElement;
    content: HTMLElement;
    toggle: HTMLInputElement;
    split: HTMLElement;
    getText: () => string;
    getExt: () => Ext;
    textarea?: HTMLTextAreaElement;
  }) {
    this.container = opts.container;
    this.content = opts.content;
    this.toggle = opts.toggle;
    this.getText = opts.getText;
    this.getExt = opts.getExt;
    this.sync = opts.textarea ? new ScrollSync(opts.textarea, this.container) : null;
    this.applyToggleState(opts.split);
    this.toggle.addEventListener('change', () => {
      this.applyToggleState(opts.split);
      if (this.toggle.checked) void this.render();
    });
  }

  private applyToggleState(split: HTMLElement): void {
    this.container.hidden = !this.toggle.checked;
    split.classList.toggle('has-preview', this.toggle.checked);
    if (this.toggle.checked) this.sync?.enable();
    else this.sync?.disable();
  }

  schedule(): void {
    if (!this.toggle.checked) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.render(), 250);
  }

  async render(): Promise<void> {
    if (!this.toggle.checked) return;
    const token = ++this.token;
    try {
      const data = await api.render({ content: this.getText(), ext: this.getExt() });
      if (token !== this.token) return;
      this.content.innerHTML = data.html;
      document.dispatchEvent(
        new CustomEvent('preview-updated', { detail: { container: this.content } }),
      );
      requestAnimationFrame(() => this.sync?.syncFromA());
    } catch (err) {
      if (token !== this.token) return;
      const msg = err instanceof Error ? err.message : String(err);
      this.content.innerHTML = `<pre style="color:#ef4444">미리보기 실패: ${msg}</pre>`;
    }
  }
}
