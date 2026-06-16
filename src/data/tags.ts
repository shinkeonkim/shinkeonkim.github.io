// Tag metadata registry. See manual-docs/tag-meta-guide.md for the policy
// (canonical = NFC + lowercase key, alias normalization, display label rules).
export interface TagMeta {
  canonical: string;
  aliases?: string[];
  description?: string;
  related?: string[];
}

const TAG_METADATA: TagMeta[] = [
  {
    canonical: 'javascript',
    aliases: ['js', 'JavaScript', 'JS'],
    description: 'JavaScript 언어와 런타임 동작 원리. ECMAScript 명세, 이벤트 루프, 클로저, 비동기 모델 등.',
    related: ['async', 'event-loop', 'closure', 'function', 'web-api'],
  },
  {
    canonical: 'ps',
    aliases: ['PS', '문제풀이'],
    description: '경쟁 프로그래밍과 알고리즘 문제 풀이 (Problem Solving). 백준, Atcoder, Leetcode 등.',
    related: ['BOJ', 'atcoder', 'Leetcode', 'algorithm'],
  },
  {
    canonical: 'async',
    aliases: ['async-await', 'async/await'],
    description: 'JavaScript 비동기 처리. Promise, async/await, microtask 큐, 이벤트 루프와의 상호작용.',
    related: ['javascript', 'promise', 'event-loop', 'microtask'],
  },
  {
    canonical: 'event-loop',
    description: 'JavaScript 이벤트 루프의 동작 원리. Task queue, Microtask queue, 렌더링과의 상호작용.',
    related: ['javascript', 'async', 'microtask'],
  },
  {
    canonical: 'network',
    aliases: ['networking'],
    description: '네트워크 프로토콜과 통신. HTTP, TCP/UDP, QUIC, WebSocket, WebRTC 등.',
    related: ['http', 'protocol', 'transport-layer'],
  },
  {
    canonical: 'closure',
    description: 'JavaScript 클로저. 렉시컬 환경, 스코프 체인, GC 와의 관계.',
    related: ['javascript', 'lexical-environment', 'function'],
  },
  {
    canonical: 'postgresql',
    aliases: ['postgres', 'PostgreSQL'],
    description: 'PostgreSQL 데이터베이스. 인덱스, 쿼리 플랜, work_mem, 벤치마크.',
    related: ['sql', 'database'],
  },
  {
    canonical: 'python',
    aliases: ['Python'],
    description: 'Python 언어와 생태계. 표준 라이브러리, 패키지 관리, 성능 특성.',
  },
];

const aliasToCanonical = new Map<string, string>();
const canonicalToMeta = new Map<string, TagMeta>();

function normKey(s: string): string {
  return s.normalize('NFC').trim().toLowerCase();
}

for (const meta of TAG_METADATA) {
  const canonicalKey = normKey(meta.canonical);
  canonicalToMeta.set(canonicalKey, meta);
  aliasToCanonical.set(canonicalKey, canonicalKey);
  for (const alias of meta.aliases ?? []) {
    aliasToCanonical.set(normKey(alias), canonicalKey);
  }
}

export function canonicalizeTag(tag: string): string {
  const key = normKey(tag);
  return aliasToCanonical.get(key) ?? key;
}

export function getTagMeta(tag: string): TagMeta | undefined {
  const canonical = canonicalizeTag(tag);
  return canonicalToMeta.get(canonical);
}

export function listTagMetadata(): readonly TagMeta[] {
  return TAG_METADATA;
}

// URL slug for a tag (canonical or alias). Replaces URL path-unsafe characters
// (e.g. '/' in 'async/await') so Astro's [tag] dynamic param stays a single segment.
// Mirror this rule in src/lib/sitemap-lastmod.mjs (tagSlug) when changed.
export function tagToSlug(tag: string): string {
  return normKey(tag)
    .replace(/[\\/?#%]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
