import { z } from 'astro/zod';
import { idSchema } from './primitives';
import { elementSchema } from './elements';
import { effectSchema } from './effects';

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

export type Chapter = z.infer<typeof chapterSchema>;
export type AnimationDef = z.infer<typeof animationDefSchema>;
