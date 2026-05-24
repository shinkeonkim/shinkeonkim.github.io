import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const referenceInline = z.object({
  title: z.string(),
  url: z.url().optional(),
  author: z.string().optional(),
  note: z.string().optional(),
});

const referenceById = z.object({
  id: z.string(),
  page: z.number().optional(),
  anchor: z.string().optional(),
  note: z.string().optional(),
});

const referenceItem = z.union([referenceById, referenceInline]);

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    coverCredit: z.string().optional(),
    thumbnail: z.string().optional(),
    references: z.array(referenceItem).default([]),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    references: z.array(referenceItem).default([]),
  }),
});

const wiki = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/wiki' }),
  schema: z.object({
    title: z.string(),
    aliases: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    updated: z.coerce.date().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    thumbnail: z.string().optional(),
    references: z.array(referenceItem).default([]),
  }),
});

const emptyToUndefined = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());
const emptyToUndefinedUrl = z.preprocess((v) => (v === '' ? undefined : v), z.url().optional());

const sources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sources' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['book', 'article', 'paper', 'website', 'video', 'talk', 'other']).default('other'),
    author: emptyToUndefined,
    publisher: emptyToUndefined,
    year: z.number().optional(),
    isbn: emptyToUndefined,
    doi: emptyToUndefined,
    url: emptyToUndefinedUrl,
    aliases: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    start: z.coerce.date(),
    end: z.coerce.date().optional(),
    teamSize: z.number().min(1).default(1),
    role: z.string().optional(),
    thumbnail: z.string().optional(),
    cover: z.string().optional(),
    repos: z.array(z.object({
      url: z.url(),
      label: z.string().optional(),
      track: z.boolean().default(true),
    })).default([]),
    stack: z.array(z.string()).default([]),
    links: z.array(z.object({
      url: z.url(),
      label: z.string(),
    })).default([]),
    status: z.enum(['ongoing', 'completed', 'archived']).default('completed'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    references: z.array(referenceItem).default([]),
  }),
});

export const collections = { posts, notes, wiki, sources, projects };
