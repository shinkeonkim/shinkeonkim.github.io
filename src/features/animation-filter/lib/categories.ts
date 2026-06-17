export const CATEGORY_LABELS: Record<string, string> = {
  network: '🌐 네트워크',
  cache: '⚡ 캐시',
  algorithm: '🔢 알고리즘',
  architecture: '🏛 아키텍처',
  flow: '🔀 흐름',
  protocol: '📡 프로토콜',
  general: '🎬 일반',
};

export const CATEGORY_ORDER = [
  'algorithm',
  'architecture',
  'flow',
  'protocol',
  'network',
  'cache',
  'general',
];

export function catRank(c: string): number {
  const i = CATEGORY_ORDER.indexOf(c);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

export function categoryLabel(category: string | undefined): string {
  const c = category ?? 'general';
  return CATEGORY_LABELS[c] ?? `🎬 ${c}`;
}
