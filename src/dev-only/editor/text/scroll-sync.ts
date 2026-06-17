type Scrollable = HTMLElement | HTMLTextAreaElement;

export class ScrollSync {
  private a: Scrollable;
  private b: Scrollable;
  private syncing = false;
  private enabled = false;
  private onA = () => this.syncFrom(this.a, this.b);
  private onB = () => this.syncFrom(this.b, this.a);

  constructor(a: Scrollable, b: Scrollable) {
    this.a = a;
    this.b = b;
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.a.addEventListener('scroll', this.onA, { passive: true });
    this.b.addEventListener('scroll', this.onB, { passive: true });
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.a.removeEventListener('scroll', this.onA);
    this.b.removeEventListener('scroll', this.onB);
  }

  syncFromA(): void {
    this.syncFrom(this.a, this.b);
  }

  private syncFrom(source: Scrollable, target: Scrollable): void {
    if (this.syncing) return;
    const sourceMax = source.scrollHeight - source.clientHeight;
    if (sourceMax <= 0) return;
    const targetMax = target.scrollHeight - target.clientHeight;
    if (targetMax <= 0) return;
    const ratio = source.scrollTop / sourceMax;
    this.syncing = true;
    target.scrollTop = ratio * targetMax;
    requestAnimationFrame(() => {
      this.syncing = false;
    });
  }
}
