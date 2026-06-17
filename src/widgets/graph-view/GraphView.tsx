import { lazy, Suspense, useMemo, useState } from 'react';
import Graph2D from './Graph';
import type { GraphLink, GraphNode } from '@/shared/types/graph';

const Graph3D = lazy(() => import('./Graph3D'));

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
}

type CollectionFilter = 'posts' | 'notes' | 'wiki';
const ALL_COLLECTIONS: CollectionFilter[] = ['posts', 'notes', 'wiki'];
const COLLECTION_LABELS: Record<CollectionFilter, string> = {
  posts: '글',
  notes: '노트',
  wiki: '위키',
};

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function GraphView({ nodes, links }: Props) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [query, setQuery] = useState('');
  const [showTags, setShowTags] = useState(true);
  const [enabledCollections, setEnabledCollections] = useState<Set<CollectionFilter>>(
    new Set(ALL_COLLECTIONS),
  );

  const collectionCounts = useMemo(() => {
    const out: Record<CollectionFilter, number> = { posts: 0, notes: 0, wiki: 0 };
    for (const n of nodes) {
      if (n.kind === 'tag') continue;
      const g = n.group as CollectionFilter | undefined;
      if (g && g in out) out[g]++;
    }
    return out;
  }, [nodes]);

  const { visibleNodes, visibleLinks } = useMemo(() => {
    const tagOk = (n: GraphNode) => showTags || n.kind !== 'tag';
    const colOk = (n: GraphNode) =>
      n.kind === 'tag' || (n.group && enabledCollections.has(n.group as CollectionFilter));
    const filteredNodes = nodes.filter((n) => tagOk(n) && colOk(n));
    const ids = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target));
    return { visibleNodes: filteredNodes, visibleLinks: filteredLinks };
  }, [nodes, links, showTags, enabledCollections]);

  const filteredCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const matches = visibleNodes.filter((n) => n.title.toLowerCase().includes(q));
    return { matches: matches.length, total: visibleNodes.length };
  }, [visibleNodes, query]);

  const tagCount = useMemo(() => nodes.filter((n) => n.kind === 'tag').length, [nodes]);

  const toggleCollection = (c: CollectionFilter): void => {
    setEnabledCollections((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const exportJSON = (): void => {
    const data = JSON.stringify({ nodes: visibleNodes, links: visibleLinks }, null, 2);
    downloadBlob('content-graph.json', new Blob([data], { type: 'application/json' }));
  };

  const exportSVG = (): void => {
    const stage = document.querySelector('.graph-stage svg, .react-force-graph-2d svg, svg[width][height]') as
      | SVGSVGElement
      | null;
    if (!stage) return;
    const xml = new XMLSerializer().serializeToString(stage);
    downloadBlob(
      'content-graph.svg',
      new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', xml], { type: 'image/svg+xml' }),
    );
  };

  return (
    <div className="space-y-3 graph-stage">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="노드 이름으로 검색…"
          className="flex-1 min-w-[200px] rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {tagCount > 0 && (
          <label className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTags}
              onChange={(e) => setShowTags(e.target.checked)}
              className="accent-[color:var(--color-accent)]"
            />
            <span>🏷️ 태그 ({tagCount})</span>
          </label>
        )}
        <div
          className="inline-flex overflow-hidden rounded-md border border-border"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === '2d'}
            onClick={() => setMode('2d')}
            className={
              mode === '2d'
                ? 'bg-surface-elevated px-3 py-2 text-sm text-accent'
                : 'px-3 py-2 text-sm text-fg-muted hover:text-fg'
            }
          >
            2D
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === '3d'}
            onClick={() => setMode('3d')}
            className={
              mode === '3d'
                ? 'bg-surface-elevated px-3 py-2 text-sm text-accent'
                : 'px-3 py-2 text-sm text-fg-muted hover:text-fg'
            }
          >
            3D
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-fg-muted">컬렉션:</span>
        {ALL_COLLECTIONS.map((c) => {
          const enabled = enabledCollections.has(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={enabled}
              onClick={() => toggleCollection(c)}
              className={
                enabled
                  ? 'rounded-full border border-accent bg-surface-elevated px-2.5 py-0.5 text-accent'
                  : 'rounded-full border border-border px-2.5 py-0.5 text-fg-muted hover:border-accent'
              }
            >
              {COLLECTION_LABELS[c]} ({collectionCounts[c]})
            </button>
          );
        })}
        <span className="ml-auto inline-flex gap-1">
          <button
            type="button"
            onClick={exportSVG}
            className="rounded-md border border-border px-2 py-1 hover:border-accent"
            title="SVG 다운로드"
          >
            ⤓ SVG
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="rounded-md border border-border px-2 py-1 hover:border-accent"
            title="JSON 다운로드 (nodes + links)"
          >
            ⤓ JSON
          </button>
        </span>
      </div>
      {filteredCounts && (
        <p className="text-xs text-fg-muted">
          {filteredCounts.matches}개 노드가 "{query}" 와 일치 (총 {filteredCounts.total}개 중)
        </p>
      )}
      <div className="rounded-lg border border-border bg-surface-elevated p-2">
        {mode === '2d' ? (
          <Graph2D nodes={visibleNodes} links={visibleLinks} query={query} />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-[560px] items-center justify-center text-sm text-fg-muted">
                3D 뷰를 불러오는 중…
              </div>
            }
          >
            <Graph3D nodes={visibleNodes} links={visibleLinks} query={query} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
