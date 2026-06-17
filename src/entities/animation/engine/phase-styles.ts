import type { AnimationElement, EntryMode, ExitMode } from './schema';

export function elementCenterFromState(
  el: AnimationElement,
  state: Record<string, unknown>,
): { x: number; y: number } | null {
  if (el.type === 'rect' || el.type === 'image') {
    return { x: (state.x as number) + (state.width as number) / 2, y: (state.y as number) + (state.height as number) / 2 };
  }
  if (el.type === 'text') return { x: state.x as number, y: state.y as number };
  if (el.type === 'circle') return { x: state.cx as number, y: state.cy as number };
  if (el.type === 'line' || el.type === 'arrow') {
    const x1 = state.x1 as number | undefined;
    const y1 = state.y1 as number | undefined;
    const x2 = state.x2 as number | undefined;
    const y2 = state.y2 as number | undefined;
    if (typeof x1 === 'number' && typeof x2 === 'number' && typeof y1 === 'number' && typeof y2 === 'number') {
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }
    return null;
  }
  if (el.type === 'path') return { x: (state.x as number) ?? 0, y: (state.y as number) ?? 0 };
  return null;
}

export function entryStyle(
  mode: EntryMode,
  progress: number,
  baseEl: AnimationElement,
  state: Record<string, unknown>,
): { opacity?: number; transform?: string } {
  if (mode === 'instant') return {};
  const remaining = 1 - progress;
  if (mode === 'fade') return { opacity: progress };
  if (mode === 'zoom' || mode === 'pop') {
    const center = elementCenterFromState(baseEl, state);
    if (!center) return { opacity: progress };
    const base = mode === 'pop' ? 0.4 : 0.2;
    const scale = base + (1 - base) * progress;
    return {
      opacity: progress,
      transform: `translate(${center.x}px ${center.y}px) scale(${scale}) translate(${-center.x}px ${-center.y}px)`,
    };
  }
  const dx = mode === 'slide-left' ? -200 * remaining : mode === 'slide-right' ? 200 * remaining : 0;
  const dy = mode === 'slide-up' ? -200 * remaining : mode === 'slide-down' ? 200 * remaining : 0;
  return { opacity: progress, transform: `translate(${dx}px ${dy}px)` };
}

export function exitStyle(
  mode: ExitMode,
  progress: number,
  baseEl: AnimationElement,
  state: Record<string, unknown>,
): { opacity?: number; transform?: string } {
  if (mode === 'instant') return {};
  if (mode === 'fade') return { opacity: 1 - progress };
  if (mode === 'zoom' || mode === 'pop') {
    const center = elementCenterFromState(baseEl, state);
    if (!center) return { opacity: 1 - progress };
    const base = mode === 'pop' ? 0.4 : 0.2;
    const scale = 1 - (1 - base) * progress;
    return {
      opacity: 1 - progress,
      transform: `translate(${center.x}px ${center.y}px) scale(${scale}) translate(${-center.x}px ${-center.y}px)`,
    };
  }
  const dx = mode === 'slide-left' ? -200 * progress : mode === 'slide-right' ? 200 * progress : 0;
  const dy = mode === 'slide-up' ? -200 * progress : mode === 'slide-down' ? 200 * progress : 0;
  return { opacity: 1 - progress, transform: `translate(${dx}px ${dy}px)` };
}
