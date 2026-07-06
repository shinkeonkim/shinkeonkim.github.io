import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphLink, GraphLinkKind, GraphNode } from '@/shared/types/graph';

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  height?: number;
  query?: string;
}

type SimNode = GraphNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode> & { kind?: GraphLinkKind };

const GROUP_COLORS: Record<string, string> = {
  posts: '#4f46e5',
  notes: '#10b981',
  wiki: '#f59e0b',
};
const TAG_FILL_LIGHT = '#94a3b8';
const TAG_FILL_DARK = '#475569';
const DIM_COLOR = '#a1a1aa';

function tagFill(isDark: boolean): string {
  return isDark ? TAG_FILL_DARK : TAG_FILL_LIGHT;
}

function nodeColor(node: GraphNode, isDark: boolean): string {
  if (node.kind === 'tag') return tagFill(isDark);
  return GROUP_COLORS[node.group ?? ''] ?? '#6b7280';
}

const TAG_NODE_SIZE = 10;
const TAG_LABEL_GAP = 6;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Below this zoom scale, node labels hide so structure stays legible.
const LABEL_ZOOM_THRESHOLD = 0.55;

function seededRandom(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

// Golden-spiral seeding. densityScale (sqrt(n/80)) widens the outer radius as
// n grows so dense graphs start pre-spread instead of piled at the center.
function seedInitialLayout(nodes: SimNode[], width: number, height: number): void {
  const n = nodes.length;
  if (n === 0) return;
  const cx = width / 2;
  const cy = height / 2;
  const densityScale = Math.max(1, Math.sqrt(n / 80));
  const maxRadius = Math.min(width, height) * 0.45 * densityScale;
  const scale = maxRadius / Math.sqrt(n);
  const jitter = Math.max(scale * 0.3, 1);
  const rand = seededRandom(n * 9973 + 7);
  for (let i = 0; i < n; i++) {
    const r = scale * Math.sqrt(i + 0.5);
    const theta = i * GOLDEN_ANGLE;
    nodes[i].x = cx + r * Math.cos(theta) + (rand() - 0.5) * jitter;
    nodes[i].y = cy + r * Math.sin(theta) + (rand() - 0.5) * jitter;
  }
}

interface ForceParams {
  linkDistance: number;
  docCharge: number;
  tagCharge: number;
  docCollide: number;
  centerStrength: number;
  preTicks: number;
}

function computeForceParams(n: number): ForceParams {
  const sizeFactor = Math.max(1, Math.sqrt(n / 60));
  return {
    linkDistance: Math.round(Math.max(80, 60 * sizeFactor)),
    docCharge: -Math.round(Math.max(200, 220 * sizeFactor)),
    tagCharge: -Math.round(Math.max(300, 330 * sizeFactor)),
    docCollide: Math.round(Math.min(50, Math.max(28, 24 * sizeFactor))),
    centerStrength: Math.max(0.03, 0.08 / sizeFactor),
    preTicks: Math.min(80, 30 + Math.floor(n / 10)),
  };
}

export default function Graph({ nodes, links, height = 560, query = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDark, setIsDark] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const matchedIds = useMemo(() => {
    if (!normalizedQuery) return null;
    return new Set(
      nodes.filter((n) => n.title.toLowerCase().includes(normalizedQuery)).map((n) => n.id),
    );
  }, [nodes, normalizedQuery]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svgEl = svgRef.current;
    const width = containerRef.current.clientWidth || 800;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    seedInitialLayout(simNodes, width, height);
    const idSet = new Set(simNodes.map((n) => n.id));
    const simLinks: SimLink[] = links
      .filter((l) => idSet.has(l.source) && idSet.has(l.target))
      .map((l) => ({ source: l.source, target: l.target, kind: l.kind }));

    const root = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
        const showLabels = event.transform.k >= LABEL_ZOOM_THRESHOLD;
        root
          .selectAll<SVGTextElement, SimNode>('.graph-nodes text')
          .style('display', showLabels ? '' : 'none');
      });
    svg.call(zoom);

    const link = root
      .append('g')
      .attr('class', 'graph-links')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.25)
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke-width', (d) => (d.kind === 'tag' ? 0.8 : 1))
      .attr('stroke-dasharray', (d) => (d.kind === 'tag' ? '2 3' : null));

    const nodeGroup = root
      .append('g')
      .attr('class', 'graph-nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('data-kind', (d) => d.kind ?? 'doc')
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        if (d.url) window.location.href = d.url;
      });

    const docNodes = nodeGroup.filter((d) => d.kind !== 'tag');
    const tagNodes = nodeGroup.filter((d) => d.kind === 'tag');

    docNodes
      .append('circle')
      .attr('r', 7)
      .attr('fill', (d) => nodeColor(d, isDark))
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1);

    docNodes
      .append('text')
      .text((d) => d.title)
      .attr('x', 10)
      .attr('y', 4)
      .attr('font-size', 11)
      .attr('fill', 'currentColor')
      .attr('pointer-events', 'none')
      .style('user-select', 'none');

    tagNodes.each(function (d) {
      const sel = d3.select(this);
      sel
        .append('rect')
        .attr('x', -TAG_NODE_SIZE / 2)
        .attr('y', -TAG_NODE_SIZE / 2)
        .attr('width', TAG_NODE_SIZE)
        .attr('height', TAG_NODE_SIZE)
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('fill', tagFill(isDark))
        .attr('fill-opacity', 0.9)
        .attr('stroke', 'currentColor')
        .attr('stroke-opacity', 0.25)
        .attr('stroke-width', 1);
      sel
        .append('text')
        .text(d.title)
        .attr('x', TAG_NODE_SIZE / 2 + TAG_LABEL_GAP)
        .attr('y', 4)
        .attr('font-size', 11)
        .attr('font-weight', 500)
        .attr('fill', 'currentColor')
        .attr('fill-opacity', 0.75)
        .attr('pointer-events', 'none')
        .style('user-select', 'none');
    });

    nodeGroup.append('title').text((d) => d.title);

    const params = computeForceParams(simNodes.length);

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .alpha(0.7)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(params.linkDistance)
          .strength(0.35),
      )
      .force(
        'charge',
        d3
          .forceManyBody<SimNode>()
          .strength((d) => (d.kind === 'tag' ? params.tagCharge : params.docCharge))
          .theta(0.9),
      )
      // forceX/forceY replace forceCenter: centroid-pulling forceCenter fights
      // charge repulsion and re-clusters nodes. Per-axis positions do not.
      .force('x', d3.forceX(width / 2).strength(params.centerStrength))
      .force('y', d3.forceY(height / 2).strength(params.centerStrength))
      .force(
        'collide',
        d3
          .forceCollide<SimNode>()
          .radius((d) => (d.kind === 'tag' ? TAG_NODE_SIZE + 4 : params.docCollide))
          .strength(0.9)
          .iterations(2),
      );

    for (let i = 0; i < params.preTicks; i++) simulation.tick();

    if (simNodes.length > 20) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const node of simNodes) {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;
      if (bboxW > 0 && bboxH > 0) {
        const labelOverhang = 160;
        const padding = 32;
        const kx = (width - padding * 2) / (bboxW + labelOverhang);
        const ky = (height - padding * 2) / bboxH;
        const k = Math.max(0.25, Math.min(1, kx, ky));
        if (k < 1) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const tx = width / 2 - centerX * k;
          const ty = height / 2 - centerY * k;
          const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
          svg.call(zoom.transform, initialTransform);
        }
      }
    }

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroup.call(drag);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);
      nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, height]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg
      .selectAll<SVGCircleElement, SimNode>('.graph-nodes g circle')
      .attr('fill', (d) => {
        if (matchedIds && !matchedIds.has(d.id)) return DIM_COLOR;
        return nodeColor(d, isDark);
      })
      .attr('fill-opacity', (d) => (matchedIds && !matchedIds.has(d.id) ? 0.3 : 1));
    svg
      .selectAll<SVGRectElement, SimNode>('.graph-nodes g rect')
      .attr('fill', (d) => (matchedIds && !matchedIds.has(d.id) ? DIM_COLOR : nodeColor(d, isDark)))
      .attr('fill-opacity', (d) => (matchedIds && !matchedIds.has(d.id) ? 0.3 : 0.9));
    svg
      .selectAll<SVGTextElement, SimNode>('.graph-nodes g text')
      .attr('fill-opacity', (d) => (matchedIds && !matchedIds.has(d.id) ? 0.3 : 1));
    svg.selectAll<SVGLineElement, SimLink>('.graph-links line').attr('stroke-opacity', (l) => {
      const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string);
      const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string);
      if (!matchedIds) return 0.25;
      return matchedIds.has(s) && matchedIds.has(t) ? 0.5 : 0.08;
    });
  }, [matchedIds, isDark]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} width="100%" height={height} aria-label="Knowledge graph" />
    </div>
  );
}
