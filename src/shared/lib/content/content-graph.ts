import { getCollection } from 'astro:content';
import { loadAllAnimations } from '@/entities/animation/engine/loader';
import { getPublishedPosts } from './content-queries';
import { canonicalizeTag, getTagMeta } from '@/data/tags';

export type Collection = 'posts' | 'notes' | 'wiki';
export type NodeKind = 'doc' | 'tag';

export interface ContentNode {
  id: string;
  kind: NodeKind;
  collection?: Collection;
  slug: string;
  title: string;
  url: string;
  degree?: number;
  category?: string;
}

export type ContentLinkKind = 'wikilink' | 'tag' | 'prereq' | 'follows';

export interface ContentLink {
  source: string;
  target: string;
  kind?: ContentLinkKind;
}

export interface UnresolvedLearningPathRef {
  from: string;
  kind: 'prereq' | 'follows';
  raw: string;
}

export interface LearningPathCycle {
  nodes: string[];
}

export interface ContentGraph {
  nodes: ContentNode[];
  links: ContentLink[];
  backlinks: Map<string, ContentNode[]>;
  slugMap: Map<string, ContentNode>;
  animationBacklinks: Map<string, ContentNode[]>;
  learningPath: {
    prereqs: Map<string, ContentNode[]>;
    follows: Map<string, ContentNode[]>;
    unresolved: UnresolvedLearningPathRef[];
    cycles: LearningPathCycle[];
  };
}

export function tagId(tag: string): string {
  return `tag:${canonicalizeTag(tag)}`;
}

export function tagUrl(tag: string): string {
  return `/tags/${encodeURIComponent(canonicalizeTag(tag))}/`;
}

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

// Matches a CommonMark fenced code block whose info string is `anim:<id>`.
// Mirrors the lang pattern enforced by src/plugins/remark-animation.mjs so the
// backlink scanner stays consistent with what actually renders as an animation.
const ANIM_FENCE_RE = /^[ \t]{0,3}(?:`{3,}|~{3,})anim:([a-z0-9][a-z0-9_-]*)[ \t]*$/gim;

let cache: Promise<ContentGraph> | null = null;

export function getContentGraph(): Promise<ContentGraph> {
  if (!cache) cache = build();
  return cache;
}

export function canonicalId(collection: Collection, slug: string): string {
  return `${collection}:${slug}`;
}

export interface Subgraph {
  nodes: ContentNode[];
  links: ContentLink[];
}

export async function getSubgraph(
  centerId: string,
  options: { depth?: number; includeTags?: boolean } = {},
): Promise<Subgraph> {
  const { depth = 1, includeTags = true } = options;
  const graph = await getContentGraph();
  const center = graph.nodes.find((n) => n.id === centerId);
  if (!center) return { nodes: [], links: [] };

  const adjacency = new Map<string, Set<string>>();
  for (const l of graph.links) {
    const s = String(l.source);
    const t = String(l.target);
    if (!adjacency.has(s)) adjacency.set(s, new Set());
    if (!adjacency.has(t)) adjacency.set(t, new Set());
    adjacency.get(s)!.add(t);
    adjacency.get(t)!.add(s);
  }

  const reachable = new Set<string>([center.id]);
  let frontier: string[] = [center.id];
  for (let i = 0; i < depth; i++) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const n of adjacency.get(node) ?? []) {
        if (reachable.has(n)) continue;
        reachable.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }

  const nodes = graph.nodes.filter((n) => {
    if (!reachable.has(n.id)) return false;
    if (!includeTags && n.kind === 'tag') return false;
    return true;
  });
  const links = graph.links.filter((l) => {
    const s = String(l.source);
    const t = String(l.target);
    return reachable.has(s) && reachable.has(t);
  });
  return { nodes, links };
}

function urlFor(collection: Collection, slug: string): string {
  if (collection === 'posts') return `/posts/${slug}/`;
  if (collection === 'wiki') return `/wiki/${slug}/`;
  return `/notes/${slug}/`;
}

interface TaggedEntry {
  id: string;
  data: { tags?: string[] };
}

async function build(): Promise<ContentGraph> {
  const [posts, notes, wiki, animations] = await Promise.all([
    getPublishedPosts(),
    getCollection('notes'),
    getCollection('wiki'),
    loadAllAnimations(),
  ]);

  const validAnimIds = new Set(animations.map((a) => a.id.toLowerCase()));

  const nodes: ContentNode[] = [];
  const slugMap = new Map<string, ContentNode>();
  const wikiSlugMap = new Map<string, ContentNode>();

  function addEntry(collection: Collection, entry: { id: string; data: Record<string, unknown> }) {
    const slug = entry.id;
    const data = entry.data as { title?: string; aliases?: string[]; category?: string };
    const title = data.title ?? slug;
    let category: string | undefined = data.category;
    if (!category && collection === 'wiki') {
      const parts = slug.split('/');
      if (parts.length >= 2) category = parts[0];
    }
    const node: ContentNode = {
      id: canonicalId(collection, slug),
      kind: 'doc',
      collection,
      slug,
      title,
      url: urlFor(collection, slug),
      category,
    };
    nodes.push(node);

    const filename = slug.includes('/') ? slug.split('/').pop()! : slug;
    const aliases = Array.isArray(data.aliases) ? data.aliases : [];
    const keys = [slug, filename, title, ...aliases].filter(Boolean);
    for (const k of keys) {
      const lower = k.toLowerCase();
      if (!slugMap.has(lower)) slugMap.set(lower, node);
      if (collection === 'wiki' && !wikiSlugMap.has(lower)) wikiSlugMap.set(lower, node);
    }
  }

  for (const e of posts) addEntry('posts', e);
  for (const e of wiki) addEntry('wiki', e);
  for (const e of notes) addEntry('notes', e);

  const links: ContentLink[] = [];
  const linkSeen = new Set<string>();
  const backlinks = new Map<string, ContentNode[]>();
  const backlinkSeen = new Map<string, Set<string>>();
  const animationBacklinks = new Map<string, ContentNode[]>();
  const animationBacklinkSeen = new Map<string, Set<string>>();

  function scan(entry: { id: string; body?: string }) {
    const body = entry.body ?? '';
    if (!body) return;
    const sourceNode = slugMap.get(entry.id.toLowerCase());
    if (!sourceNode) return;

    if (body.includes('[[')) {
      const re = new RegExp(WIKILINK_RE.source, WIKILINK_RE.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const targetText = m[1].trim().toLowerCase();
        const targetNode = slugMap.get(targetText);
        if (!targetNode || targetNode.id === sourceNode.id) continue;

        const linkKey = `${sourceNode.id}->${targetNode.id}`;
        if (!linkSeen.has(linkKey)) {
          linkSeen.add(linkKey);
          links.push({ source: sourceNode.id, target: targetNode.id, kind: 'wikilink' });
        }

        let bset = backlinkSeen.get(targetNode.id);
        if (!bset) {
          bset = new Set();
          backlinkSeen.set(targetNode.id, bset);
        }
        if (!bset.has(sourceNode.id)) {
          bset.add(sourceNode.id);
          let list = backlinks.get(targetNode.id);
          if (!list) {
            list = [];
            backlinks.set(targetNode.id, list);
          }
          list.push(sourceNode);
        }
      }
    }

    if (body.includes('anim:')) {
      const re = new RegExp(ANIM_FENCE_RE.source, ANIM_FENCE_RE.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const animId = m[1].toLowerCase();
        if (!validAnimIds.has(animId)) continue;

        let aset = animationBacklinkSeen.get(animId);
        if (!aset) {
          aset = new Set();
          animationBacklinkSeen.set(animId, aset);
        }
        if (aset.has(sourceNode.id)) continue;
        aset.add(sourceNode.id);
        let list = animationBacklinks.get(animId);
        if (!list) {
          list = [];
          animationBacklinks.set(animId, list);
        }
        list.push(sourceNode);
      }
    }
  }

  for (const e of posts) scan(e as { id: string; body?: string });
  for (const e of wiki) scan(e as { id: string; body?: string });
  for (const e of notes) scan(e as { id: string; body?: string });

  // Aliases collapse into one canonical tag node. tagFirstRaw keeps the first
  // raw spelling for display fallback when no TagMeta is registered.
  const tagMembers = new Map<string, Set<string>>();
  const tagFirstRaw = new Map<string, string>();
  function collectTags(collection: Collection, entry: TaggedEntry) {
    const tags = entry.data?.tags;
    if (!Array.isArray(tags) || tags.length === 0) return;
    const docId = canonicalId(collection, entry.id);
    for (const raw of tags) {
      const tag = String(raw ?? '').trim();
      if (!tag) continue;
      const key = canonicalizeTag(tag);
      let set = tagMembers.get(key);
      if (!set) {
        set = new Set();
        tagMembers.set(key, set);
      }
      set.add(docId);
      if (!tagFirstRaw.has(key)) tagFirstRaw.set(key, tag);
    }
  }
  for (const e of posts) collectTags('posts', e as TaggedEntry);
  for (const e of wiki) collectTags('wiki', e as TaggedEntry);

  for (const [canonical, members] of tagMembers) {
    if (members.size < 1) continue;
    const meta = getTagMeta(canonical);
    const displayLabel = meta?.canonical ?? tagFirstRaw.get(canonical) ?? canonical;
    const node: ContentNode = {
      id: tagId(canonical),
      kind: 'tag',
      slug: canonical,
      title: `#${displayLabel}`,
      url: tagUrl(canonical),
      degree: members.size,
    };
    nodes.push(node);
    for (const docId of members) {
      links.push({ source: docId, target: node.id, kind: 'tag' });
    }
  }

  const prereqs = new Map<string, ContentNode[]>();
  const follows = new Map<string, ContentNode[]>();
  const unresolved: UnresolvedLearningPathRef[] = [];

  function resolveLearningPathSlug(raw: string): ContentNode | null {
    const key = String(raw ?? '').trim().toLowerCase();
    if (!key) return null;
    return wikiSlugMap.get(key) ?? slugMap.get(key) ?? null;
  }

  function collectLearningPath(
    collection: Collection,
    entry: { id: string; data: { prerequisites?: string[]; leadsTo?: string[] } },
  ) {
    const sourceId = canonicalId(collection, entry.id);
    const pre = Array.isArray(entry.data.prerequisites) ? entry.data.prerequisites : [];
    const lead = Array.isArray(entry.data.leadsTo) ? entry.data.leadsTo : [];
    for (const raw of pre) {
      const target = resolveLearningPathSlug(raw);
      if (!target) {
        unresolved.push({ from: sourceId, kind: 'prereq', raw });
        continue;
      }
      if (target.id === sourceId) continue;
      links.push({ source: sourceId, target: target.id, kind: 'prereq' });
      let list = prereqs.get(sourceId);
      if (!list) {
        list = [];
        prereqs.set(sourceId, list);
      }
      if (!list.some((n) => n.id === target.id)) list.push(target);
    }
    for (const raw of lead) {
      const target = resolveLearningPathSlug(raw);
      if (!target) {
        unresolved.push({ from: sourceId, kind: 'follows', raw });
        continue;
      }
      if (target.id === sourceId) continue;
      links.push({ source: sourceId, target: target.id, kind: 'follows' });
      let list = follows.get(sourceId);
      if (!list) {
        list = [];
        follows.set(sourceId, list);
      }
      if (!list.some((n) => n.id === target.id)) list.push(target);
    }
  }
  for (const e of posts) collectLearningPath('posts', e as { id: string; data: { prerequisites?: string[]; leadsTo?: string[] } });
  for (const e of wiki) collectLearningPath('wiki', e as { id: string; data: { prerequisites?: string[]; leadsTo?: string[] } });

  const cycles = detectLearningPathCycles(links);

  return {
    nodes,
    links,
    backlinks,
    slugMap,
    animationBacklinks,
    learningPath: { prereqs, follows, unresolved, cycles },
  };
}

// Builds the learning-order DAG (Y -> X when X has prereq Y, X -> Z when X leadsTo Z)
// and reports every simple cycle via iterative DFS.
function detectLearningPathCycles(links: ContentLink[]): LearningPathCycle[] {
  const adj = new Map<string, string[]>();
  for (const l of links) {
    if (l.kind === 'follows') {
      const bucket = adj.get(l.source) ?? [];
      bucket.push(l.target);
      adj.set(l.source, bucket);
    } else if (l.kind === 'prereq') {
      const bucket = adj.get(l.target) ?? [];
      bucket.push(l.source);
      adj.set(l.target, bucket);
    }
  }

  const cycles: LearningPathCycle[] = [];
  const seenCycleKeys = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const stackIdx = new Map<string, number>();

  function dfs(node: string) {
    if (stackIdx.has(node)) {
      const start = stackIdx.get(node)!;
      const cycle = stack.slice(start).concat(node);
      const key = [...cycle].sort().join('|');
      if (!seenCycleKeys.has(key)) {
        seenCycleKeys.add(key);
        cycles.push({ nodes: cycle });
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.push(node);
    stackIdx.set(node, stack.length - 1);
    for (const next of adj.get(node) ?? []) dfs(next);
    stack.pop();
    stackIdx.delete(node);
  }

  for (const start of adj.keys()) dfs(start);
  return cycles;
}
