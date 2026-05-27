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
  EntryMode,
  ExitMode,
  Chapter,
} from './schema';
import { activeEffects as activeEffectsAt, computeSnapshot, currentChapter } from './schema';

const ENGINE_MARKER_DEFS = `
  <marker id="anim-h-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-triangle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-triangle-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-triangle-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-triangle-open-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
    <circle cx="5" cy="5" r="4" fill="currentColor" />
  </marker>
  <marker id="anim-h-circle-open" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7">
    <circle cx="5" cy="5" r="4" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-diamond" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-diamond-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-diamond-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-diamond-open-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-bar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="10" orient="auto">
    <rect x="4" y="0" width="2" height="10" fill="currentColor" />
  </marker>
`;

function engineMarkerUrl(head: string | undefined, end: 'start' | 'end'): string | undefined {
  if (!head || head === 'none') return undefined;
  if (head === 'circle' || head === 'circle-open') return `url(#anim-h-${head})`;
  const idBase = `anim-h-${head}`;
  return end === 'start' ? `url(#${idBase}-start)` : `url(#${idBase})`;
}

interface ActiveEffectInstance {
  key: string;
  effect: AnimationEffect;
  startedAt: number;
}

function entryStyle(mode: EntryMode, progress: number, baseEl: AnimationElement, state: Record<string, unknown>): { opacity?: number; transform?: string } {
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

function exitStyle(mode: ExitMode, progress: number, baseEl: AnimationElement, state: Record<string, unknown>): { opacity?: number; transform?: string } {
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

function elementCenterFromState(el: AnimationElement, state: Record<string, unknown>): { x: number; y: number } | null {
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

interface EngineProps {
  def: AnimationDef;
  speedMultiplier?: number;
  playing?: boolean;
  staticAtTime?: number;
  onTimeChange?: (time: number) => void;
}

export default function AnimationEngine({
  def,
  speedMultiplier = 1,
  playing = true,
  staticAtTime,
  onTimeChange,
}: EngineProps) {
  const [time, setTime] = useState(0);
  const [now, setNow] = useState(() => performance.now());
  const rafRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number | null>(null);

  useEffect(() => {
    setTime(0);
  }, [def.id]);

  useEffect(() => {
    if (staticAtTime !== undefined) return;
    if (!playing) {
      lastFrameTime.current = null;
      return;
    }
    function frame(t: number): void {
      if (lastFrameTime.current === null) lastFrameTime.current = t;
      const dt = (t - lastFrameTime.current) * Math.max(0.05, speedMultiplier);
      lastFrameTime.current = t;
      setTime((cur) => {
        const total = def.duration;
        if (total === 0) return 0;
        const next = cur + dt;
        if (next >= total) {
          if (def.settings.loop) return next - total;
          return total;
        }
        return next;
      });
      setNow(t);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastFrameTime.current = null;
    };
  }, [playing, def, speedMultiplier, staticAtTime]);

  const currentTime = staticAtTime !== undefined ? staticAtTime : time;

  useEffect(() => {
    onTimeChange?.(currentTime);
  }, [currentTime, onTimeChange]);

  const elementMap = useMemo(() => {
    const m = new Map<string, AnimationElement>();
    for (const el of def.elements) m.set(el.id, el);
    return m;
  }, [def.elements]);

  const currentSnap = useMemo(() => computeSnapshot(def, currentTime), [def, currentTime]);
  const activeEffects = useMemo(() => activeEffectsAt(def, currentTime), [def, currentTime]);
  const chapter = useMemo(() => currentChapter(def, currentTime), [def, currentTime]);

  const sortedChapters = useMemo(() => [...def.chapters].sort((a, b) => a.time - b.time), [def.chapters]);

  const showCaption = def.settings.showCaption === true;
  const showChapterList = def.settings.showChapterList === true;

  return (
    <div className={`anim-engine${showChapterList ? ' anim-engine-with-list' : ''}`}>
      <div className="anim-engine-stage">
        <svg
          viewBox={`0 0 ${def.canvas.width} ${def.canvas.height}`}
          role="img"
          aria-label={def.title}
          style={{ width: '100%', height: 'auto', background: def.canvas.background }}
        >
          <defs dangerouslySetInnerHTML={{ __html: ENGINE_MARKER_DEFS }} />
          {def.elements.map((el) => {
            const state = currentSnap.get(el.id);
            if (!state || !state.visible) return null;
            const entryProgress = state.__entryProgress as number | undefined;
            const exitProgress = state.__exitProgress as number | undefined;
            const entryMode = state.__entryMode as EntryMode | undefined;
            const exitMode = state.__exitMode as ExitMode | undefined;
            const phaseStyle: { opacity?: number; transform?: string } =
              entryProgress !== undefined && entryMode
                ? entryStyle(entryMode, entryProgress, el, state)
                : exitProgress !== undefined && exitMode
                  ? exitStyle(exitMode, exitProgress, el, state)
                  : {};
            const activeEffect = activeEffects.find(
              (ae) => ae.elementId === el.id && (ae.type === 'highlight' || ae.type === 'pulse'),
            );
            return (
              <g
                key={el.id}
                style={phaseStyle.opacity !== undefined ? { opacity: phaseStyle.opacity } : undefined}
                transform={phaseStyle.transform}
              >
                <RenderElement
                  baseType={el.type}
                  state={state}
                  snap={currentSnap}
                  elementMap={elementMap}
                  effect={activeEffect}
                  currentTime={currentTime}
                />
              </g>
            );
          })}
          {activeEffects
            .filter((eff): eff is Extract<AnimationEffect, { type: 'flow' }> => eff.type === 'flow')
            .map((eff) => {
              const baseEl = elementMap.get(eff.elementId);
              if (!baseEl || baseEl.type !== 'arrow') return null;
              const coords = resolveArrowCoords(baseEl, currentSnap, elementMap);
              if (!coords) return null;
              const elapsed = currentTime - eff.time;
              const cycle = elapsed / eff.duration;
              return Array.from({ length: eff.particles }, (_, i) => (
                <FlowParticle
                  key={`${eff.id}-${i}`}
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  color={eff.color}
                  radius={eff.radius}
                  offset={(cycle + i / eff.particles) % 1}
                />
              ));
            })}
        </svg>
        {showCaption && chapter && (
          <div className="anim-caption" aria-live="polite">
            <span className="anim-caption-num">
              {chapter.index + 1} / {sortedChapters.length}
            </span>
            {chapter.chapter.label && <span className="anim-caption-label">{chapter.chapter.label}</span>}
            {chapter.chapter.subtitle && <span className="anim-caption-subtitle">{chapter.chapter.subtitle}</span>}
          </div>
        )}
      </div>
      {showChapterList && (
        <aside className="anim-step-list" aria-label="목차">
          <ol>
            {sortedChapters.map((c, idx) => (
              <li
                key={c.id}
                className={`anim-step-list-item${chapter?.index === idx ? ' is-current' : ''}`}
                aria-current={chapter?.index === idx ? 'step' : undefined}
              >
                <span className="anim-step-list-num">{idx + 1}</span>
                <div className="anim-step-list-body">
                  <span className="anim-step-list-label">{c.label || c.id}</span>
                  {c.subtitle && <span className="anim-step-list-subtitle">{c.subtitle}</span>}
                </div>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}

interface RenderProps {
  baseType: AnimationElement['type'];
  state: Record<string, unknown>;
  snap: SnapshotMap;
  elementMap: Map<string, AnimationElement>;
  effect: AnimationEffect | undefined;
  currentTime: number;
}

function RenderElement({ baseType, state, snap, elementMap, effect, currentTime }: RenderProps): React.ReactElement | null {
  if (baseType === 'rect') return <RenderRect state={state} effect={effect} currentTime={currentTime} />;
  if (baseType === 'circle') return <RenderCircle state={state} effect={effect} currentTime={currentTime} />;
  if (baseType === 'line') return <RenderLine state={state} snap={snap} elementMap={elementMap} />;
  if (baseType === 'arrow') return <RenderArrow state={state} snap={snap} elementMap={elementMap} />;
  if (baseType === 'text') return <RenderText state={state} />;
  if (baseType === 'image') return <RenderImage state={state} />;
  if (baseType === 'path') return <RenderPath state={state} />;
  if (baseType === 'polygon') return <RenderPolygon state={state} />;
  return null;
}

function applyEffectColor(stateColor: string | undefined, effect: AnimationEffect | undefined, defaultColor: string): string {
  if (effect && effect.type === 'highlight') return effect.color;
  return (stateColor as string) ?? defaultColor;
}

function applyEffectScale(effect: AnimationEffect | undefined, currentTime: number): number {
  if (effect && effect.type === 'pulse') {
    const elapsed = currentTime - effect.time;
    const t = Math.max(0, Math.min(1, elapsed / effect.duration));
    const pulse = Math.sin(t * Math.PI);
    return 1 + (effect.scale - 1) * pulse;
  }
  return 1;
}

function RenderRect({ state, effect, currentTime }: { state: Record<string, unknown>; effect: AnimationEffect | undefined; currentTime: number }): React.ReactElement {
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
        <text x={cx} y={cy + r.labelSize + 8} textAnchor="middle" fontSize={10} fill={r.labelColor} opacity={0.7}>
          {r.subtitle}
        </text>
      )}
    </g>
  );
}

function RenderCircle({ state, effect, currentTime }: { state: Record<string, unknown>; effect: AnimationEffect | undefined; currentTime: number }): React.ReactElement {
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

function anchorOffset(el: AnimationElement, state: Record<string, unknown>, anchor: Anchor | undefined): { x: number; y: number } {
  const center = elementCenterFromState(el, state) ?? { x: 0, y: 0 };
  if (anchor === 'top') {
    if (el.type === 'rect' || el.type === 'image') return { x: center.x, y: state.y as number };
    if (el.type === 'circle') return { x: center.x, y: (state.cy as number) - (state.r as number) };
  }
  if (anchor === 'bottom') {
    if (el.type === 'rect' || el.type === 'image') return { x: center.x, y: (state.y as number) + (state.height as number) };
    if (el.type === 'circle') return { x: center.x, y: (state.cy as number) + (state.r as number) };
  }
  if (anchor === 'left') {
    if (el.type === 'rect' || el.type === 'image') return { x: state.x as number, y: center.y };
    if (el.type === 'circle') return { x: (state.cx as number) - (state.r as number), y: center.y };
  }
  if (anchor === 'right') {
    if (el.type === 'rect' || el.type === 'image') return { x: (state.x as number) + (state.width as number), y: center.y };
    if (el.type === 'circle') return { x: (state.cx as number) + (state.r as number), y: center.y };
  }
  return center;
}

function resolveArrowCoords(
  el: ArrowElement | LineElement,
  snap: SnapshotMap,
  elementMap: Map<string, AnimationElement>,
): { x1: number; y1: number; x2: number; y2: number } | null {
  let x1: number | undefined;
  let y1: number | undefined;
  let x2: number | undefined;
  let y2: number | undefined;
  if (el.fromId) {
    const fromState = snap.get(el.fromId);
    const fromBase = elementMap.get(el.fromId);
    if (fromState && fromBase) {
      const p = anchorOffset(fromBase, fromState, el.fromAnchor);
      x1 = p.x;
      y1 = p.y;
    }
  } else {
    x1 = el.x1;
    y1 = el.y1;
  }
  if (el.toId) {
    const toState = snap.get(el.toId);
    const toBase = elementMap.get(el.toId);
    if (toState && toBase) {
      const p = anchorOffset(toBase, toState, el.toAnchor);
      x2 = p.x;
      y2 = p.y;
    }
  } else {
    x2 = el.x2;
    y2 = el.y2;
  }
  if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') return null;
  return { x1, y1, x2, y2 };
}

function RenderLine({ state, snap, elementMap }: { state: Record<string, unknown>; snap: SnapshotMap; elementMap: Map<string, AnimationElement> }): React.ReactElement | null {
  const l = state as unknown as LineElement;
  const coords = resolveArrowCoords(l, snap, elementMap);
  if (!coords) return null;
  return (
    <line
      x1={coords.x1}
      y1={coords.y1}
      x2={coords.x2}
      y2={coords.y2}
      stroke={l.stroke}
      strokeWidth={l.strokeWidth}
      strokeDasharray={l.strokeDasharray}
      markerStart={engineMarkerUrl(l.headStart, 'start')}
      markerEnd={engineMarkerUrl(l.headEnd, 'end')}
      style={{ color: l.stroke }}
    />
  );
}

function RenderArrow({ state, snap, elementMap }: { state: Record<string, unknown>; snap: SnapshotMap; elementMap: Map<string, AnimationElement> }): React.ReactElement | null {
  const a = state as unknown as ArrowElement;
  const coords = resolveArrowCoords(a, snap, elementMap);
  if (!coords) return null;
  const midX = (coords.x1 + coords.x2) / 2;
  const midY = (coords.y1 + coords.y2) / 2;
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const curve = a.curvature ?? 0;
  const cx = midX + nx * curve;
  const cy = midY + ny * curve;
  const d = curve === 0 ? `M ${coords.x1} ${coords.y1} L ${coords.x2} ${coords.y2}` : `M ${coords.x1} ${coords.y1} Q ${cx} ${cy} ${coords.x2} ${coords.y2}`;
  return (
    <g style={{ color: a.stroke }}>
      <path
        d={d}
        fill="none"
        stroke={a.stroke}
        strokeWidth={a.strokeWidth}
        strokeDasharray={a.strokeDasharray}
        markerStart={engineMarkerUrl(a.headStart, 'start')}
        markerEnd={engineMarkerUrl(a.headEnd, 'end')}
      />
      {a.label && (
        <text x={midX} y={midY + 4} textAnchor="middle" fontSize="12" fontFamily="ui-monospace, monospace" fill={a.labelColor}>
          {a.label}
        </text>
      )}
    </g>
  );
}

function RenderText({ state }: { state: Record<string, unknown> }): React.ReactElement {
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

function RenderImage({ state }: { state: Record<string, unknown> }): React.ReactElement {
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

function RenderPath({ state }: { state: Record<string, unknown> }): React.ReactElement {
  const p = state as unknown as { x: number; y: number; d: string; fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string; opacity: number };
  const transform = p.x === 0 && p.y === 0 ? undefined : `translate(${p.x} ${p.y})`;
  return (
    <path
      d={p.d}
      transform={transform}
      fill={p.fill}
      stroke={p.stroke}
      strokeWidth={p.strokeWidth}
      strokeDasharray={p.strokeDasharray}
      opacity={p.opacity}
    />
  );
}

function RenderPolygon({ state }: { state: Record<string, unknown> }): React.ReactElement {
  const p = state as unknown as { points: string; fill: string; stroke: string; strokeWidth: number; opacity: number };
  return <polygon points={p.points} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} opacity={p.opacity} />;
}

function FlowParticle({
  x1,
  y1,
  x2,
  y2,
  color,
  radius,
  offset,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  radius: number;
  offset: number;
}): React.ReactElement {
  const t = offset;
  const x = x1 + (x2 - x1) * t;
  const y = y1 + (y2 - y1) * t;
  return <circle cx={x} cy={y} r={radius} fill={color} opacity={0.85} />;
}

export type { Chapter, ActiveEffectInstance };
