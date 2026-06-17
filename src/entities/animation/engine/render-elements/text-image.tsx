import type { ImageElement, TextElement } from '../schema';

interface BaseProps {
  state: Record<string, unknown>;
}

export function RenderText({ state }: BaseProps): React.ReactElement {
  const t = state as unknown as TextElement;
  return (
    <text
      x={t.x}
      y={t.y}
      fontSize={t.fontSize}
      fontWeight={t.fontWeight}
      fill={t.color}
      textAnchor={t.textAnchor}
      transform={t.rotation ? `rotate(${t.rotation} ${t.x} ${t.y})` : undefined}
    >
      {t.content}
    </text>
  );
}

export function RenderImage({ state }: BaseProps): React.ReactElement {
  const im = state as unknown as ImageElement;
  return (
    <image
      x={im.x}
      y={im.y}
      width={im.width}
      height={im.height}
      href={im.src}
      preserveAspectRatio={im.preserveAspectRatio}
      opacity={im.opacity}
    />
  );
}

export function RenderPath({ state }: BaseProps): React.ReactElement {
  const p = state as unknown as { x: number; y: number; d: string; fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string; opacity: number; rotation: number };
  const transform = [
    p.x !== 0 || p.y !== 0 ? `translate(${p.x} ${p.y})` : '',
    p.rotation ? `rotate(${p.rotation})` : '',
  ].filter(Boolean).join(' ');
  return (
    <path
      d={p.d}
      transform={transform || undefined}
      fill={p.fill}
      stroke={p.stroke}
      strokeWidth={p.strokeWidth}
      strokeDasharray={p.strokeDasharray}
      opacity={p.opacity}
    />
  );
}

function computePolygonCentroid(points: string): { x: number; y: number } {
  const pts = points.trim().split(/\s+/).map(pair => {
    const [x, y] = pair.split(',').map(Number);
    return { x, y };
  });
  if (pts.length === 0) return { x: 0, y: 0 };
  const sum = pts.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

export function RenderPolygon({ state }: BaseProps): React.ReactElement {
  const p = state as unknown as { points: string; fill: string; stroke: string; strokeWidth: number; opacity: number; rotation: number };
  const centroid = computePolygonCentroid(p.points);
  const transform = p.rotation ? `rotate(${p.rotation} ${centroid.x} ${centroid.y})` : undefined;
  return <polygon points={p.points} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} opacity={p.opacity} transform={transform} />;
}
