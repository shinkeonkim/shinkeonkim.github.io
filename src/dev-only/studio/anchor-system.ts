import type { AnimationElement, Anchor } from '@/entities/animation/engine/schema';

export interface AnchorPoint {
  x: number;
  y: number;
  anchor: Anchor;
  elementId: string;
  label: string;
}

/**
 * Return all snap-able anchor points for the given element based on its type and current visual state.
 */
export function getAnchorPoints(
  element: AnimationElement,
  state: Record<string, unknown>,
): AnchorPoint[] {
  const id = element.id;

  switch (element.type) {
    case 'rect':
    case 'image': {
      const x = (state.x as number) ?? 0;
      const y = (state.y as number) ?? 0;
      const w = (state.width as number) ?? 0;
      const h = (state.height as number) ?? 0;
      return [
        { x: x + w / 2, y, anchor: 'top', elementId: id, label: 'top' },
        { x: x + w, y: y + h / 2, anchor: 'right', elementId: id, label: 'right' },
        { x: x + w / 2, y: y + h, anchor: 'bottom', elementId: id, label: 'bottom' },
        { x, y: y + h / 2, anchor: 'left', elementId: id, label: 'left' },
        { x, y, anchor: 'top-left', elementId: id, label: 'top-left' },
        { x: x + w, y, anchor: 'top-right', elementId: id, label: 'top-right' },
        { x, y: y + h, anchor: 'bottom-left', elementId: id, label: 'bottom-left' },
        { x: x + w, y: y + h, anchor: 'bottom-right', elementId: id, label: 'bottom-right' },
      ];
    }

    case 'circle': {
      const cx = (state.cx as number) ?? 0;
      const cy = (state.cy as number) ?? 0;
      const r = (state.r as number) ?? 0;
      return [
        { x: cx, y: cy - r, anchor: 'top', elementId: id, label: 'top' },
        { x: cx + r, y: cy, anchor: 'right', elementId: id, label: 'right' },
        { x: cx, y: cy + r, anchor: 'bottom', elementId: id, label: 'bottom' },
        { x: cx - r, y: cy, anchor: 'left', elementId: id, label: 'left' },
      ];
    }

    case 'polygon': {
      const points = parsePolygonPoints((state.points as string) ?? '');
      return points.map((pt, i) => ({
        x: pt.x,
        y: pt.y,
        anchor: 'center' as Anchor,
        elementId: id,
        label: `vertex-${i}`,
      }));
    }

    case 'text': {
      const x = (state.x as number) ?? 0;
      const y = (state.y as number) ?? 0;
      return [{ x, y, anchor: 'center', elementId: id, label: 'center' }];
    }

    default:
      return [];
  }
}

/**
 * Find the nearest anchor point within snap distance from the given point.
 * Returns null if no anchor is within range.
 */
export function findNearestAnchor(
  point: { x: number; y: number },
  allAnchors: AnchorPoint[],
  snapDistance: number = 12,
): AnchorPoint | null {
  let best: AnchorPoint | null = null;
  let bestDist = Infinity;

  for (const ap of allAnchors) {
    const dx = ap.x - point.x;
    const dy = ap.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= snapDistance && dist < bestDist) {
      bestDist = dist;
      best = ap;
    }
  }

  return best;
}

/** Parse an SVG polygon `points` attribute string into an array of {x, y} coordinates. */
function parsePolygonPoints(points: string): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const trimmed = points.trim();
  if (!trimmed) return result;

  // SVG points format: "x1,y1 x2,y2 ..." or "x1 y1 x2 y2 ..."
  // Split by commas and/or whitespace to extract all numeric tokens
  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const x = parseFloat(tokens[i]);
    const y = parseFloat(tokens[i + 1]);
    if (!isNaN(x) && !isNaN(y)) result.push({ x, y });
  }

  return result;
}
