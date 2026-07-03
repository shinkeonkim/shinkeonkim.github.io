declare global {
  interface Window {
    __sidenoteBound?: boolean;
  }
}

function findAsideFor(ref: HTMLElement): HTMLElement | null {
  const id = ref.getAttribute('aria-describedby');
  if (!id) return null;
  return document.getElementById(id);
}

function collapseOthers(current: HTMLElement): void {
  const refs = document.querySelectorAll<HTMLElement>('.sidenote-ref[aria-expanded="true"]');
  refs.forEach((r) => {
    if (r === current) return;
    r.setAttribute('aria-expanded', 'false');
    const aside = findAsideFor(r);
    aside?.classList.remove('is-open');
  });
}

function toggle(ref: HTMLElement): void {
  const expanded = ref.getAttribute('aria-expanded') === 'true';
  const next = !expanded;
  if (next) collapseOthers(ref);
  ref.setAttribute('aria-expanded', next ? 'true' : 'false');
  const aside = findAsideFor(ref);
  if (aside) {
    aside.classList.toggle('is-open', next);
    if (next && window.matchMedia('(min-width: 1200px)').matches) {
      aside.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

export function setupSidenotes(): void {
  if (window.__sidenoteBound) return;
  window.__sidenoteBound = true;

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const ref = target.closest<HTMLElement>('.sidenote-ref');
    if (!ref) return;
    event.preventDefault();
    toggle(ref);
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('sidenote-ref')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(target);
    } else if (event.key === 'Escape') {
      target.setAttribute('aria-expanded', 'false');
      target.blur();
    }
  });
}
