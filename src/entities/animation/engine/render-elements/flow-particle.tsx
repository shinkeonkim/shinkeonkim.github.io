interface FlowParticleProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  radius: number;
  offset: number;
}

export function FlowParticle({
  x1,
  y1,
  x2,
  y2,
  color,
  radius,
  offset,
}: FlowParticleProps): React.ReactElement {
  const t = offset;
  const x = x1 + (x2 - x1) * t;
  const y = y1 + (y2 - y1) * t;
  return <circle cx={x} cy={y} r={radius} fill={color} opacity={0.85} />;
}
