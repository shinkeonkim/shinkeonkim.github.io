import { api } from './api';
import { setStatus } from './status';
import { formatBytes } from './utils';
import type { MarkdownToolbar } from './toolbar';

type Purpose = 'body' | 'cover' | 'thumbnail';
type Source = 'upload' | 'url-fetch' | 'url-direct';

interface PendingImage {
  path: string;
  size: number;
  type?: string;
  sourceUrl?: string;
  originalName?: string;
}

export class ImageDialogController {
  private dialog: HTMLDialogElement;
  private form: HTMLFormElement;
  private previewImg: HTMLImageElement;
  private altInput: HTMLInputElement;
  private urlInput: HTMLInputElement;
  private sourceStatus: HTMLElement;
  private uploadGroup: HTMLElement;
  private urlGroup: HTMLElement;
  private bodyOnlySections: NodeListOf<HTMLElement>;
  private titleEl: HTMLElement;
  private fileInput: HTMLInputElement;
  private toolbar: MarkdownToolbar;
  private pending: PendingImage | null = null;

  constructor(toolbar: MarkdownToolbar) {
    this.toolbar = toolbar;
    this.dialog = document.getElementById('editor-image-dialog') as HTMLDialogElement;
    this.form = this.dialog.querySelector('.editor-image-form') as HTMLFormElement;
    this.previewImg = document.getElementById('editor-image-preview-img') as HTMLImageElement;
    this.altInput = document.getElementById('editor-image-alt') as HTMLInputElement;
    this.urlInput = document.getElementById('editor-image-url') as HTMLInputElement;
    this.sourceStatus = document.getElementById('editor-image-source-status') as HTMLElement;
    this.uploadGroup = this.dialog.querySelector('[data-image-source-upload]') as HTMLElement;
    this.urlGroup = this.dialog.querySelector('[data-image-source-url]') as HTMLElement;
    this.bodyOnlySections = this.dialog.querySelectorAll<HTMLElement>(
      '[data-image-section="body-only"]',
    );
    this.titleEl = document.getElementById('editor-image-title') as HTMLElement;
    this.fileInput = document.getElementById('editor-image-input') as HTMLInputElement;

    this.bind();
  }

  openFor(purpose: Purpose): void {
    this.pending = null;
    this.previewImg.removeAttribute('src');
    this.altInput.value = '';
    this.urlInput.value = '';
    this.sourceStatus.textContent = '';
    this.form
      .querySelectorAll<HTMLInputElement>('input[name="img-purpose"]')
      .forEach((r) => (r.checked = r.value === purpose));
    this.form
      .querySelectorAll<HTMLInputElement>('input[name="img-source"]')
      .forEach((r) => (r.checked = r.value === 'upload'));
    this.form
      .querySelectorAll<HTMLInputElement>('input[name="img-width"]')
      .forEach((r) => (r.checked = r.value === ''));
    this.form
      .querySelectorAll<HTMLInputElement>('input[name="img-align"]')
      .forEach((r) => (r.checked = r.value === ''));
    this.applyMode();
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
  }

  async handleDroppedFile(file: File): Promise<void> {
    if (!this.dialog.open) this.openFor('body');
    await this.uploadFile(file);
  }

  private currentPurpose(): Purpose {
    return (this.form.querySelector<HTMLInputElement>('input[name="img-purpose"]:checked')?.value ??
      'body') as Purpose;
  }

  private currentSource(): Source {
    return (this.form.querySelector<HTMLInputElement>('input[name="img-source"]:checked')?.value ??
      'upload') as Source;
  }

  private applyMode(): void {
    const purpose = this.currentPurpose();
    const source = this.currentSource();
    this.titleEl.textContent =
      purpose === 'cover'
        ? '커버 이미지 설정'
        : purpose === 'thumbnail'
          ? '썸네일 이미지 설정'
          : '이미지 삽입 옵션';
    this.bodyOnlySections.forEach((s) => (s.hidden = purpose !== 'body'));
    this.uploadGroup.hidden = source !== 'upload';
    this.urlGroup.hidden = !source.startsWith('url');
  }

  private setPending(image: PendingImage): void {
    this.pending = image;
    this.previewImg.src = image.path;
    if (!this.altInput.value) {
      const base = image.originalName?.replace(/\.[^.]+$/, '') ?? '';
      this.altInput.value = base;
    }
  }

  private async uploadFile(file: File): Promise<void> {
    setStatus('업로드 중…');
    this.sourceStatus.textContent = '업로드 중…';
    document.body.classList.add('editor-uploading');
    try {
      const data = await api.upload(file);
      this.setPending({ ...data, originalName: file.name });
      this.sourceStatus.textContent = `업로드됨 (${formatBytes(data.size)})`;
      setStatus(`업로드됨 (${formatBytes(data.size)})`, 'ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('업로드 실패: ' + msg, 'error');
      this.sourceStatus.textContent = '실패: ' + msg;
    } finally {
      document.body.classList.remove('editor-uploading');
    }
  }

  private bind(): void {
    this.form
      .querySelector('[data-image-section="purpose"]')
      ?.addEventListener('change', () => this.applyMode());
    this.form.querySelector('[data-image-section="source"]')?.addEventListener('change', () => {
      this.applyMode();
      this.pending = null;
      this.previewImg.removeAttribute('src');
      this.sourceStatus.textContent = '';
    });

    this.dialog.querySelector('[data-image-pick]')?.addEventListener('click', () => {
      this.fileInput.value = '';
      this.fileInput.click();
    });

    this.dialog.querySelector('[data-image-url-fetch]')?.addEventListener('click', async () => {
      const url = this.urlInput.value.trim();
      if (!url) return;
      if (this.currentSource() === 'url-direct') {
        this.setPending({
          path: url,
          size: 0,
          type: 'external',
          sourceUrl: url,
          originalName: url,
        });
        this.sourceStatus.textContent = '외부 URL 그대로 사용';
        return;
      }
      this.sourceStatus.textContent = '다운로드 중…';
      try {
        const data = await api.fetchImage(url);
        this.setPending({ ...data, originalName: url });
        this.sourceStatus.textContent = `저장됨 (${formatBytes(data.size)})`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.sourceStatus.textContent = '실패: ' + msg;
      }
    });

    this.fileInput.addEventListener('change', async () => {
      const file = this.fileInput.files?.[0];
      if (file) await this.uploadFile(file);
    });

    this.dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.imageCancel !== undefined) this.dialog.close('cancel');
    });

    this.altInput.addEventListener('input', () => {
      this.altInput.classList.remove('editor-image-alt-invalid');
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.pending) {
        this.sourceStatus.textContent = '이미지를 먼저 업로드 또는 가져오기 해주세요';
        return;
      }
      const purpose = this.currentPurpose();
      const alt = this.altInput.value.trim();
      if (purpose !== 'thumbnail' && !alt) {
        this.sourceStatus.textContent = '⚠ 대체 텍스트(alt) 는 필수입니다, 접근성 / SEO';
        this.altInput.classList.add('editor-image-alt-invalid');
        this.altInput.focus();
        return;
      }
      if (purpose === 'cover') {
        const update: Record<string, unknown> = { cover: this.pending.path };
        if (alt) update.coverAlt = alt;
        this.toolbar.upsertFrontmatter(update);
      } else if (purpose === 'thumbnail') {
        this.toolbar.upsertFrontmatter({ thumbnail: this.pending.path });
      } else {
        const width =
          this.form.querySelector<HTMLInputElement>('input[name="img-width"]:checked')?.value ?? '';
        const align =
          this.form.querySelector<HTMLInputElement>('input[name="img-align"]:checked')?.value ?? '';
        let widthClass = '';
        let inlineStyle = '';
        if (width === 'custom') {
          const customRaw =
            (document.getElementById('editor-image-width-custom') as HTMLInputElement | null)?.value.trim() ?? '';
          if (/^\d+\s*(%|px|rem|em|vw)?$/i.test(customRaw)) {
            const styled = /^\d+$/.test(customRaw) ? `${customRaw}px` : customRaw;
            inlineStyle = ` style="width: ${styled.replace(/"/g, '')}"`;
          }
        } else if (width) {
          widthClass = width;
        }
        const classes = [widthClass, align].filter(Boolean).join(' ');
        const altSafe = alt.replace(/"/g, '&quot;');
        const md =
          classes || inlineStyle
            ? `<img src="${this.pending.path}" alt="${altSafe}"${classes ? ` class="${classes}"` : ''}${inlineStyle} />`
            : `![${alt}](${this.pending.path})`;
        this.toolbar.insertBlock(md);
      }
      this.pending = null;
      this.dialog.close();
    });
  }
}
