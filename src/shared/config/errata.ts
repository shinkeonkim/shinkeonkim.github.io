import { SITE_REPO_SLUG, SITE_URL } from './site';

export const ERRATA_LABEL_PREFIX = 'errata:';
export const ERRATA_LABEL_RE = /^errata:(posts|wiki|notes):(.+)$/;

export type ErrataCollection = 'posts' | 'wiki' | 'notes';

export function errataLabel(collection: ErrataCollection, slug: string): string {
  return `${ERRATA_LABEL_PREFIX}${collection}:${slug}`;
}

interface PrefillOptions {
  collection: ErrataCollection;
  slug: string;
  title: string;
}

function articlePath(collection: ErrataCollection, slug: string): string {
  return `/${collection}/${slug}/`;
}

export function issueTemplateBody(opts: PrefillOptions): string {
  const path = articlePath(opts.collection, opts.slug);
  const articleUrl = new URL(path, SITE_URL).toString();
  return [
    `**Article**: [${opts.title}](${articleUrl})`,
    '',
    '**Section / quote**: (문제가 발생한 헤딩 또는 인용된 문장)',
    '',
    '**Issue**: (무엇이 잘못되었는지)',
    '',
    '**Suggested fix**: (수정 제안, 선택)',
    '',
    '---',
    '',
    `이 이슈는 \`${errataLabel(opts.collection, opts.slug)}\` 라벨이 자동으로 붙어야 정오표 UI 에 반영됩니다.`,
  ].join('\n');
}

export function issueUrlFor(opts: PrefillOptions): string {
  const url = new URL(`https://github.com/${SITE_REPO_SLUG}/issues/new`);
  url.searchParams.set('title', `[Errata] ${opts.slug}: `);
  url.searchParams.set('labels', errataLabel(opts.collection, opts.slug));
  url.searchParams.set('body', issueTemplateBody(opts));
  return url.toString();
}
