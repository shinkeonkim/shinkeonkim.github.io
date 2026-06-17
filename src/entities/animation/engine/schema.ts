import { z } from 'astro/zod';

export const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;

const idSchema = z.string().regex(ID_RE, 'lowercase / digits / - / _ only');

const easeSchema = z
  .enum(['linear', 'easeIn', 'easeOut', 'easeInOut'])
  .default('easeInOut');

export const anchorSchema = z
  .enum(['auto', 'top', 'right', 'bottom', 'left', 'center',
         'top-left', 'top-right', 'bottom-left', 'bottom-right'])
  .default('auto');

export const entryModeSchema = z
  .enum(['instant', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'pop'])
  .default('instant');

export const exitModeSchema = z
  .enum(['instant', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'pop'])
  .default('instant');

export const arrowHeadSchema = z.enum([
  'none',
  'arrow',
  'triangle',
  'triangle-open',
  'circle',
  'circle-open',
  'diamond',
  'diamond-open',
  'bar',
]);

export const trackValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const trackKeyframeSchema = z.object({
  time: z.number().int().min(0),
  value: trackValueSchema,
  ease: easeSchema.optional(),
});

export const propertyTrackSchema = z.object({
  property: z.string(),
  keyframes: z.array(trackKeyframeSchema).min(1),
});

export const appearanceSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  entryMode: entryModeSchema.optional(),
  entryDuration: z.number().int().min(0).default(300),
  exitMode: exitModeSchema.optional(),
  exitDuration: z.number().int().min(0).default(300),
});

const baseElementProps = {
  id: idSchema,
  name: z.string().optional(),
  rotation: z.number().default(0),
  appearances: z.array(appearanceSchema).default([]),
  tracks: z.array(propertyTrackSchema).default([]),
};

export const rectElementSchema = z.object({
  type: z.literal('rect'),
  ...baseElementProps,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  fill: z.string().default('#a5b4fc'),
  stroke: z.string().default('#6366f1'),
  strokeWidth: z.number().nonnegative().default(1.5),
  cornerRadius: z.number().nonnegative().default(8),
  label: z.string().optional(),
  labelColor: z.string().default('#0b0b0f'),
  labelSize: z.number().positive().default(14),
  subtitle: z.string().optional(),
  subtitleSize: z.number().positive().optional(),
});

export const circleElementSchema = z.object({
  type: z.literal('circle'),
  ...baseElementProps,
  cx: z.number(),
  cy: z.number(),
  r: z.number().positive(),
  fill: z.string().default('#a5b4fc'),
  stroke: z.string().default('#6366f1'),
  strokeWidth: z.number().nonnegative().default(1.5),
  label: z.string().optional(),
  labelColor: z.string().default('#0b0b0f'),
  labelSize: z.number().positive().default(14),
});

export const lineElementSchema = z.object({
  type: z.literal('line'),
  ...baseElementProps,
  fromId: idSchema.optional(),
  toId: idSchema.optional(),
  fromAnchor: anchorSchema.optional(),
  toAnchor: anchorSchema.optional(),
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  stroke: z.string().default('#6366f1'),
  strokeWidth: z.number().positive().default(2),
  strokeDasharray: z.string().optional(),
  headStart: arrowHeadSchema.optional(),
  headEnd: arrowHeadSchema.optional(),
});

export const arrowElementSchema = z.object({
  type: z.literal('arrow'),
  ...baseElementProps,
  fromId: idSchema.optional(),
  toId: idSchema.optional(),
  fromAnchor: anchorSchema.optional(),
  toAnchor: anchorSchema.optional(),
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  stroke: z.string().default('#6366f1'),
  strokeWidth: z.number().positive().default(2),
  strokeDasharray: z.string().optional(),
  label: z.string().optional(),
  labelColor: z.string().default('#0b0b0f'),
  labelOffsetX: z.number().default(0),
  labelOffsetY: z.number().default(4),
  curvature: z.number().default(0),
  headStart: arrowHeadSchema.optional(),
  headEnd: arrowHeadSchema.optional(),
});

export const textElementSchema = z.object({
  type: z.literal('text'),
  ...baseElementProps,
  x: z.number(),
  y: z.number(),
  content: z.string(),
  fontSize: z.number().positive().default(16),
  fontWeight: z.union([z.string(), z.number()]).default(400),
  color: z.string().default('#18181b'),
  textAnchor: z.enum(['start', 'middle', 'end']).default('start'),
});

export const imageElementSchema = z.object({
  type: z.literal('image'),
  ...baseElementProps,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  src: z.string(),
  preserveAspectRatio: z.string().default('xMidYMid meet'),
  opacity: z.number().min(0).max(1).default(1),
});

export const pathElementSchema = z.object({
  type: z.literal('path'),
  ...baseElementProps,
  x: z.number().default(0),
  y: z.number().default(0),
  d: z.string(),
  fill: z.string().default('none'),
  stroke: z.string().default('#6366f1'),
  strokeWidth: z.number().nonnegative().default(2),
  strokeDasharray: z.string().optional(),
  opacity: z.number().min(0).max(1).default(1),
});

export const polygonElementSchema = z.object({
  type: z.literal('polygon'),
  ...baseElementProps,
  points: z.string(),
  fill: z.string().default('#a5b4fc'),
  stroke: z.string().default('#6366f1'),
  strokeWidth: z.number().nonnegative().default(1.5),
  opacity: z.number().min(0).max(1).default(1),
});

export const groupElementSchema = z.object({
  type: z.literal('group'),
  ...baseElementProps,
  x: z.number().default(0),
  y: z.number().default(0),
  childIds: z.array(idSchema).default([]),
});

export const codeElementSchema = z.object({
  type: z.literal('code'),
  ...baseElementProps,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  content: z.string(),
  language: z.string().default('javascript'),
  fontSize: z.number().positive().default(12),
  showLineNumbers: z.boolean().default(false),
  fill: z.string().default('#1e293b'),
  textColor: z.string().default('#e2e8f0'),
  padding: z.number().nonnegative().default(12),
  cornerRadius: z.number().nonnegative().default(8),
  title: z.string().optional(),
});

export const elementSchema = z.discriminatedUnion('type', [
  rectElementSchema,
  circleElementSchema,
  lineElementSchema,
  arrowElementSchema,
  textElementSchema,
  imageElementSchema,
  pathElementSchema,
  polygonElementSchema,
  groupElementSchema,
  codeElementSchema,
]);

export const effectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('highlight'),
    id: idSchema,
    elementId: idSchema,
    time: z.number().int().min(0),
    color: z.string().default('#facc15'),
    duration: z.number().int().min(0).default(500),
  }),
  z.object({
    type: z.literal('pulse'),
    id: idSchema,
    elementId: idSchema,
    time: z.number().int().min(0),
    scale: z.number().positive().default(1.12),
    duration: z.number().int().min(0).default(500),
  }),
  z.object({
    type: z.literal('flow'),
    id: idSchema,
    elementId: idSchema,
    time: z.number().int().min(0),
    color: z.string().default('#facc15'),
    particles: z.number().int().min(1).max(10).default(3),
    radius: z.number().positive().default(4),
    duration: z.number().int().min(0).default(800),
  }),
]);

export const chapterSchema = z.object({
  id: idSchema,
  time: z.number().int().min(0),
  label: z.string().default(''),
  subtitle: z.string().default(''),
});

export const animationDefSchema = z.object({
  version: z.union([z.literal(3), z.literal(4)]).default(4),
  id: idSchema,
  title: z.string().default(''),
  description: z.string().default(''),
  category: z
    .enum(['network', 'cache', 'algorithm', 'architecture', 'flow', 'protocol', 'general'])
    .default('general'),
  tags: z.array(z.string()).default([]),
  duration: z.number().int().min(0).default(5000),
  canvas: z
    .object({
      width: z.number().int().positive().default(800),
      height: z.number().int().positive().default(500),
      background: z.string().default('transparent'),
    })
    .default({ width: 800, height: 500, background: 'transparent' }),
  elements: z.array(elementSchema).default([]),
  chapters: z.array(chapterSchema).default([]),
  effects: z.array(effectSchema).default([]),
  settings: z
    .object({
      loop: z.boolean().default(true),
      autoplay: z.boolean().default(true),
      showCaption: z.boolean().default(false),
      showChapterList: z.boolean().default(false),
    })
    .default({ loop: true, autoplay: true, showCaption: false, showChapterList: false }),
  updatedAt: z.string().optional(),
});

export type Anchor = z.infer<typeof anchorSchema>;
export type ArrowHead = z.infer<typeof arrowHeadSchema>;
export type EntryMode = z.infer<typeof entryModeSchema>;
export type ExitMode = z.infer<typeof exitModeSchema>;
export type Ease = z.infer<typeof easeSchema>;
export type RectElement = z.infer<typeof rectElementSchema>;
export type CircleElement = z.infer<typeof circleElementSchema>;
export type LineElement = z.infer<typeof lineElementSchema>;
export type ArrowElement = z.infer<typeof arrowElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type PathElement = z.infer<typeof pathElementSchema>;
export type PolygonElement = z.infer<typeof polygonElementSchema>;
export type GroupElement = z.infer<typeof groupElementSchema>;
export type CodeElement = z.infer<typeof codeElementSchema>;
export type AnimationElement = z.infer<typeof elementSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type TrackKeyframe = z.infer<typeof trackKeyframeSchema>;
export type PropertyTrack = z.infer<typeof propertyTrackSchema>;
export type AnimationEffect = z.infer<typeof effectSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type AnimationDef = z.infer<typeof animationDefSchema>;

export type ElementType = AnimationElement['type'];

const NUMERIC_KEYS = new Set([
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2',
  'rotation', 'opacity', 'strokeWidth', 'cornerRadius',
  'fontSize', 'labelSize', 'subtitleSize', 'curvature',
]);
const COLOR_KEYS = new Set(['fill', 'stroke', 'color', 'labelColor']);

export function isNumericKey(key: string): boolean {
  return NUMERIC_KEYS.has(key);
}
export function isColorKey(key: string): boolean {
  return COLOR_KEYS.has(key);
}

const TEXT_KEYS = new Set(['label', 'subtitle', 'content', 'src']);

export function isTextKey(key: string): boolean {
  return TEXT_KEYS.has(key);
}

export type ElementVisualState = Record<string, unknown> & {
  visible: boolean;
  __entryProgress?: number;
  __entryMode?: EntryMode;
  __exitProgress?: number;
  __exitMode?: ExitMode;
};

export type SnapshotMap = Map<string, ElementVisualState>;

function easeApply(fn: Ease, t: number): number {
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

function parseColor(s: string): [number, number, number, number] | null {
  if (!s) return null;
  const hex6 = s.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const hex8 = s.match(/^#([0-9a-f]{8})$/i);
  if (hex8) {
    const n = parseInt(hex8[1], 16);
    return [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const short = s.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const r = parseInt(short[1][0] + short[1][0], 16);
    const g = parseInt(short[1][1] + short[1][1], 16);
    const b = parseInt(short[1][2] + short[1][2], 16);
    return [r, g, b, 255];
  }
  return null;
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  if (a >= 255) return '#' + c(r) + c(g) + c(b);
  return '#' + c(r) + c(g) + c(b) + c(a);
}

function lerpValue(prev: unknown, target: unknown, t: number, key: string): unknown {
  if (typeof prev === 'number' && typeof target === 'number' && isNumericKey(key)) {
    return lerp(prev, target, t);
  }
  if (typeof prev === 'string' && typeof target === 'string' && isColorKey(key)) {
    const a = parseColor(prev);
    const b = parseColor(target);
    if (!a || !b) return t < 0.5 ? prev : target;
    return rgbaToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t));
  }
  // Text properties: crossover at 50%
  if (typeof prev === 'string' && typeof target === 'string' && TEXT_KEYS.has(key)) {
    return t < 0.5 ? prev : target;
  }
  // Generic fallback also uses 0.5 for consistency
  return t < 0.5 ? prev : target;
}

function trackValueAt(track: PropertyTrack, time: number): unknown {
  const kfs = track.keyframes;
  if (kfs.length === 0) return undefined;
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
  for (let i = 0; i < kfs.length - 1; i += 1) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time;
      if (span <= 0) return b.value;
      const localT = (time - a.time) / span;
      const eased = easeApply(b.ease ?? 'easeInOut', localT);
      return lerpValue(a.value, b.value, eased, track.property);
    }
  }
  return kfs[kfs.length - 1].value;
}

export function activeAppearance(el: AnimationElement, time: number): {
  appearance: Appearance;
  phase: 'entry' | 'visible' | 'exit';
  phaseProgress: number;
} | null {
  if (!el.appearances || el.appearances.length === 0) return null;
  for (const ap of el.appearances) {
    if (time < ap.start) continue;
    if (time > ap.end) continue;
    const entryEnd = ap.start + (ap.entryMode && ap.entryMode !== 'instant' ? ap.entryDuration : 0);
    const exitStart = ap.end - (ap.exitMode && ap.exitMode !== 'instant' ? ap.exitDuration : 0);
    if (time < entryEnd) {
      const progress = entryEnd === ap.start ? 1 : (time - ap.start) / (entryEnd - ap.start);
      return { appearance: ap, phase: 'entry', phaseProgress: Math.max(0, Math.min(1, progress)) };
    }
    if (time > exitStart) {
      const progress = ap.end === exitStart ? 1 : (time - exitStart) / (ap.end - exitStart);
      return { appearance: ap, phase: 'exit', phaseProgress: Math.max(0, Math.min(1, progress)) };
    }
    return { appearance: ap, phase: 'visible', phaseProgress: 1 };
  }
  return null;
}

export function computeSnapshot(def: AnimationDef, time: number): SnapshotMap {
  const snap: SnapshotMap = new Map();
  for (const el of def.elements) {
    const base: ElementVisualState = {
      ...(el as unknown as Record<string, unknown>),
      visible: false,
    };
    for (const track of el.tracks) {
      const v = trackValueAt(track, time);
      if (v !== undefined) base[track.property] = v;
    }
    const phaseInfo = activeAppearance(el, time);
    if (phaseInfo) {
      base.visible = true;
      if (phaseInfo.phase === 'entry' && phaseInfo.appearance.entryMode) {
        base.__entryMode = phaseInfo.appearance.entryMode;
        base.__entryProgress = phaseInfo.phaseProgress;
      } else if (phaseInfo.phase === 'exit' && phaseInfo.appearance.exitMode) {
        base.__exitMode = phaseInfo.appearance.exitMode;
        base.__exitProgress = phaseInfo.phaseProgress;
      }
    }
    snap.set(el.id, base);
  }
  return snap;
}

export function currentChapter(def: AnimationDef, time: number): { index: number; chapter: Chapter } | null {
  if (def.chapters.length === 0) return null;
  const sorted = [...def.chapters].sort((a, b) => a.time - b.time);
  let active: { index: number; chapter: Chapter } | null = null;
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].time <= time) active = { index: i, chapter: sorted[i] };
    else break;
  }
  return active;
}

export function activeEffects(def: AnimationDef, time: number): AnimationEffect[] {
  return def.effects.filter((eff) => time >= eff.time && time < eff.time + eff.duration);
}
