import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../../consts';
import { getPublishedPosts, sortByDateDesc } from '../../../lib/content-queries';
import { postToFeedItem } from '../../../lib/feed';
import { canonicalizeTag, getTagMeta, tagToSlug } from '../../../data/tags';

// Mirrors /tags/[tag].astro: canonical + alias slugs both emit identical feeds
// so existing /tags/PS/rss.xml / /tags/문제풀이/rss.xml subscribers stay valid.
export async function getStaticPaths() {
  const [posts, wiki] = await Promise.all([getPublishedPosts(), getCollection('wiki')]);
  const canonicalToLabel = new Map<string, string>();
  const addTag = (raw: string): void => {
    const canonical = canonicalizeTag(raw);
    if (!canonicalToLabel.has(canonical)) {
      const meta = getTagMeta(canonical);
      canonicalToLabel.set(canonical, meta?.canonical ?? raw);
    }
  };
  for (const p of posts) p.data.tags.forEach(addTag);
  for (const w of wiki) w.data.tags.forEach(addTag);

  const entries: { params: { tag: string }; props: { canonicalSlug: string; displayLabel: string } }[] = [];
  const seen = new Set<string>();
  const rawAliasSlug = (alias: string): string =>
    alias.normalize('NFC').replace(/[\\/?#%]+/g, '-').replace(/^-+|-+$/g, '');

  const pushEntry = (slug: string, canonicalSlug: string, displayLabel: string) => {
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    entries.push({ params: { tag: slug }, props: { canonicalSlug, displayLabel } });
  };

  for (const [canonicalSlug, displayLabel] of canonicalToLabel) {
    pushEntry(canonicalSlug, canonicalSlug, displayLabel);
    const meta = getTagMeta(canonicalSlug);
    for (const alias of meta?.aliases ?? []) {
      pushEntry(tagToSlug(alias), canonicalSlug, displayLabel);
      pushEntry(rawAliasSlug(alias), canonicalSlug, displayLabel);
    }
  }

  return entries;
}

interface Props {
  canonicalSlug: string;
  displayLabel: string;
}

export async function GET(context: APIContext) {
  const { canonicalSlug, displayLabel } = context.props as Props;
  const posts = sortByDateDesc(await getPublishedPosts())
    .filter((p) => p.data.tags.some((t) => canonicalizeTag(t) === canonicalSlug))
    .slice(0, 30);
  const items = await Promise.all(posts.map((p) => postToFeedItem(p)));

  return rss({
    title: `${SITE_TITLE} - #${displayLabel}`,
    description: `'${displayLabel}' 태그가 붙은 글 모음`,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
