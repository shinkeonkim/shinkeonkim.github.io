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

  const filteredCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const matches = nodes.filter((n) => n.title.toLowerCase().includes(q));
    return { matches: matches.length, total: nodes.length };
  }, [nodes, query]);

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
          <Graph2D nodes={nodes} links={links} query={query} />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-[560px] items-center justify-center text-sm text-[color:var(--color-fg-muted)]">
                3D 뷰를 불러오는 중…
              </div>
            }
          >
            <Graph3D nodes={nodes} links={links} query={query} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
