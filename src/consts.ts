export const SITE_TITLE = '김신건의 로그';
export const SITE_DESCRIPTION = '일단 기록을 하자 — koa(김신건)의 블로그, 노트, 위키';
export const SITE_URL = 'https://shinkeonkim.com';
export const SITE_AUTHOR = 'koa (김신건)';
export const SITE_LOCALE = 'ko-KR';

export const POSTS_PER_PAGE = 20;
export const NOTES_PER_PAGE = 30;
export const WIKI_PER_PAGE = 40;
export const MAX_GRAPH_NODES = 400;

export const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/posts/', label: '글' },
  { href: '/notes/', label: '한줄노트' },
  { href: '/wiki/', label: '위키' },
  { href: '/graph/', label: '그래프' },
  { href: '/search/', label: '검색' },
  { href: '/about/', label: '소개' },
] as const;
