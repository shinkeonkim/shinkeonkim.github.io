import { api, type UrlPreviewResponse } from './api';
import { openModal } from './modal';
import { setStatus } from './status';

const TAG_RE = /<UrlPreview\s+url=["']([^"']+)["']\s*\/>/g;
const URL_RE = /https?:\/\/[^\s<>"')]+/g;

export class UrlPreviewController {
  private textarea: HTMLTextAreaElement;

  constructor(textarea: HTMLTextAreaElement) {
    this.textarea = textarea;
  }

  async insertNew(): Promise<void> {
    const result = await openModal({
      title: 'URL 미리보기 삽입',
      description: '외부 URL 의 OG 메타를 즉시 가져와 카드로 삽입합니다.',
      fields: [
        { name: 'url', label: 'URL', placeholder: 'https://…', required: true },
      ],
      confirmLabel: '미리보기 카드 삽입',
    });
    if (!result.confirmed) return;
    const url = result.values.url.trim();
    if (!url) return;
    await this.insertCardAtCursor(url);
  }

  async toggleAtCursor(): Promise<void> {
    const sel = this.textarea.selectionStart;
    const value = this.textarea.value;
    const tagMatch = this.findEnclosingTag(value, sel);
    if (tagMatch) {
      const { start, end, url } = tagMatch;
      const next = value.slice(0, start) + url + value.slice(end);
      this.setValue(next, start, start + url.length);
      setStatus('URL 미리보기 → 평문 URL 로 변환', 'ok');
      return;
    }
    const urlMatch = this.findUrlAtCursor(value, sel);
    if (urlMatch) {
      await this.insertCardReplacingRange(urlMatch.start, urlMatch.end, urlMatch.url);
      return;
    }
    setStatus('커서 위치에 URL 또는 <UrlPreview/> 가 없습니다', 'error');
  }

  private findEnclosingTag(value: string, cursor: number): { start: number; end: number; url: string } | null {
    TAG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TAG_RE.exec(value)) !== null) {
      if (cursor >= m.index && cursor <= m.index + m[0].length) {
        return { start: m.index, end: m.index + m[0].length, url: m[1] };
      }
    }
    return null;
  }

  private findUrlAtCursor(value: string, cursor: number): { start: number; end: number; url: string } | null {
    URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = URL_RE.exec(value)) !== null) {
      const end = m.index + m[0].length;
      if (cursor >= m.index && cursor <= end) {
        return { start: m.index, end, url: m[0] };
      }
    }
    return null;
  }

  private async insertCardAtCursor(url: string): Promise<void> {
    const preview = await this.fetchPreview(url);
    if (!preview) return;
    const tag = `<UrlPreview url="${url}" />`;
    const sel = this.textarea.selectionStart;
    const before = this.textarea.value.slice(0, sel);
    const after = this.textarea.value.slice(this.textarea.selectionEnd);
    const needLead = before.length > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const needTrail = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '\n';
    const block = needLead + tag + needTrail;
    const next = before + block + after;
    const cursor = before.length + needLead.length + tag.length;
    this.setValue(next, cursor, cursor);
    this.flashStatus(preview);
  }

  private async insertCardReplacingRange(start: number, end: number, url: string): Promise<void> {
    const preview = await this.fetchPreview(url);
    if (!preview) return;
    const tag = `<UrlPreview url="${url}" />`;
    const before = this.textarea.value.slice(0, start);
    const after = this.textarea.value.slice(end);
    const next = before + tag + after;
    this.setValue(next, before.length, before.length + tag.length);
    this.flashStatus(preview);
  }

  private async fetchPreview(url: string): Promise<UrlPreviewResponse | null> {
    setStatus('URL 메타 가져오는 중…');
    try {
      const res = await api.urlPreview(url);
      if (res.preview.error) {
        setStatus('미리보기 실패 (캐시 없는 상태로 삽입): ' + res.preview.error, 'error');
      }
      return res.preview;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('미리보기 실패 (캐시 없는 상태로 삽입): ' + msg, 'error');
      return { url, fetchedAt: new Date().toISOString(), error: msg };
    }
  }

  private flashStatus(preview: UrlPreviewResponse): void {
    if (preview.title) setStatus(`URL 카드 삽입: ${preview.title}`, 'ok');
    else setStatus('URL 카드 삽입됨 (메타 캐시 빈 상태)', 'ok');
  }

  private setValue(value: string, selStart: number, selEnd: number): void {
    this.textarea.value = value;
    try {
      this.textarea.selectionStart = selStart;
      this.textarea.selectionEnd = selEnd;
    } catch {
      return;
    }
    this.textarea.focus();
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
