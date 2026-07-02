import { getPublishedWiki } from '@/shared/lib/content/content-queries';
import {
  canonicalId,
  getContentGraph,
  type Collection,
} from '@/shared/lib/content/content-graph';
import { previewOf } from '@/shared/lib/content/wikilink-preview';

const SUMMARY_MAX = 100;

export interface GlossaryTerm {
  id: string;
  slug: string;
  title: string;
  url: string;
  summary: string;
  category?: string;
}

export interface GlossaryEntry extends GlossaryTerm {
  aliases: string[];
  backlinksCount: number;
  firstChar: string;
}

let outboundCache: Promise<Map<string, GlossaryTerm[]>> | null = null;
let fullIndexCache: Promise<GlossaryEntry[]> | null = null;

async function buildWikiTermMap(): Promise<Map<string, GlossaryTerm>> {
  const wiki = await getPublishedWiki();
  const map = new Map<string, GlossaryTerm>();
  for (const w of wiki) {
    const body = (w as { body?: string }).body ?? '';
    const id = canonicalId('wiki', w.id);
    let category: string | undefined = w.data.category;
    if (!category) {
      const parts = w.id.split('/');
      if (parts.length >= 2) category = parts[0];
    }
    map.set(id, {
      id,
      slug: w.id,
      title: w.data.title,
      url: `/wiki/${w.id}/`,
      summary: previewOf(body, SUMMARY_MAX),
      category,
    });
  }
  return map;
}

async function buildOutboundIndex(): Promise<Map<string, GlossaryTerm[]>> {
  const [graph, terms] = await Promise.all([getContentGraph(), buildWikiTermMap()]);

  const out = new Map<string, GlossaryTerm[]>();
  const seenPerSource = new Map<string, Set<string>>();

  for (const link of graph.links) {
    if (link.kind !== 'wikilink') continue;
    const src = String(link.source);
    const tgt = String(link.target);
    if (!tgt.startsWith('wiki:')) continue;

    const term = terms.get(tgt);
    if (!term) continue;

    let seen = seenPerSource.get(src);
    if (!seen) {
      seen = new Set();
      seenPerSource.set(src, seen);
    }
    if (seen.has(tgt)) continue;
    seen.add(tgt);

    let list = out.get(src);
    if (!list) {
      list = [];
      out.set(src, list);
    }
    list.push(term);
  }

  for (const list of out.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  }

  return out;
}

export function getOutboundGlossary(): Promise<Map<string, GlossaryTerm[]>> {
  if (!outboundCache) outboundCache = buildOutboundIndex();
  return outboundCache;
}

export async function getGlossaryFor(
  collection: Collection,
  slug: string,
): Promise<GlossaryTerm[]> {
  const idx = await getOutboundGlossary();
  return idx.get(canonicalId(collection, slug)) ?? [];
}

function firstCharOf(title: string): string {
  const ch = title.trim().charAt(0);
  if (!ch) return '#';
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const HANGUL_INITIALS = [
      '\u3131', '\u3132', '\u3134', '\u3137', '\u3138', '\u3139',
      '\u3141', '\u3142', '\u3143', '\u3145', '\u3146', '\u3147',
      '\u3148', '\u3149', '\u314a', '\u314b', '\u314c', '\u314d', '\u314e',
    ];
    const idx = Math.floor((code - 0xac00) / 588);
    return HANGUL_INITIALS[idx];
  }
  const upper = ch.toUpperCase();
  if (/[A-Z]/.test(upper)) return upper;
  return '#';
}

async function buildFullIndex(): Promise<GlossaryEntry[]> {
  const [graph, wiki] = await Promise.all([getContentGraph(), getPublishedWiki()]);
  const out: GlossaryEntry[] = [];
  for (const w of wiki) {
    const body = (w as { body?: string }).body ?? '';
    const id = canonicalId('wiki', w.id);
    let category: string | undefined = w.data.category;
    if (!category) {
      const parts = w.id.split('/');
      if (parts.length >= 2) category = parts[0];
    }
    const backlinks = graph.backlinks.get(id) ?? [];
    out.push({
      id,
      slug: w.id,
      title: w.data.title,
      url: `/wiki/${w.id}/`,
      summary: previewOf(body, SUMMARY_MAX),
      category,
      aliases: w.data.aliases ?? [],
      backlinksCount: backlinks.length,
      firstChar: firstCharOf(w.data.title),
    });
  }
  out.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  return out;
}

export function getFullGlossary(): Promise<GlossaryEntry[]> {
  if (!fullIndexCache) fullIndexCache = buildFullIndex();
  return fullIndexCache;
}
