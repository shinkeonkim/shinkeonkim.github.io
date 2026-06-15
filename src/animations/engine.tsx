import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnimationDef,
  AnimationElement,
  AnimationEffect,
  EntryMode,
  ExitMode,
  Chapter,
} from './schema';
import { activeEffects as activeEffectsAt, computeSnapshot, currentChapter } from './schema';
import { ENGINE_MARKER_DEFS } from './engine-markers';
import { entryStyle, exitStyle } from './engine-phase-styles';
import {
  RenderElement,
  FlowParticle,
  resolveArrowCoords,
} from './engine-render-elements';

interface ActiveEffectInstance {
  key: string;
  effect: AnimationEffect;
  startedAt: number;
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
          {[...def.elements]
            .sort((a, b) => {
              const aIsText = a.type === 'text';
              const bIsText = b.type === 'text';
              if (aIsText && !bIsText) return 1;
              if (!aIsText && bIsText) return -1;
              return 0;
            })
            .map((el) => {
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

export type { Chapter, ActiveEffectInstance };
