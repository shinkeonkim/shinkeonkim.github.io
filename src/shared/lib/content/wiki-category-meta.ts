export interface WikiCategoryMeta {
  icon: string;
  color: string;
}

const WIKI_CATEGORY_META: Record<string, WikiCategoryMeta> = {
  algorithm: { icon: '🧮', color: '#a78bfa' },
  concurrency: { icon: '⚡', color: '#fbbf24' },
  django: { icon: '🟢', color: '#0c4b33' },
  frameworks: { icon: '🧰', color: '#94a3b8' },
  java: { icon: '☕', color: '#ed8b00' },
  javascript: { icon: '📜', color: '#f7df1e' },
  ml: { icon: '🤖', color: '#06b6d4' },
  network: { icon: '🌐', color: '#3b82f6' },
  pandas: { icon: '🐼', color: '#150458' },
  python: { icon: '🐍', color: '#3776ab' },
  rails: { icon: '🚂', color: '#cc0000' },
  spring: { icon: '🍃', color: '#6db33f' },
  sql: { icon: '🗄️', color: '#64748b' },
};

const DEFAULT_META: WikiCategoryMeta = { icon: '📁', color: '#94a3b8' };

export function getWikiCategoryMeta(slug: string): WikiCategoryMeta {
  return WIKI_CATEGORY_META[slug] ?? DEFAULT_META;
}
