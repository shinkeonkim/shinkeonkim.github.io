export interface WikiCategoryMeta {
  icon: string;
  color: string;
}

const svg = (path: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const letterMark = (letters: string, bg: string, fg = '#ffffff'): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="4" fill="${bg}"/><text x="12" y="16.5" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" font-weight="700" fill="${fg}">${letters}</text></svg>`;

const BRAND_ICONS: Record<string, string> = {
  python: letterMark('py', '#3776ab', '#ffd43b'),
  typescript: letterMark('TS', '#3178c6'),
  javascript: letterMark('JS', '#f7df1e', '#1a1a1a'),
  java: letterMark('Jv', '#ed8b00'),
  django: letterMark('Dj', '#092e20'),
  rails: letterMark('Rb', '#cc0000'),
  spring: letterMark('sb', '#6db33f'),
  kubernetes: letterMark('k8s', '#326ce5'),
  pandas: letterMark('pd', '#150458', '#ffca00'),
  fastapi: letterMark('fa', '#009688'),
  flask: letterMark('Fl', '#000000'),
  sql: letterMark('SQL', '#00758f'),
};

const ICON_PATHS: Record<string, string> = {
  algorithm:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="10" y2="11"/><line x1="12" y1="11" x2="14" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="10" y2="15"/><line x1="12" y1="15" x2="14" y2="15"/><line x1="8" y1="19" x2="10" y2="19"/><line x1="12" y1="19" x2="16" y2="19"/>',
  concurrency: '<path d="M13 2 L4 14 h6 l-1 8 l9-12 h-6 z"/>',
  ai: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="1.5"/><circle cx="19" cy="6" r="1.5"/><circle cx="5" cy="18" r="1.5"/><circle cx="19" cy="18" r="1.5"/><line x1="6.5" y1="6.5" x2="10" y2="10.5"/><line x1="17.5" y1="6.5" x2="14" y2="10.5"/><line x1="6.5" y1="17.5" x2="10" y2="13.5"/><line x1="17.5" y1="17.5" x2="14" y2="13.5"/>',
  'api-design':
    '<path d="M8 4 h-2 a2 2 0 0 0 -2 2 v4 a2 2 0 0 1 -2 2 a2 2 0 0 1 2 2 v4 a2 2 0 0 0 2 2 h2"/><path d="M16 4 h2 a2 2 0 0 1 2 2 v4 a2 2 0 0 0 2 2 a2 2 0 0 0 -2 2 v4 a2 2 0 0 1 -2 2 h-2"/>',
  'auth-security':
    '<path d="M12 2 L4 5 v6 c0 5 3.5 9 8 11 c4.5-2 8-6 8-11 V5 z"/><circle cx="12" cy="11" r="1.75"/><line x1="12" y1="12.75" x2="12" y2="16"/>',
  cloud:
    '<path d="M6.5 18 A4 4 0 0 1 6 10.1 A6 6 0 0 1 17.6 10 A3.5 3.5 0 0 1 17 18 z"/>',
  'data-structure':
    '<circle cx="12" cy="4" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="4" cy="20" r="1.5"/><circle cx="10" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><line x1="12" y1="5.5" x2="6.5" y2="10.5"/><line x1="12" y1="5.5" x2="17.5" y2="10.5"/><line x1="6" y1="13.5" x2="4.5" y2="18.5"/><line x1="6" y1="13.5" x2="9.5" y2="18.5"/><line x1="18" y1="13.5" x2="18" y2="18.5"/>',
  'database-internals':
    '<ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5 v6 c0 1.4 3.6 2.5 8 2.5 s8-1.1 8-2.5 v-6"/><path d="M4 11 v6 c0 1.4 3.6 2.5 8 2.5 s8-1.1 8-2.5 v-6"/>',
  devops:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3 M4.9 4.9 l2.1 2.1 M17 17 l2.1 2.1 M4.9 19.1 l2.1 -2.1 M17 7 l2.1 -2.1"/>',
  'distributed-systems':
    '<circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/><line x1="12" y1="6" x2="6" y2="10.5"/><line x1="12" y1="6" x2="18" y2="10.5"/><line x1="6" y1="13.5" x2="7" y2="18"/><line x1="18" y1="13.5" x2="17" y2="18"/><line x1="10" y1="20" x2="14" y2="20"/>',
  'discrete-math':
    '<path d="M4 5 h14 l-8 7 l8 7 h-14"/><line x1="14" y1="12" x2="20" y2="12"/>',
  plt: '<path d="M4 4 h16 v3 h-16 z"/><path d="M6 10 l4 4 l-4 4"/><line x1="12" y1="18" x2="20" y2="18"/>',
  django:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M11 7 v10 M11 7 c-3 0-5 2-5 5 s2 5 5 5 M14 7 v13"/>',
  frameworks:
    '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8 V6 a2 2 0 0 1 2 -2 h4 a2 2 0 0 1 2 2 v2"/><line x1="3" y1="13" x2="21" y2="13"/><line x1="12" y1="10" x2="12" y2="16"/>',
  java:
    '<path d="M6 8 h11 v6 a5 5 0 0 1 -5 5 h-1 a5 5 0 0 1 -5 -5 z"/><path d="M17 10 h1.5 a2.5 2.5 0 0 1 0 5 H17"/><path d="M9 3 s1 1 0 2 s1 1 0 2"/><path d="M13 3 s1 1 0 2 s1 1 0 2"/>',
  javascript:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M10 12 v4 a2 2 0 0 1 -4 0"/><path d="M18 12 c-3 0 -3 3 0 3 s3 3 0 3"/>',
  kubernetes:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="4" x2="12" y2="10"/><line x1="12" y1="14" x2="12" y2="20"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="20" y2="12"/><line x1="6.3" y1="6.3" x2="10.6" y2="10.6"/><line x1="13.4" y1="13.4" x2="17.7" y2="17.7"/><line x1="6.3" y1="17.7" x2="10.6" y2="13.4"/><line x1="13.4" y1="10.6" x2="17.7" y2="6.3"/>',
  ml: '<path d="M9 4 a3 3 0 0 0 -3 3 a3 3 0 0 0 -2 3 v0 a3 3 0 0 0 2 3 v0 a3 3 0 0 0 0 4 a3 3 0 0 0 3 3 h6 a3 3 0 0 0 3 -3 a3 3 0 0 0 0 -4 a3 3 0 0 0 2 -3 a3 3 0 0 0 -2 -3 a3 3 0 0 0 -3 -3 z"/><line x1="12" y1="4" x2="12" y2="20"/>',
  network:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/>',
  pandas:
    '<rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
  python:
    '<circle cx="12" cy="12" r="9"/><path d="M8 8 h4 a2 2 0 0 1 0 4 h-4 z"/><path d="M8 12 v4"/>',
  rails:
    '<line x1="6" y1="3" x2="6" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/><line x1="5" y1="6" x2="19" y2="6"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="5" y1="18" x2="19" y2="18"/>',
  search:
    '<circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/>',
  spring:
    '<path d="M4 20 c 4 0 12 -2 16 -12 c 0 4 -2 12 -12 14 c -3 0 -4 -1 -4 -2 z"/><path d="M4 20 c 4 -4 8 -6 14 -8"/>',
  sql: '<ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5 v14 c0 1.4 3.6 2.5 8 2.5 s8-1.1 8-2.5 V5"/><path d="M4 12 c0 1.4 3.6 2.5 8 2.5 s8-1.1 8-2.5"/>',
  typescript:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10 h6 M10 10 v7"/><path d="M18 11 c-3 -1 -4 2 -1 3 s2 3 -1 3"/>',
  virtualization:
    '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  voice:
    '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11 v1 a7 7 0 0 0 14 0 v-1"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>',
};

const COLORS: Record<string, string> = {
  algorithm: '#a78bfa',
  concurrency: '#fbbf24',
  ai: '#8b5cf6',
  'api-design': '#0ea5e9',
  'auth-security': '#dc2626',
  cloud: '#0284c7',
  'data-structure': '#a855f7',
  'database-internals': '#475569',
  'discrete-math': '#0f766e',
  plt: '#7c3aed',
  devops: '#22c55e',
  'distributed-systems': '#0891b2',
  django: '#092e20',
  fastapi: '#009688',
  flask: '#000000',
  frameworks: '#94a3b8',
  java: '#ed8b00',
  javascript: '#f7df1e',
  kubernetes: '#326ce5',
  ml: '#06b6d4',
  network: '#3b82f6',
  pandas: '#150458',
  python: '#3776ab',
  rails: '#cc0000',
  search: '#f59e0b',
  spring: '#6db33f',
  sql: '#00758f',
  typescript: '#3178c6',
  virtualization: '#ea580c',
  voice: '#db2777',
};

const allSlugs = new Set<string>([
  ...Object.keys(ICON_PATHS),
  ...Object.keys(BRAND_ICONS),
  ...Object.keys(COLORS),
]);

const WIKI_CATEGORY_META: Record<string, WikiCategoryMeta> = Object.fromEntries(
  [...allSlugs].map((slug) => {
    const icon = BRAND_ICONS[slug] ?? (ICON_PATHS[slug] ? svg(ICON_PATHS[slug]) : undefined);
    return [
      slug,
      {
        icon:
          icon ??
          svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8 h6 l2 -2 h10"/>'),
        color: COLORS[slug] ?? '#94a3b8',
      },
    ];
  }),
);

const DEFAULT_META: WikiCategoryMeta = {
  icon: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8 h6 l2 -2 h10"/>'),
  color: '#94a3b8',
};

export function getWikiCategoryMeta(slug: string): WikiCategoryMeta {
  return WIKI_CATEGORY_META[slug] ?? DEFAULT_META;
}
