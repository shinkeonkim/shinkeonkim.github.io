import type { CurrentFile } from '@/dev-only/editor/core/state';
import { EDITOR_AUTOSAVE_INTERVAL_MS } from '@/shared/config';

const PREFIX = 'editor-draft:';
const AUTOSAVE_INTERVAL = EDITOR_AUTOSAVE_INTERVAL_MS;

function keyFor(file: CurrentFile): string {
  return `${PREFIX}${file.collection}/${file.slug}${file.ext}`;
}

export interface DraftRecord {
  content: string;
  savedAt: number;
}

export function readDraft(file: CurrentFile): DraftRecord | null {
  try {
    const raw = localStorage.getItem(keyFor(file));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftRecord;
    if (typeof parsed.content !== 'string' || typeof parsed.savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(file: CurrentFile, content: string): boolean {
  try {
    const record: DraftRecord = { content, savedAt: Date.now() };
    localStorage.setItem(keyFor(file), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(file: CurrentFile): void {
  try {
    localStorage.removeItem(keyFor(file));
  } catch {
    return;
  }
}

export function listDrafts(): { key: string; record: DraftRecord }[] {
  const out: { key: string; record: DraftRecord }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as DraftRecord;
        out.push({ key, record: parsed });
      } catch {
        continue;
      }
    }
  } catch {
    return out;
  }
  return out;
}

export class Autosaver {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot = '';
  private failureNotified = false;
  private fileGetter: () => CurrentFile | null;
  private contentGetter: () => string;
  private onSaved: (timestamp: number) => void;
  private onFailed: ((message: string) => void) | null;

  constructor(
    fileGetter: () => CurrentFile | null,
    contentGetter: () => string,
    onSaved: (t: number) => void,
    onFailed?: (message: string) => void,
  ) {
    this.fileGetter = fileGetter;
    this.contentGetter = contentGetter;
    this.onSaved = onSaved;
    this.onFailed = onFailed ?? null;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), AUTOSAVE_INTERVAL);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  reset(): void {
    this.lastSnapshot = this.contentGetter();
  }

  forceSave(): void {
    const file = this.fileGetter();
    if (!file) return;
    const content = this.contentGetter();
    this.persist(file, content);
  }

  private tick(): void {
    const file = this.fileGetter();
    if (!file) return;
    const content = this.contentGetter();
    if (content === this.lastSnapshot) return;
    this.persist(file, content);
  }

  private persist(file: CurrentFile, content: string): void {
    const ok = writeDraft(file, content);
    if (ok) {
      this.lastSnapshot = content;
      this.failureNotified = false;
      this.onSaved(Date.now());
    } else if (!this.failureNotified) {
      this.failureNotified = true;
      this.onFailed?.('초안 자동 저장 실패 (브라우저 저장공간 가득 참)');
    }
  }
}
