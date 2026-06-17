import { z } from 'astro/zod';
import { idSchema } from './primitives';

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

export type AnimationEffect = z.infer<typeof effectSchema>;
