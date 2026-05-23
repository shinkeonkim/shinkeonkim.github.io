import { getCollection, type CollectionEntry } from 'astro:content';

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
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(SLUG_RE, '-')
    .replace(/^-|-$/g, '');
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
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).slice();

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
  const postSeries = new Map<string, { slug: string; name: string; order: number; total: number }>();
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

export async function listSeriesInfos(): Promise<SeriesInfo[]> {
  const taxonomy = await getPostTaxonomy();
  return Array.from(taxonomy.series.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
