import { z } from 'astro/zod';
import {
  anchorSchema,
  arrowHeadSchema,
  baseElementProps,
  idSchema,
} from './primitives';

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
export type ElementType = AnimationElement['type'];
