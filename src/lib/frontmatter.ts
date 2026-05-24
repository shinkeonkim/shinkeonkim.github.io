import { parseFrontmatter as astroParse } from '@astrojs/markdown-remark';

export interface ParsedFrontmatter<T = Record<string, unknown>> {
  frontmatter: T;
  body: string;
}

export function parseFrontmatter<T = Record<string, unknown>>(raw: string): ParsedFrontmatter<T> {
  try {
    const result = astroParse(raw) as { frontmatter?: T; content?: string };
    return {
      frontmatter: (result.frontmatter ?? ({} as T)),
      body: result.content ?? '',
    };
  } catch {
    return { frontmatter: {} as T, body: raw };
  }
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string');
}
