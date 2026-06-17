interface Snapshot {
  text: string;
  selStart: number;
  selEnd: number;
}

const MAX_ENTRIES = 100;
const DEBOUNCE_MS = 500;

export class EditorHistory {
  private stack: Snapshot[] = [];
  private pointer = -1;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingFromTextarea = false;
  private textarea: HTMLTextAreaElement;
  private suppress = false;

  constructor(textarea: HTMLTextAreaElement) {
    this.textarea = textarea;
    this.snapshot();
    textarea.addEventListener('input', this.handleInput);
  }

  private handleInput = (): void => {
    if (this.suppress) return;
    this.pendingFromTextarea = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.pendingFromTextarea) {
        this.snapshot();
        this.pendingFromTextarea = false;
      }
    }, DEBOUNCE_MS);
  };

  snapshot(): void {
    const text = this.textarea.value;
    const last = this.stack[this.pointer];
    if (last && last.text === text) return;
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push({
      text,
      selStart: this.textarea.selectionStart,
      selEnd: this.textarea.selectionEnd,
    });
    if (this.stack.length > MAX_ENTRIES) {
      this.stack = this.stack.slice(this.stack.length - MAX_ENTRIES);
    }
    this.pointer = this.stack.length - 1;
  }

  reset(): void {
    this.stack = [];
    this.pointer = -1;
    this.snapshot();
  }

  canUndo(): boolean {
    return this.pointer > 0;
  }

  canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  undo(): boolean {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingFromTextarea) {
      this.snapshot();
      this.pendingFromTextarea = false;
    }
    if (!this.canUndo()) return false;
    this.pointer--;
    this.apply(this.stack[this.pointer]);
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;
    this.pointer++;
    this.apply(this.stack[this.pointer]);
    return true;
  }

  private apply(snap: Snapshot): void {
    this.suppress = true;
    this.textarea.value = snap.text;
    this.textarea.setSelectionRange(snap.selStart, snap.selEnd);
    this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    this.suppress = false;
  }
}
