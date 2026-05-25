import { z } from 'astro/zod';

export const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;

const idSchema = z.string().regex(ID_RE, 'lowercase / digits / - / _ only');

const easeSchema = z
  .enum(['linear', 'easeIn', 'easeOut', 'easeInOut'])
  .default('easeInOut');

export const anchorSchema = z.enum(['auto', 'top', 'right', 'bottom', 'left', 'center']).default('auto');

export const entryModeSchema = z
  .enum(['instant', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'pop'])
  .default('instant');

export const exitModeSchema = z
  .enum(['instant', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'pop'])
  .default('instant');

export const transitionEaseSchema = z
  .enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'spring'])
  .optional();

const baseElementProps = {
  id: idSchema,
  name: z.string().optional(),
  rotation: z.number().default(0),
  entryMode: entryModeSchema.optional(),
  exitMode: exitModeSchema.optional(),
  transitionEase: transitionEaseSchema,
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

export const arrowHeadSchema = z
  .enum(['none', 'arrow', 'triangle', 'triangle-open', 'circle', 'circle-open', 'diamond', 'diamond-open', 'bar']);

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

export const elementSchema = z.discriminatedUnion('type', [
  rectElementSchema,
  circleElementSchema,
  lineElementSchema,
  arrowElementSchema,
  textElementSchema,
  imageElementSchema,
  pathElementSchema,
  polygonElementSchema,
]);

export const keyframeValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const elementKeyframeSchema = z.record(z.string(), keyframeValueSchema);

export const effectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('highlight'),
    elementId: idSchema,
    color: z.string().default('#facc15'),
    duration: z.number().int().min(0).default(500),
    delay: z.number().int().min(0).default(0),
  }),
  z.object({
    type: z.literal('pulse'),
    elementId: idSchema,
    scale: z.number().positive().default(1.12),
    duration: z.number().int().min(0).default(500),
    delay: z.number().int().min(0).default(0),
  }),
  z.object({
    type: z.literal('flow'),
    elementId: idSchema,
    color: z.string().default('#facc15'),
    particles: z.number().int().min(1).max(10).default(3),
    radius: z.number().positive().default(4),
    duration: z.number().int().min(0).default(800),
    delay: z.number().int().min(0).default(0),
  }),
]);

export const stepSchema = z.object({
  id: idSchema,
  label: z.string().default(''),
  duration: z.number().int().min(0).default(800),
  ease: easeSchema,
  keyframes: z.record(idSchema, elementKeyframeSchema).default({}),
  effects: z.array(effectSchema).default([]),
});

export const animationDefSchema = z.object({
  version: z.literal(2).default(2),
  id: idSchema,
  title: z.string().default(''),
  description: z.string().default(''),
  category: z
    .enum(['network', 'cache', 'algorithm', 'architecture', 'flow', 'protocol', 'general'])
    .default('general'),
  tags: z.array(z.string()).default([]),
  canvas: z
    .object({
      width: z.number().int().positive().default(800),
      height: z.number().int().positive().default(500),
      background: z.string().default('transparent'),
    })
    .default({ width: 800, height: 500, background: 'transparent' }),
  elements: z.array(elementSchema).default([]),
  initiallyHidden: z.array(idSchema).default([]),
  steps: z.array(stepSchema).default([]),
  settings: z
    .object({
      loop: z.boolean().default(true),
      autoplay: z.boolean().default(true),
      stepGapMs: z.number().int().min(0).default(150),
    })
    .default({ loop: true, autoplay: true, stepGapMs: 150 }),
  updatedAt: z.string().optional(),
});

export type Anchor = z.infer<typeof anchorSchema>;
export type ArrowHead = z.infer<typeof arrowHeadSchema>;
export type EntryMode = z.infer<typeof entryModeSchema>;
export type ExitMode = z.infer<typeof exitModeSchema>;
export type TransitionEase = z.infer<typeof transitionEaseSchema>;
export type RectElement = z.infer<typeof rectElementSchema>;
export type CircleElement = z.infer<typeof circleElementSchema>;
export type LineElement = z.infer<typeof lineElementSchema>;
export type ArrowElement = z.infer<typeof arrowElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type PathElement = z.infer<typeof pathElementSchema>;
export type PolygonElement = z.infer<typeof polygonElementSchema>;
export type AnimationElement = z.infer<typeof elementSchema>;

export type ElementKeyframe = z.infer<typeof elementKeyframeSchema>;
export type AnimationEffect = z.infer<typeof effectSchema>;
export type AnimationStep = z.infer<typeof stepSchema>;
export type AnimationDef = z.infer<typeof animationDefSchema>;

export type ElementType = AnimationElement['type'];

const NUMERIC_KEYS = new Set([
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2',
  'rotation', 'opacity', 'strokeWidth', 'cornerRadius',
  'fontSize', 'labelSize', 'curvature',
]);
const COLOR_KEYS = new Set(['fill', 'stroke', 'color', 'labelColor']);

export function isNumericKey(key: string): boolean {
  return NUMERIC_KEYS.has(key);
}
export function isColorKey(key: string): boolean {
  return COLOR_KEYS.has(key);
}

export type SnapshotMap = Map<string, Record<string, unknown> & { visible: boolean }>;

export function computeSnapshot(def: AnimationDef, upToStepIdx: number): SnapshotMap {
  const snap: SnapshotMap = new Map();
  const initiallyHidden = new Set(def.initiallyHidden ?? []);
  for (const el of def.elements) {
    snap.set(el.id, {
      ...(el as unknown as Record<string, unknown>),
      visible: !initiallyHidden.has(el.id),
    });
  }
  for (let i = 0; i <= upToStepIdx; i += 1) {
    const step = def.steps[i];
    if (!step) continue;
    for (const [elId, override] of Object.entries(step.keyframes)) {
      const cur = snap.get(elId);
      if (!cur) continue;
      for (const [k, v] of Object.entries(override)) {
        if (v === null) continue;
        cur[k] = v as unknown;
      }
    }
  }
  return snap;
}
