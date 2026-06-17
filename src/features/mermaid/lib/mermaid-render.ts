interface MermaidApi {
  initialize: (opts: object) => void;
  run: (opts: { nodes: Element[] }) => Promise<void>;
}

let mermaidPromise: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    const cdnUrl = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaidPromise = import(/* @vite-ignore */ cdnUrl).then(
      (m: { default: MermaidApi }) => m.default,
    );
  }
  return mermaidPromise;
}

let renderToken = 0;
let initialized = false;

function snapshotSources(): void {
  document.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-source]').forEach((el) => {
    if (!el.hasAttribute('data-mermaid-original')) {
      el.setAttribute('data-mermaid-original', el.textContent || '');
    }
  });
}

export async function renderNodes(
  nodes: HTMLElement[],
  onRendered: () => void,
): Promise<void> {
  if (!nodes || nodes.length === 0) return;
  const token = ++renderToken;
  const mermaid = await loadMermaid();
  if (token !== renderToken) return;

  if (!initialized) {
    const isDark = document.documentElement.classList.contains('dark');
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'strict',
      fontFamily:
        'ui-sans-serif,system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif',
    });
    initialized = true;
  }

  for (const el of nodes) {
    const source = el.getAttribute('data-mermaid-original') || el.textContent || '';
    el.setAttribute('data-mermaid-original', source);
    el.removeAttribute('data-processed');
    el.textContent = source;
    el.classList.add('is-loading');
  }

  try {
    await mermaid.run({ nodes });
    for (const el of nodes) {
      el.setAttribute('data-mermaid-rendered', '1');
      el.classList.remove('is-loading');
    }
    onRendered();
  } catch (err) {
    console.error('[mermaid] render failed:', err);
    for (const el of nodes) el.classList.remove('is-loading');
  }
}

let viewportObserver: IntersectionObserver | null = null;

export function setupLazyMermaid(onRendered: () => void): void {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-source]'),
  );
  if (all.length === 0) return;
  snapshotSources();

  if (viewportObserver) viewportObserver.disconnect();
  viewportObserver = new IntersectionObserver(
    (entries) => {
      const candidates: HTMLElement[] = [];
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          viewportObserver!.unobserve(el);
          if (!el.hasAttribute('data-mermaid-rendered')) candidates.push(el);
        }
      }
      if (candidates.length > 0) void renderNodes(candidates, onRendered);
    },
    { rootMargin: '300px 0px' },
  );
  for (const el of all) {
    if (!el.hasAttribute('data-mermaid-rendered')) viewportObserver.observe(el);
  }
}

export async function reRenderForTheme(onRendered: () => void): Promise<void> {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>('.mermaid[data-mermaid-source]'),
  );
  if (all.length === 0) return;
  const rendered = all.filter((el) => el.hasAttribute('data-mermaid-rendered'));
  if (rendered.length > 0) {
    initialized = false;
    for (const el of rendered) el.removeAttribute('data-mermaid-rendered');
    await renderNodes(rendered, onRendered);
  }
}
