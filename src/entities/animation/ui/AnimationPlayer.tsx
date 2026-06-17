import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import AnimationEngine from '@/entities/animation/engine/engine';
import {
  currentChapter,
  type AnimationDef,
} from '@/entities/animation/engine/schema';

interface PlayerProps {
  def: AnimationDef;
}

interface ControlsProps {
  playing: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  speed: number;
  onSpeedChange: (next: number) => void;
}

function ControlsBar({ playing, onTogglePlay, onRestart, speed, onSpeedChange }: ControlsProps) {
  return (
    <>
      <button
        type="button"
        className="anim-wrapper-btn"
        onClick={onTogglePlay}
        title={playing ? '일시정지' : '재생'}
        aria-label={playing ? '일시정지' : '재생'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button
        type="button"
        className="anim-wrapper-btn"
        onClick={onRestart}
        title="다시 재생"
        aria-label="다시 재생"
      >
        ↻
      </button>
      <label className="anim-wrapper-speed" title="재생 속도">
        <span aria-hidden="true">⏩</span>
        <input
          type="range"
          min={0.25}
          max={3}
          step={0.25}
          value={speed}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSpeedChange(Number(e.target.value))}
          aria-label="재생 속도"
        />
        <span className="anim-wrapper-speed-value">{speed.toFixed(2)}x</span>
      </label>
    </>
  );
}

interface StepLabelProps {
  step: number;
  def: AnimationDef;
}

function StepLabel({ step, def }: StepLabelProps) {
  if (def.chapters.length === 0) return null;
  const label = def.chapters[step]?.label;
  return (
    <div className="anim-wrapper-step">
      {`Chapter ${step + 1} / ${def.chapters.length}`}
      {label ? `, ${label}` : ''}
    </div>
  );
}

function PlayerWrapper({ def }: PlayerProps) {
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(def.settings.autoplay);
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setPlaying(e.isIntersecting && def.settings.autoplay);
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [def.settings.autoplay]);

  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [modalOpen]);

  const restart = useCallback(() => {
    setRestartKey((k) => k + 1);
    setStep(0);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const handleTimeChange = useCallback(
    (t: number) => {
      const ch = currentChapter(def, t);
      setStep(ch ? ch.index : 0);
    },
    [def],
  );

  return (
    <div ref={ref} className="anim-wrapper not-prose">
      <div className="anim-wrapper-header">
        <div className="anim-wrapper-title">
          <span aria-hidden="true">⚡</span>
          <span>{def.title}</span>
        </div>
        <div className="anim-wrapper-actions">
          <ControlsBar
            playing={playing}
            onTogglePlay={togglePlay}
            onRestart={restart}
            speed={speed}
            onSpeedChange={setSpeed}
          />
          <button
            type="button"
            className="anim-wrapper-btn"
            onClick={() => setModalOpen(true)}
            title="확대 보기"
            aria-label="확대 보기"
          >
            ⛶
          </button>
        </div>
      </div>
      <div className="anim-wrapper-body">
        {reducedMotion ? (
          <div className="anim-wrapper-reduced">
            <p>
              <strong>{def.title}</strong>
              {def.description ? `, ${def.description}` : ''}
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              모션 줄이기 설정으로 자동 재생을 멈췄습니다.
            </p>
          </div>
        ) : (
          <AnimationEngine
            key={restartKey}
            def={def}
            speedMultiplier={speed}
            playing={playing}
            onTimeChange={handleTimeChange}
          />
        )}
        {!reducedMotion && <StepLabel step={step} def={def} />}
      </div>
      {modalOpen && !reducedMotion && (
        <AnimationModal
          def={def}
          restartKey={restartKey}
          speed={speed}
          playing={playing}
          step={step}
          onSpeedChange={setSpeed}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onTimeChange={handleTimeChange}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

interface ModalProps {
  def: AnimationDef;
  restartKey: number;
  speed: number;
  playing: boolean;
  step: number;
  onSpeedChange: (next: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onTimeChange: (t: number) => void;
  onClose: () => void;
}

function AnimationModal({
  def,
  restartKey,
  speed,
  playing,
  step,
  onSpeedChange,
  onTogglePlay,
  onRestart,
  onTimeChange,
  onClose,
}: ModalProps) {
  return (
    <div
      className="anim-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={def.title}
      onClick={onClose}
    >
      <div
        className="anim-modal-content"
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <button
          type="button"
          className="anim-modal-close"
          onClick={onClose}
          title="닫기 (Esc)"
          aria-label="닫기"
        >
          ✕
        </button>
        <h3 className="anim-modal-title">{def.title}</h3>
        <div className="anim-modal-controls">
          <ControlsBar
            playing={playing}
            onTogglePlay={onTogglePlay}
            onRestart={onRestart}
            speed={speed}
            onSpeedChange={onSpeedChange}
          />
        </div>
        <AnimationEngine
          key={`modal-${restartKey}`}
          def={def}
          speedMultiplier={speed}
          playing={playing}
          onTimeChange={onTimeChange}
        />
        <StepLabel step={step} def={def} />
      </div>
    </div>
  );
}

export default PlayerWrapper;
