import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnimationDef,
  AnimationElement,
  AnimationEffect,
  Anchor,
  ArrowElement,
  CircleElement,
  ImageElement,
  LineElement,
  RectElement,
  SnapshotMap,
  TextElement,
} from './schema';
import { computeSnapshot, isColorKey, isNumericKey } from './schema';

interface ActiveEffect {
  key: string;
  effect: AnimationEffect;
  startedAt: number;
}

function easeApply(
  fn: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut',
  t: number,
): number {
  if (fn === 'linear') return t;
  if (fn === 'easeIn') return t * t;
  if (fn === 'easeOut') return 1 - (1 - t) * (1 - t);
  const a = 2 * t * t;
  const b = 1 - Math.pow(-2 * t + 2, 2) / 2;
  return t < 0.5 ? a : b;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function parseColor(s: string): [number, number, number] | null {
  if (!s) return null;
  const hex = s.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const short = s.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const r = parseInt(short[1][0] + short[1][0], 16);
    const g = parseInt(short[1][1] + short[1][1], 16);
    const b = parseInt(short[1][2] + short[1][2], 16);
    return [r, g, b];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

function lerpValue(a: unknown, b: unknown, t: number, key: string): unknown {
  if (isNumericKey(key) && typeof a === 'number' && typeof b === 'number') {
    return lerp(a, b, t);
  }
  if (isColorKey(key) && typeof a === 'string' && typeof b === 'string') {
    const ca = parseColor(a);
    const cb = parseColor(b);
    if (ca && cb) {
      return rgbToHex(lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t));
    }
  }
  if (key === 'visible' && typeof a === 'boolean' && typeof b === 'boolean') {
    return a;
  }
  return t < 0.5 ? a : b;
}

function interpolateSnapshot(
  prev: SnapshotMap,
  target: SnapshotMap,
  t: number,
): SnapshotMap {
  if (t <= 0) return prev;
  if (t >= 1) return target;
  const out: SnapshotMap = new Map();
  for (const [id, prevState] of prev) {
    const targetState = target.get(id);
    if (!targetState) {
      out.set(id, prevState);
      continue;
    }
    const becomingVisible = !prevState.visible && targetState.visible;
    const becomingInvisible = prevState.visible && !targetState.visible;

    let visible: boolean;
    let useTargetSnapshot: boolean;
    if (becomingVisible) {
      visible = t >= 0.999;
      useTargetSnapshot = visible;
    } else if (becomingInvisible) {
      visible = t <= 0.001;
      useTargetSnapshot = false;
    } else {
      visible = prevState.visible;
      useTargetSnapshot = false;
    }

    const merged: Record<string, unknown> & { visible: boolean } = {
      ...(useTargetSnapshot ? targetState : prevState),
      visible,
    };
    if (!useTargetSnapshot && !becomingVisible) {
      for (const [k, v] of Object.entries(targetState)) {
        if (k === 'visible') continue;
        const pv = prevState[k];
        if (pv === undefined) {
          merged[k] = v;
        } else {
          merged[k] = lerpValue(pv, v, t, k);
        }
      }
    }
    out.set(id, merged);
  }
  return out;
}

function totalDurationOf(def: AnimationDef): number {
  return def.steps.reduce((acc, s) => acc + s.duration, 0);
}

interface EngineProps {
  def: AnimationDef;
  speedMultiplier?: number;
  playing?: boolean;
  onStepChange?: (idx: number) => void;
  staticAtStep?: number;
}

export default function AnimationEngine({
  def,
  speedMultiplier = 1,
  playing = true,
  onStepChange,
  staticAtStep,
}: EngineProps) {
  const snapshots = useMemo(() => {
    const list: SnapshotMap[] = [];
    list.push(computeSnapshot(def, -1));
    for (let i = 0; i < def.steps.length; i += 1) {
      list.push(computeSnapshot(def, i));
    }
    return list;
  }, [def]);

  const [time, setTime] = useState(0);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number | null>(null);
  const lastStepIdx = useRef<number>(-1);

  useEffect(() => {
    setTime(0);
    setActiveEffects([]);
    lastStepIdx.current = -1;
  }, [def]);

  useEffect(() => {
    if (staticAtStep !== undefined) return;
    if (!playing) {
      lastFrameTime.current = null;
      return;
    }
    function frame(now: number) {
      if (lastFrameTime.current === null) lastFrameTime.current = now;
      const dt = (now - lastFrameTime.current) * Math.max(0.05, speedMultiplier);
      lastFrameTime.current = now;
      setTime((t) => {
        const total = totalDurationOf(def);
        if (total === 0) return 0;
        const next = t + dt;
        if (next >= total) {
          if (def.settings.loop) return next - total;
          return total;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastFrameTime.current = null;
    };
  }, [playing, def, speedMultiplier, staticAtStep]);

  const { currentSnap, currentStepIdx } = useMemo(() => {
    if (staticAtStep !== undefined) {
      const idx = Math.max(-1, Math.min(def.steps.length - 1, staticAtStep));
      return { currentSnap: snapshots[idx + 1] ?? snapshots[0], currentStepIdx: idx };
    }
    if (def.steps.length === 0) {
      return { currentSnap: snapshots[0], currentStepIdx: -1 };
    }
    let acc = 0;
    for (let i = 0; i < def.steps.length; i += 1) {
      const step = def.steps[i];
      const end = acc + step.duration;
      if (time < end) {
        const localT = step.duration === 0 ? 1 : (time - acc) / step.duration;
        const eased = easeApply(step.ease, localT);
        const snap = interpolateSnapshot(snapshots[i], snapshots[i + 1], eased);
        return { currentSnap: snap, currentStepIdx: i };
      }
      acc = end;
    }
    return { currentSnap: snapshots[snapshots.length - 1], currentStepIdx: def.steps.length - 1 };
  }, [time, snapshots, def, staticAtStep]);

  useEffect(() => {
    onStepChange?.(currentStepIdx);
  }, [currentStepIdx, onStepChange]);

  useEffect(() => {
    if (currentStepIdx === lastStepIdx.current) return;
    lastStepIdx.current = currentStepIdx;
    const step = def.steps[currentStepIdx];
    if (!step || step.effects.length === 0) return;
    const now = performance.now();
    const newEffects = step.effects.map((e, idx) => ({
      key: `${currentStepIdx}-${idx}-${now}`,
      effect: e,
      startedAt: now + (e.delay ?? 0) / Math.max(0.05, speedMultiplier),
    }));
    setActiveEffects((prev) => [...prev, ...newEffects]);
    const totalEffectMs = step.effects.reduce(
      (acc, e) => Math.max(acc, (e.delay ?? 0) + (e.duration ?? 0)),
      0,
    );
    window.setTimeout(() => {
      setActiveEffects((prev) => prev.filter((p) => !newEffects.find((n) => n.key === p.key)));
    }, totalEffectMs / Math.max(0.05, speedMultiplier) + 300);
  }, [currentStepIdx, def.steps, speedMultiplier]);

  const elementOrder = useMemo(() => def.elements.map((e) => e.id), [def.elements]);
  const elementMap = useMemo(() => {
    const m = new Map<string, AnimationElement>();
    for (const el of def.elements) m.set(el.id, el);
    return m;
  }, [def.elements]);

  return (
    <div className="anim-engine">
      <svg
        viewBox={`0 0 ${def.canvas.width} ${def.canvas.height}`}
        role="img"
        aria-label={def.title}
        style={{ width: '100%', height: 'auto', background: def.canvas.background }}
      >
        <defs>
          <marker
            id="anim-engine-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        {elementOrder.map((id) => {
          const baseEl = elementMap.get(id);
          const state = currentSnap.get(id);
          if (!baseEl || !state || !state.visible) return null;
          const activeEffect = activeEffects.find((ae) => ae.effect.elementId === id);
          return (
            <RenderElement
              key={id}
              baseType={baseEl.type}
              state={state}
              snap={currentSnap}
              elementMap={elementMap}
              activeEffect={activeEffect}
            />
          );
        })}

        {activeEffects
          .filter((ae) => ae.effect.type === 'flow')
          .map((ae) => {
            const baseEl = elementMap.get(ae.effect.elementId);
            if (!baseEl || baseEl.type !== 'arrow') return null;
            const coords = resolveArrowCoords(baseEl, currentSnap, elementMap);
            if (!coords) return null;
            const flow = ae.effect as Extract<AnimationEffect, { type: 'flow' }>;
            return Array.from({ length: flow.particles }, (_, i) => (
              <FlowParticle
                key={`${ae.key}-${i}`}
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                color={flow.color}
                radius={flow.radius}
                startOffset={i / flow.particles}
              />
            ));
          })}
      </svg>
    </div>
  );
}

interface RenderProps {
  baseType: AnimationElement['type'];
  state: Record<string, unknown> & { visible: boolean };
  snap: SnapshotMap;
  elementMap: Map<string, AnimationElement>;
  activeEffect?: ActiveEffect;
}

function RenderElement({ baseType, state, snap, elementMap, activeEffect }: RenderProps) {
  const highlight =
    activeEffect && activeEffect.effect.type === 'highlight'
      ? (activeEffect.effect.color as string)
      : null;
  const pulseScale =
    activeEffect && activeEffect.effect.type === 'pulse'
      ? (activeEffect.effect.scale as number)
      : 1;

  const rotation = (state.rotation as number) || 0;

  if (baseType === 'rect') {
    const r = state as unknown as RectElement;
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const transform = [
      pulseScale !== 1 ? `translate(${cx} ${cy}) scale(${pulseScale}) translate(${-cx} ${-cy})` : '',
      rotation ? `rotate(${rotation} ${cx} ${cy})` : '',
    ].filter(Boolean).join(' ');
    return (
      <g transform={transform || undefined}>
        <rect
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          rx={r.cornerRadius}
          fill={highlight ?? r.fill}
          stroke={highlight ?? r.stroke}
          strokeWidth={r.strokeWidth}
        />
        {r.label && (
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={r.labelSize} fontWeight={600} fill={r.labelColor}>
            {r.label}
          </text>
        )}
        {r.subtitle && (
          <text x={cx} y={cy + r.labelSize + 8} textAnchor="middle" fontSize={10} fill={r.labelColor} opacity={0.7}>
            {r.subtitle}
          </text>
        )}
      </g>
    );
  }

  if (baseType === 'circle') {
    const c = state as unknown as CircleElement;
    const transform = [
      pulseScale !== 1 ? `translate(${c.cx} ${c.cy}) scale(${pulseScale}) translate(${-c.cx} ${-c.cy})` : '',
      rotation ? `rotate(${rotation} ${c.cx} ${c.cy})` : '',
    ].filter(Boolean).join(' ');
    return (
      <g transform={transform || undefined}>
        <circle cx={c.cx} cy={c.cy} r={c.r} fill={highlight ?? c.fill} stroke={highlight ?? c.stroke} strokeWidth={c.strokeWidth} />
        {c.label && (
          <text x={c.cx} y={c.cy + 5} textAnchor="middle" fontSize={c.labelSize} fontWeight={600} fill={c.labelColor}>
            {c.label}
          </text>
        )}
      </g>
    );
  }

  if (baseType === 'line') {
    const l = state as unknown as LineElement;
    return (
      <line
        x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
        stroke={highlight ?? l.stroke}
        strokeWidth={l.strokeWidth}
        strokeDasharray={l.strokeDasharray}
      />
    );
  }

  if (baseType === 'arrow') {
    const a = state as unknown as ArrowElement;
    const coords = resolveArrowCoords(a, snap, elementMap);
    if (!coords) return null;
    const color = highlight ?? a.stroke;
    const midX = (coords.x1 + coords.x2) / 2;
    const midY = (coords.y1 + coords.y2) / 2;
    const isCurved = (a.curvature || 0) !== 0;
    let pathD = '';
    if (isCurved) {
      const dx = coords.x2 - coords.x1;
      const dy = coords.y2 - coords.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const cpx = midX + nx * (a.curvature ?? 0);
      const cpy = midY + ny * (a.curvature ?? 0);
      pathD = `M ${coords.x1} ${coords.y1} Q ${cpx} ${cpy} ${coords.x2} ${coords.y2}`;
    }
    return (
      <g style={{ color }}>
        {isCurved ? (
          <path d={pathD} fill="none" stroke="currentColor" strokeWidth={a.strokeWidth} strokeDasharray={a.strokeDasharray} markerEnd="url(#anim-engine-arrow)" />
        ) : (
          <line x1={coords.x1} y1={coords.y1} x2={coords.x2} y2={coords.y2} stroke="currentColor" strokeWidth={a.strokeWidth} strokeDasharray={a.strokeDasharray} markerEnd="url(#anim-engine-arrow)" />
        )}
        {a.label && (
          <g>
            <rect x={midX - 80} y={midY - 11} width={160} height={22} rx={4} fill="white" stroke="currentColor" strokeOpacity={0.4} />
            <text x={midX} y={midY + 4} textAnchor="middle" fontSize="12" fontFamily="ui-monospace, monospace" fill={a.labelColor}>{a.label}</text>
          </g>
        )}
      </g>
    );
  }

  if (baseType === 'text') {
    const t = state as unknown as TextElement;
    const transform = rotation ? `rotate(${rotation} ${t.x} ${t.y})` : undefined;
    return (
      <text x={t.x} y={t.y} fontSize={t.fontSize} fontWeight={t.fontWeight} fill={highlight ?? t.color} textAnchor={t.textAnchor} transform={transform}>
        {t.content}
      </text>
    );
  }

  if (baseType === 'image') {
    const i = state as unknown as ImageElement;
    const cx = i.x + i.width / 2;
    const cy = i.y + i.height / 2;
    const transform = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined;
    return (
      <image href={i.src} x={i.x} y={i.y} width={i.width} height={i.height} preserveAspectRatio={i.preserveAspectRatio} opacity={i.opacity} transform={transform} />
    );
  }

  if (baseType === 'path') {
    const p = state as unknown as import('./schema').PathElement;
    const transform = [
      p.x || p.y ? `translate(${p.x ?? 0} ${p.y ?? 0})` : '',
      rotation ? `rotate(${rotation})` : '',
    ].filter(Boolean).join(' ');
    return (
      <path
        d={p.d}
        fill={highlight ?? p.fill}
        stroke={highlight ?? p.stroke}
        strokeWidth={p.strokeWidth}
        strokeDasharray={p.strokeDasharray}
        opacity={p.opacity}
        transform={transform || undefined}
      />
    );
  }

  if (baseType === 'polygon') {
    const pg = state as unknown as import('./schema').PolygonElement;
    return (
      <polygon
        points={pg.points}
        fill={highlight ?? pg.fill}
        stroke={highlight ?? pg.stroke}
        strokeWidth={pg.strokeWidth}
        opacity={pg.opacity}
      />
    );
  }

  return null;
}

function anchorPoint(
  el: AnimationElement,
  state: Record<string, unknown>,
  anchor: Anchor,
): { x: number; y: number } | null {
  if (el.type === 'rect' || el.type === 'image') {
    const x = state.x as number;
    const y = state.y as number;
    const w = state.width as number;
    const h = state.height as number;
    const cx = x + w / 2;
    const cy = y + h / 2;
    switch (anchor) {
      case 'top': return { x: cx, y };
      case 'right': return { x: x + w, y: cy };
      case 'bottom': return { x: cx, y: y + h };
      case 'left': return { x, y: cy };
      case 'center':
      case 'auto':
      default: return { x: cx, y: cy };
    }
  }
  if (el.type === 'circle') {
    const cx = state.cx as number;
    const cy = state.cy as number;
    const r = state.r as number;
    switch (anchor) {
      case 'top': return { x: cx, y: cy - r };
      case 'right': return { x: cx + r, y: cy };
      case 'bottom': return { x: cx, y: cy + r };
      case 'left': return { x: cx - r, y: cy };
      default: return { x: cx, y: cy };
    }
  }
  if (el.type === 'text') return { x: state.x as number, y: state.y as number };
  return null;
}

function pickAutoAnchor(
  fromEl: AnimationElement,
  fromState: Record<string, unknown>,
  toEl: AnimationElement,
  toState: Record<string, unknown>,
): { from: Anchor; to: Anchor } {
  const candidates: Anchor[] = ['top', 'right', 'bottom', 'left'];
  let bestPair: { from: Anchor; to: Anchor } = { from: 'right', to: 'left' };
  let bestDist = Infinity;
  for (const fa of candidates) {
    for (const ta of candidates) {
      const fp = anchorPoint(fromEl, fromState, fa);
      const tp = anchorPoint(toEl, toState, ta);
      if (!fp || !tp) continue;
      const d = Math.hypot(tp.x - fp.x, tp.y - fp.y);
      if (d < bestDist) {
        bestDist = d;
        bestPair = { from: fa, to: ta };
      }
    }
  }
  return bestPair;
}

export function resolveArrowCoords(
  arrow: ArrowElement,
  snap: SnapshotMap,
  elementMap: Map<string, AnimationElement>,
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (arrow.fromId && arrow.toId) {
    const fromEl = elementMap.get(arrow.fromId);
    const toEl = elementMap.get(arrow.toId);
    const fromState = snap.get(arrow.fromId);
    const toState = snap.get(arrow.toId);
    if (!fromEl || !toEl || !fromState || !toState) return null;
    let fromAnchor = arrow.fromAnchor ?? 'auto';
    let toAnchor = arrow.toAnchor ?? 'auto';
    if (fromAnchor === 'auto' || toAnchor === 'auto') {
      const picked = pickAutoAnchor(fromEl, fromState, toEl, toState);
      if (fromAnchor === 'auto') fromAnchor = picked.from;
      if (toAnchor === 'auto') toAnchor = picked.to;
    }
    const fp = anchorPoint(fromEl, fromState, fromAnchor);
    const tp = anchorPoint(toEl, toState, toAnchor);
    if (!fp || !tp) return null;
    return { x1: fp.x, y1: fp.y, x2: tp.x, y2: tp.y };
  }
  if (
    typeof arrow.x1 === 'number' &&
    typeof arrow.y1 === 'number' &&
    typeof arrow.x2 === 'number' &&
    typeof arrow.y2 === 'number'
  ) {
    return { x1: arrow.x1, y1: arrow.y1, x2: arrow.x2, y2: arrow.y2 };
  }
  return null;
}

function FlowParticle({
  x1, y1, x2, y2, color, radius, startOffset,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; radius: number; startOffset: number;
}) {
  const [t, setT] = useState(startOffset);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    function step(now: number) {
      const elapsed = (now - start) / 800;
      const next = (startOffset + elapsed) % 1;
      setT(next);
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [startOffset]);
  const cx = x1 + (x2 - x1) * t;
  const cy = y1 + (y2 - y1) * t;
  return <circle cx={cx} cy={cy} r={radius} fill={color} opacity={0.85} />;
}
