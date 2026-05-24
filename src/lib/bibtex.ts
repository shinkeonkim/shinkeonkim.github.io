import type { CollectionEntry } from 'astro:content';

type SourceEntry = CollectionEntry<'sources'>;

const TYPE_TO_BIBTEX: Record<string, string> = {
  book: 'book',
  paper: 'article',
  article: 'article',
  website: 'misc',
  video: 'misc',
  talk: 'misc',
  other: 'misc',
};

const TYPE_TO_RIS: Record<string, string> = {
  book: 'BOOK',
  paper: 'JOUR',
  article: 'JOUR',
  website: 'ELEC',
  video: 'VIDEO',
  talk: 'CONF',
  other: 'GEN',
};

function bibEscape(value: string): string {
  return value.replace(/([\\{}])/g, '\\$1');
}

export function toBibtex(source: SourceEntry): string {
  const d = source.data;
  const type = TYPE_TO_BIBTEX[d.type] ?? 'misc';
  const lines = [`@${type}{${source.id},`];
  if (d.title) lines.push(`  title = {${bibEscape(d.title)}},`);
  if (d.author) lines.push(`  author = {${bibEscape(d.author)}},`);
  if (d.publisher) lines.push(`  publisher = {${bibEscape(d.publisher)}},`);
  if (d.year !== undefined) lines.push(`  year = {${d.year}},`);
  if (d.url) lines.push(`  url = {${d.url}},`);
  if (d.doi) lines.push(`  doi = {${d.doi}},`);
  if (d.isbn) lines.push(`  isbn = {${d.isbn}},`);
  lines.push('}');
  return lines.join('\n');
}

export function toRIS(source: SourceEntry): string {
  const d = source.data;
  const type = TYPE_TO_RIS[d.type] ?? 'GEN';
  const lines = [`TY  - ${type}`];
  if (d.title) lines.push(`TI  - ${d.title}`);
  if (d.author) lines.push(`AU  - ${d.author}`);
  if (d.publisher) lines.push(`PB  - ${d.publisher}`);
  if (d.year !== undefined) lines.push(`PY  - ${d.year}`);
  if (d.url) lines.push(`UR  - ${d.url}`);
  if (d.doi) lines.push(`DO  - ${d.doi}`);
  if (d.isbn) lines.push(`SN  - ${d.isbn}`);
  lines.push('ER  - ');
  return lines.join('\n');
}
