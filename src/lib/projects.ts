import { type CollectionEntry } from 'astro:content';
import { getPublishedProjects } from './content-queries';

export interface CommitActivityWeek {
  week: number;
  total: number;
  days: number[];
}

export interface RepoContributor {
  login: string | null;
  avatarUrl: string | null;
  htmlUrl: string | null;
  contributions: number;
}

export interface RepoRelease {
  tag: string | null;
  name: string | null;
  publishedAt: string | null;
  url: string | null;
  prerelease: boolean;
}

export interface ProjectStatRepo {
  url: string;
  owner: string;
  repo: string;
  totalCommits: number;
  myCommits: number;
  additions: number;
  deletions: number;
  firstCommitDate?: string | null;
  stars?: number | null;
  forks?: number | null;
  pushedAt?: string | null;
  topics?: string[];
  license?: string | null;
  languages?: Record<string, number>;
  commitActivity?: CommitActivityWeek[];
  topContributors?: RepoContributor[];
  releases?: RepoRelease[];
  error?: string;
}

export interface ProjectStatEntry {
  repos: ProjectStatRepo[];
  fetchedAt: string;
}

export type ProjectStatsCache = Record<string, ProjectStatEntry>;

let cachePromise: Promise<ProjectStatsCache> | null = null;

export function loadProjectStats(): Promise<ProjectStatsCache> {
  if (!cachePromise) {
    cachePromise = import('../data/project-stats.json')
      .then((mod) => (mod.default ?? mod) as ProjectStatsCache)
      .catch(() => ({}) as ProjectStatsCache);
  }
  return cachePromise;
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

export async function listProjects(): Promise<CollectionEntry<'projects'>[]> {
  const all = await getPublishedProjects();
  return all.sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    const aEnd = a.data.end?.valueOf() ?? a.data.start.valueOf();
    const bEnd = b.data.end?.valueOf() ?? b.data.start.valueOf();
    return bEnd - aEnd;
  });
}

export function formatPeriod(start: Date, end?: Date, locale = 'ko-KR'): string {
  const fmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' });
  const s = fmt.format(start);
  if (!end) return `${s} ~ 진행 중`;
  const e = fmt.format(end);
  if (s === e) return s;
  return `${s} ~ ${e}`;
}
