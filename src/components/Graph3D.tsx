import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import type { GraphLink, GraphNode } from '@/shared/types/graph';

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  height?: number;
  query?: string;
}

const GROUP_COLORS: Record<string, string> = {
  posts: '#818cf8',
  notes: '#34d399',
  wiki: '#fbbf24',
};
const TAG_COLOR_3D_LIGHT = '#475569';
const TAG_COLOR_3D_DARK = '#cbd5e1';

function nodeBaseColor(node: GraphNode, isDark: boolean): string {
  if (node.kind === 'tag') return isDark ? TAG_COLOR_3D_DARK : TAG_COLOR_3D_LIGHT;
  return GROUP_COLORS[node.group ?? ''] ?? '#6b7280';
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function seededRandom(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

interface SeededNode extends GraphNode {
  x: number;
  y: number;
  z: number;
}

function fibonacciSphereLayout(nodes: GraphNode[]): SeededNode[] {
  const n = nodes.length;
  if (n === 0) return [];
  const radius = Math.max(80, 14 * Math.cbrt(n));
  const jitter = radius * 0.05;
  const rand = seededRandom(n * 31337 + 11);
  return nodes.map((node, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = i * GOLDEN_ANGLE;
    return {
      ...node,
      x: radius * Math.sin(phi) * Math.cos(theta) + (rand() - 0.5) * jitter,
      y: radius * Math.sin(phi) * Math.sin(theta) + (rand() - 0.5) * jitter,
      z: radius * Math.cos(phi) + (rand() - 0.5) * jitter,
    };
  });
}

export default function Graph3D({ nodes, links, height = 560, query = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const [width, setWidth] = useState(800);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark'));
    update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const data = useMemo(
    () => ({ nodes: fibonacciSphereLayout(nodes), links: links.map((l) => ({ ...l })) }),
    [nodes, links],
  );

  const matchedIds = useMemo(() => {
    if (!normalizedQuery) return null;
    return new Set(
      nodes.filter((n) => n.title.toLowerCase().includes(normalizedQuery)).map((n) => n.id),
    );
  }, [nodes, normalizedQuery]);

  const backgroundColor = isDark ? '#0b0b0f' : '#ffffff';

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: height }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        backgroundColor={backgroundColor}
        nodeLabel={(n) => (n as GraphNode).title}
        nodeRelSize={4}
        nodeThreeObject={(n: GraphNode) => {
          const node = n;
          const dimmed = matchedIds ? !matchedIds.has(node.id) : false;
          const color = dimmed ? (isDark ? '#3f3f46' : '#d4d4d8') : nodeBaseColor(node, isDark);
          if (node.kind === 'tag') {
            const size = Math.min(10, 4 + Math.sqrt(node.degree ?? 1) * 1.2);
            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(size, size * 0.5, size),
              new THREE.MeshLambertMaterial({
                color,
                transparent: true,
                opacity: dimmed ? 0.5 : 0.85,
              }),
            );
            return mesh;
          }
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(4, 20, 16),
            new THREE.MeshLambertMaterial({
              color,
              transparent: true,
              opacity: dimmed ? 0.5 : 0.95,
            }),
          );
          return sphere;
        }}
        linkColor={(l) => {
          if ((l as GraphLink).kind === 'tag') return isDark ? '#52525b' : '#cbd5e1';
          return isDark ? '#3f3f46' : '#d4d4d8';
        }}
        linkOpacity={matchedIds ? 0.15 : 0.4}
        linkWidth={(l) => {
          const isTag = (l as GraphLink).kind === 'tag';
          if (!matchedIds) return isTag ? 0.5 : 1;
          const s =
            typeof l.source === 'object' ? (l.source as GraphNode).id : (l.source as string);
          const t =
            typeof l.target === 'object' ? (l.target as GraphNode).id : (l.target as string);
          return matchedIds.has(s) && matchedIds.has(t) ? 2 : 0.3;
        }}
        onNodeClick={(node) => {
          const n = node as GraphNode;
          if (n.url) window.location.href = n.url;
        }}
        warmupTicks={30}
        cooldownTicks={120}
        d3AlphaDecay={0.035}
        showNavInfo={false}
      />
    </div>
  );
}
