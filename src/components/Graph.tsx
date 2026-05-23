import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

export interface GraphNode {
  id: string;
  title: string;
  url: string;
  group?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  height?: number;
  query?: string;
}

type SimNode = GraphNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode>;

const GROUP_COLORS: Record<string, string> = {
  posts: '#4f46e5',
  notes: '#10b981',
  wiki: '#f59e0b',
};
const DIM_COLOR = '#a1a1aa';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function seededRandom(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

function seedInitialLayout(
  nodes: SimNode[],
  width: number,
  height: number,
): void {
  const n = nodes.length;
  if (n === 0) return;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) * 0.4;
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

export default function Graph({ nodes, links, height = 560, query = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
      .map((l) => ({ source: l.source, target: l.target }));

    const root = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
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
      .attr('stroke-width', 1);

    const nodeGroup = root
      .append('g')
      .attr('class', 'graph-nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        if (d.url) window.location.href = d.url;
      });

    nodeGroup
      .append('circle')
      .attr('r', 7)
      .attr('fill', (d) => GROUP_COLORS[d.group ?? ''] ?? '#6b7280')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1);

    nodeGroup
      .append('text')
      .text((d) => d.title)
      .attr('x', 10)
      .attr('y', 4)
      .attr('font-size', 11)
      .attr('fill', 'currentColor')
      .attr('pointer-events', 'none')
      .style('user-select', 'none');

    nodeGroup.append('title').text((d) => d.title);

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .alpha(0.6)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(80)
          .strength(0.4),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-160).distanceMax(400))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collide', d3.forceCollide<SimNode>().radius(28));

    for (let i = 0; i < 30; i++) simulation.tick();

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
      .selectAll<SVGCircleElement, SimNode>('.graph-nodes circle')
      .attr('fill', (d) => {
        if (matchedIds && !matchedIds.has(d.id)) return DIM_COLOR;
        return GROUP_COLORS[d.group ?? ''] ?? '#6b7280';
      })
      .attr('fill-opacity', (d) => (matchedIds && !matchedIds.has(d.id) ? 0.3 : 1));
    svg
      .selectAll<SVGTextElement, SimNode>('.graph-nodes text')
      .attr('fill-opacity', (d) => (matchedIds && !matchedIds.has(d.id) ? 0.3 : 1));
    svg
      .selectAll<SVGLineElement, SimLink>('.graph-links line')
      .attr('stroke-opacity', (l) => {
        if (!matchedIds) return 0.25;
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string);
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string);
        return matchedIds.has(s) && matchedIds.has(t) ? 0.5 : 0.08;
      });
  }, [matchedIds]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} width="100%" height={height} aria-label="Knowledge graph" />
    </div>
  );
}
