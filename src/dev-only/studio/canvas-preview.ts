import type { AnimationDef } from '@/entities/animation/engine/schema';

let previewRoot: HTMLDivElement | null = null;

async function mountReactPreview(host: HTMLElement, def: AnimationDef): Promise<void> {
  const [{ createRoot }, { createElement }, EngineMod] = await Promise.all([
    import('react-dom/client'),
    import('react'),
    import('@/entities/animation/engine/engine'),
  ]);
  const Engine = EngineMod.default;
  const root = createRoot(host);
  root.render(createElement(Engine, { def, playing: true, speedMultiplier: 1 }));
}

export function showPreview(canvasEl: SVGSVGElement | null, def: AnimationDef): void {
  if (!canvasEl) return;
  const parent = canvasEl.parentElement;
  if (!parent) return;
  hidePreview(canvasEl);
  canvasEl.style.visibility = 'hidden';
  previewRoot = document.createElement('div');
  const bg = def.canvas.background && def.canvas.background !== 'transparent' ? def.canvas.background : 'transparent';
  previewRoot.style.cssText = `position:absolute;left:0;top:0;width:${def.canvas.width}px;height:${def.canvas.height}px;background:${bg};z-index:2;overflow:hidden;`;
  parent.style.position = 'relative';
  parent.appendChild(previewRoot);
  void mountReactPreview(previewRoot, def);
}

export function hidePreview(canvasEl: SVGSVGElement | null): void {
  if (canvasEl) canvasEl.style.visibility = '';
  if (previewRoot) {
    previewRoot.remove();
    previewRoot = null;
  }
}
