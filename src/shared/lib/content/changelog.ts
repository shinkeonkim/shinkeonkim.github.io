import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface ChangelogEntry {
  sha: string;
  shortSha: string;
  date: string;
  subject: string;
  insertions: number;
  deletions: number;
  major: boolean;
  url: string;
}

export type ChangelogMap = Record<string, ChangelogEntry[]>;

// content-changelog.json is regenerated on every prebuild and is gitignored;
// use fs.readFile off process.cwd() (not TS-typed import or import.meta.url)
// so type-check succeeds on fresh clones AND the resolved path stays correct
// after Astro bundles this file into .astro/*.js.
const CHANGELOG_PATH = path.join(process.cwd(), 'src/data/content-changelog.json');

let cache: Promise<ChangelogMap> | null = null;

async function load(): Promise<ChangelogMap> {
  try {
    const raw = await readFile(CHANGELOG_PATH, 'utf8');
    return JSON.parse(raw) as ChangelogMap;
  } catch {
    return {};
  }
}

export function loadChangelog(): Promise<ChangelogMap> {
  if (!cache) cache = load();
  return cache;
}

export async function getChangelogFor(
  collection: 'posts' | 'wiki' | 'notes',
  slug: string,
): Promise<ChangelogEntry[]> {
  const all = await loadChangelog();
  return all[`${collection}:${slug}`] ?? [];
}
