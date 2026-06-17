import type { AnimationEffect, CircleElement, RectElement } from '../schema';
import { applyEffectColor, applyEffectScale } from './effects';

interface ShapeProps {
  state: Record<string, unknown>;
  effect: AnimationEffect | undefined;
  currentTime: number;
}

export function RenderRect({ state, effect, currentTime }: ShapeProps): React.ReactElement {
  const r = state as unknown as RectElement;
  const scale = applyEffectScale(effect, currentTime);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const transform = `translate(${cx} ${cy}) rotate(${r.rotation}) scale(${scale}) translate(${-cx} ${-cy})`;
  return (
    <g transform={transform}>
      <rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        rx={r.cornerRadius}
        fill={applyEffectColor(r.fill, effect, '#a5b4fc')}
        stroke={r.stroke}
        strokeWidth={r.strokeWidth}
      />
      {r.label && (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={r.labelSize} fontWeight={600} fill={r.labelColor}>
          {r.label}
        </text>
      )}
      {r.subtitle && (
        <text x={cx} y={cy + r.labelSize + 8} textAnchor="middle" fontSize={r.subtitleSize ?? 10} fill={r.labelColor} opacity={0.7}>
          {r.subtitle.split('\n').map((line, i) => (
            <tspan key={i} x={cx} dy={i === 0 ? 0 : '1.2em'}>
              {line || '\u00A0'}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

export function RenderCircle({ state, effect, currentTime }: ShapeProps): React.ReactElement {
  const c = state as unknown as CircleElement;
  const scale = applyEffectScale(effect, currentTime);
  const transform = `translate(${c.cx} ${c.cy}) rotate(${c.rotation}) scale(${scale}) translate(${-c.cx} ${-c.cy})`;
  return (
    <g transform={transform}>
      <circle
        cx={c.cx}
        cy={c.cy}
        r={c.r}
        fill={applyEffectColor(c.fill, effect, '#a5b4fc')}
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
      {c.label && (
        <text x={c.cx} y={c.cy + 5} textAnchor="middle" fontSize={c.labelSize} fontWeight={600} fill={c.labelColor}>
          {c.label}
        </text>
      )}
    </g>
  );
}
