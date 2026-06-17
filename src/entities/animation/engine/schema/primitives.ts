import { z } from 'astro/zod';

export const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;

export const idSchema = z.string().regex(ID_RE, 'lowercase / digits / - / _ only');

export const easeSchema = z
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

export const baseElementProps = {
  id: idSchema,
  name: z.string().optional(),
  rotation: z.number().default(0),
  appearances: z.array(appearanceSchema).default([]),
  tracks: z.array(propertyTrackSchema).default([]),
};

export type Anchor = z.infer<typeof anchorSchema>;
export type ArrowHead = z.infer<typeof arrowHeadSchema>;
export type EntryMode = z.infer<typeof entryModeSchema>;
export type ExitMode = z.infer<typeof exitModeSchema>;
export type Ease = z.infer<typeof easeSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type TrackKeyframe = z.infer<typeof trackKeyframeSchema>;
export type PropertyTrack = z.infer<typeof propertyTrackSchema>;
