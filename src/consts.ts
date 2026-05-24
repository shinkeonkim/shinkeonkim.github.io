export const SITE_TITLE = '김신건의 로그';
export const SITE_DESCRIPTION =
  '개발자 김신건(koa)의 개발 블로그 — Python, Django, Astro, 알고리즘(백준/PS), 웹 개발, 데이터베이스를 기록하는 글·노트·위키.';
export const SITE_URL = 'https://shinkeonkim.com';
export const SITE_AUTHOR = 'koa (김신건)';
export const SITE_LOCALE = 'ko-KR';

export const SITE_KEYWORDS = [
  '개발',
  '개발 블로그',
  '프로그래밍',
  '소프트웨어 엔지니어',
  '알고리즘',
  '자료구조',
  '백준',
  'PS',
  '코딩테스트',
  'Python',
  'Django',
  'TypeScript',
  'JavaScript',
  'Astro',
  'React',
  '웹 개발',
  '데이터베이스',
  'PostgreSQL',
  'Redis',
  '김신건',
  'koa',
  'shinkeonkim',
];

export const SITE_SOCIAL = ['https://github.com/shinkeonkim', 'https://www.acmicpc.net/user/koa'];

export const POSTS_PER_PAGE = 20;
export const NOTES_PER_PAGE = 30;
export const WIKI_PER_PAGE = 40;
export const MAX_GRAPH_NODES = 400;

export const FILE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const EDITOR_AUTOSAVE_INTERVAL_MS = 2000;
export const WIKILINK_AUTOCOMPLETE_MAX = 12;

export const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/posts/', label: '글' },
  { href: '/projects/', label: '프로젝트' },
  { href: '/notes/', label: '한줄노트' },
  { href: '/wiki/', label: '위키' },
  { href: '/graph/', label: '그래프' },
  { href: '/about/', label: '소개' },
] as const;
