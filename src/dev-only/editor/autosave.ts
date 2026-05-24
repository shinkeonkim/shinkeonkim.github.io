import type { CurrentFile } from './state';

const PREFIX = 'editor-draft:';
const AUTOSAVE_INTERVAL = 2000;

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

export function writeDraft(file: CurrentFile, content: string): void {
  try {
    const record: DraftRecord = { content, savedAt: Date.now() };
    localStorage.setItem(keyFor(file), JSON.stringify(record));
  } catch {
    return;
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
  private fileGetter: () => CurrentFile | null;
  private contentGetter: () => string;
  private onSaved: (timestamp: number) => void;

  constructor(
    fileGetter: () => CurrentFile | null,
    contentGetter: () => string,
    onSaved: (t: number) => void,
  ) {
    this.fileGetter = fileGetter;
    this.contentGetter = contentGetter;
    this.onSaved = onSaved;
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
    writeDraft(file, content);
    this.lastSnapshot = content;
    this.onSaved(Date.now());
  }

  private tick(): void {
    const file = this.fileGetter();
    if (!file) return;
    const content = this.contentGetter();
    if (content === this.lastSnapshot) return;
    writeDraft(file, content);
    this.lastSnapshot = content;
    this.onSaved(Date.now());
  }
}
