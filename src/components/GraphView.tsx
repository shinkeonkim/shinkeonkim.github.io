import { lazy, Suspense, useMemo, useState } from 'react';
import Graph2D, { type GraphNode, type GraphLink } from './Graph';

const Graph3D = lazy(() => import('./Graph3D'));

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function GraphView({ nodes, links }: Props) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [query, setQuery] = useState('');
  const [showTags, setShowTags] = useState(true);

  const { visibleNodes, visibleLinks } = useMemo(() => {
    if (showTags) return { visibleNodes: nodes, visibleLinks: links };
    const filteredNodes = nodes.filter((n) => n.kind !== 'tag');
    const ids = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target));
    return { visibleNodes: filteredNodes, visibleLinks: filteredLinks };
  }, [nodes, links, showTags]);

  const filteredCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const matches = visibleNodes.filter((n) => n.title.toLowerCase().includes(q));
    return { matches: matches.length, total: visibleNodes.length };
  }, [visibleNodes, query]);

  const tagCount = useMemo(() => nodes.filter((n) => n.kind === 'tag').length, [nodes]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="노드 이름으로 검색…"
          className="flex-1 min-w-[200px] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent)]"
        />
        {tagCount > 0 && (
          <label className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] px-2.5 py-1.5 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTags}
              onChange={(e) => setShowTags(e.target.checked)}
              className="accent-[color:var(--color-accent)]"
            />
            <span>🏷️ 태그 ({tagCount})</span>
          </label>
        )}
        <div className="inline-flex overflow-hidden rounded-md border border-[color:var(--color-border)]" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === '2d'}
            onClick={() => setMode('2d')}
            className={
              mode === '2d'
                ? 'bg-[color:var(--color-surface-elevated)] px-3 py-2 text-sm text-[color:var(--color-accent)]'
                : 'px-3 py-2 text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
            }
          >2D</button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === '3d'}
            onClick={() => setMode('3d')}
            className={
              mode === '3d'
                ? 'bg-[color:var(--color-surface-elevated)] px-3 py-2 text-sm text-[color:var(--color-accent)]'
                : 'px-3 py-2 text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
            }
          >3D</button>
        </div>
      </div>
      {filteredCounts && (
        <p className="text-xs text-[color:var(--color-fg-muted)]">
          {filteredCounts.matches}개 노드가 "{query}" 와 일치 (총 {filteredCounts.total}개 중)
        </p>
      )}
      <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] p-2">
        {mode === '2d' ? (
          <Graph2D nodes={visibleNodes} links={visibleLinks} query={query} />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-[560px] items-center justify-center text-sm text-[color:var(--color-fg-muted)]">
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
