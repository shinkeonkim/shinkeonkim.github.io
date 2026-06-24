import { getCollection, type CollectionEntry } from 'astro:content';
import { getPublishedPosts } from './content-queries';

export type CategorizedCollection = 'posts' | 'wiki';

export interface CategoryInfo {
  slug: string;
  label: string;
  count: number;
}

export interface SeriesInfo {
  slug: string;
  name: string;
  count: number;
  posts: CollectionEntry<'posts'>[];
}

const SLUG_RE = /[^\p{L}\p{N}_-]+/gu;

export function slugify(value: string): string {
  return value.normalize('NFC').toLowerCase().replace(SLUG_RE, '-').replace(/^-|-$/g, '');
}

export function categoryOf<C extends CategorizedCollection>(
  entry: CollectionEntry<C>,
): string | null {
  const explicit = (entry.data as { category?: string }).category;
  if (explicit) return explicit;
  const parts = entry.id.split('/');
  if (parts.length < 2) return null;
  return parts[0];
}

export interface PostTaxonomy {
  categories: Map<string, CollectionEntry<'posts'>[]>;
  series: Map<string, SeriesInfo>;
  postCategory: Map<string, string | null>;
  postSeries: Map<string, { slug: string; name: string; order: number; total: number }>;
}

let postTaxonomyPromise: Promise<PostTaxonomy> | null = null;

export function getPostTaxonomy(): Promise<PostTaxonomy> {
  if (!postTaxonomyPromise) postTaxonomyPromise = buildPostTaxonomy();
  return postTaxonomyPromise;
}

async function buildPostTaxonomy(): Promise<PostTaxonomy> {
  const posts = (await getPublishedPosts()).slice();

  const categories = new Map<string, CollectionEntry<'posts'>[]>();
  const postCategory = new Map<string, string | null>();
  for (const post of posts) {
    const cat = categoryOf(post);
    postCategory.set(post.id, cat);
    if (cat) {
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(post);
    }
  }
  for (const list of categories.values()) {
    list.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  }

  const seriesGroups = new Map<string, CollectionEntry<'posts'>[]>();
  for (const post of posts) {
    const name = post.data.series;
    if (!name) continue;
    if (!seriesGroups.has(name)) seriesGroups.set(name, []);
    seriesGroups.get(name)!.push(post);
  }

  const series = new Map<string, SeriesInfo>();
  const postSeries = new Map<
    string,
    { slug: string; name: string; order: number; total: number }
  >();
  for (const [name, items] of seriesGroups) {
    items.sort((a, b) => {
      const orderA = a.data.seriesOrder ?? a.data.date.valueOf();
      const orderB = b.data.seriesOrder ?? b.data.date.valueOf();
      return orderA - orderB;
    });
    const slug = slugify(name);
    series.set(slug, { slug, name, count: items.length, posts: items });
    items.forEach((post, i) => {
      postSeries.set(post.id, {
        slug,
        name,
        order: i + 1,
        total: items.length,
      });
    });
  }

  return { categories, series, postCategory, postSeries };
}

export async function listCategoryInfos(): Promise<CategoryInfo[]> {
  const taxonomy = await getPostTaxonomy();
  const out: CategoryInfo[] = [];
  for (const [slug, items] of taxonomy.categories) {
    out.push({ slug, label: slug, count: items.length });
  }
  out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return out;
}

export interface WikiTaxonomy {
  categories: Map<string, CollectionEntry<'wiki'>[]>;
  wikiCategory: Map<string, string | null>;
}

let wikiTaxonomyPromise: Promise<WikiTaxonomy> | null = null;

export function getWikiTaxonomy(): Promise<WikiTaxonomy> {
  if (!wikiTaxonomyPromise) wikiTaxonomyPromise = buildWikiTaxonomy();
  return wikiTaxonomyPromise;
}

async function buildWikiTaxonomy(): Promise<WikiTaxonomy> {
  const wiki = (await getCollection('wiki')).slice();
  const categories = new Map<string, CollectionEntry<'wiki'>[]>();
  const wikiCategory = new Map<string, string | null>();
  for (const entry of wiki) {
    const cat = categoryOf(entry);
    wikiCategory.set(entry.id, cat);
    if (cat) {
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(entry);
    }
  }
  for (const list of categories.values()) {
    list.sort((a, b) => {
      const ua = a.data.updated?.valueOf() ?? 0;
      const ub = b.data.updated?.valueOf() ?? 0;
      if (ub !== ua) return ub - ua;
      return a.data.title.localeCompare(b.data.title);
    });
  }
  return { categories, wikiCategory };
}

export async function listWikiCategoryInfos(): Promise<CategoryInfo[]> {
  const taxonomy = await getWikiTaxonomy();
  const out: CategoryInfo[] = [];
  for (const [slug, items] of taxonomy.categories) {
    out.push({ slug, label: slug, count: items.length });
  }
  out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return out;
}

export interface WikiTreeLeaf {
  id: string;
  title: string;
  subcategory: string | null;
}

export interface WikiTreeCategory {
  slug: string;
  count: number;
  entries: WikiTreeLeaf[];
}

export async function buildWikiTreeForCategory(categorySlug: string): Promise<WikiTreeCategory | null> {
  const taxonomy = await getWikiTaxonomy();
  const entries = taxonomy.categories.get(categorySlug);
  if (!entries) return null;
  const leaves: WikiTreeLeaf[] = entries.map((e) => ({
    id: e.id,
    title: e.data.title,
    subcategory: (e.data as { subcategory?: string }).subcategory ?? null,
  }));
  leaves.sort((a, b) => a.title.localeCompare(b.title));
  return { slug: categorySlug, count: entries.length, entries: leaves };
}

export interface WikiSubGroup {
  slug: string | null;
  entries: CollectionEntry<'wiki'>[];
}

export async function groupCategoryBySubcategory(categorySlug: string): Promise<WikiSubGroup[]> {
  const taxonomy = await getWikiTaxonomy();
  const entries = taxonomy.categories.get(categorySlug) ?? [];
  const groups = new Map<string | null, CollectionEntry<'wiki'>[]>();
  for (const e of entries) {
    const sub = (e.data as { subcategory?: string }).subcategory ?? null;
    if (!groups.has(sub)) groups.set(sub, []);
    groups.get(sub)!.push(e);
  }
  const out: WikiSubGroup[] = [];
  for (const [slug, items] of groups) out.push({ slug, entries: items });
  out.sort((a, b) => {
    if (a.slug === null && b.slug !== null) return 1;
    if (a.slug !== null && b.slug === null) return -1;
    if (a.slug === null && b.slug === null) return 0;
    return b.entries.length - a.entries.length || (a.slug ?? '').localeCompare(b.slug ?? '');
  });
  return out;
}

export async function listSeriesInfos(): Promise<SeriesInfo[]> {
  const taxonomy = await getPostTaxonomy();
  return Array.from(taxonomy.series.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

export interface AdjacentPosts {
  older?: CollectionEntry<'posts'>;
  newer?: CollectionEntry<'posts'>;
  scope: 'category' | 'uncategorized';
}

export async function getAdjacentPosts(postId: string): Promise<AdjacentPosts | null> {
  const taxonomy = await getPostTaxonomy();
  const cat = taxonomy.postCategory.get(postId) ?? null;
  let group: CollectionEntry<'posts'>[];
  let scope: 'category' | 'uncategorized';

  if (cat) {
    group = taxonomy.categories.get(cat) ?? [];
    scope = 'category';
  } else {
    const all = await getPublishedPosts();
    group = all
      .filter((p) => !taxonomy.postCategory.get(p.id))
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
    scope = 'uncategorized';
  }

  const idx = group.findIndex((p) => p.id === postId);
  if (idx === -1) return null;
  return {
    newer: idx > 0 ? group[idx - 1] : undefined,
    older: idx < group.length - 1 ? group[idx + 1] : undefined,
    scope,
  };
}
