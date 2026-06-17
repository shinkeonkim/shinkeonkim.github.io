import { reRenderForTheme, setupLazyMermaid } from './mermaid-render';
import { attachZoomHandlers, bindZoomDialogListeners } from './mermaid-zoom';

declare global {
  interface Window {
    __mermaidBound?: boolean;
  }
}

export function setupMermaid(): void {
  if (window.__mermaidBound) return;
  window.__mermaidBound = true;

  bindZoomDialogListeners();
  setupLazyMermaid(attachZoomHandlers);

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'class') {
        void reRenderForTheme(attachZoomHandlers);
        return;
      }
    }
  }).observe(document.documentElement, { attributes: true });

  document.addEventListener('astro:after-swap', () => {
    setupLazyMermaid(attachZoomHandlers);
  });
  document.addEventListener('preview-updated', () => {
    setupLazyMermaid(attachZoomHandlers);
  });
}
