type Kind = 'info' | 'ok' | 'error';

let el: HTMLElement | null = null;

export function initStatus(element: HTMLElement): void {
  el = element;
}

export function setStatus(text: string, kind: Kind = 'info'): void {
  if (!el) return;
  el.textContent = text;
  el.style.color =
    kind === 'error' ? '#ef4444' : kind === 'ok' ? '#10b981' : 'var(--color-fg-muted)';
}
