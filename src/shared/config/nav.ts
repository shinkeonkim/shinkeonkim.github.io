export const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/posts/', label: '글' },
  { href: '/notes/', label: '노트' },
  { href: '/wiki/', label: '위키' },
  { href: '/graph/', label: '그래프' },
  { href: '/about/', label: '소개' },
] as const;

export const EXTERNAL_NAV_ITEMS = [
  { href: 'https://shinkeonkim.com/my-resume', label: '이력서' },
  { href: 'https://shinkeonkim.com/my-portfolio', label: '포트폴리오' },
] as const;

export const DEV_NAV_ITEMS = [
  { href: '/_editor', label: '에디터', icon: '✎' },
  { href: '/_studio', label: '스튜디오', icon: '🎬' },
  { href: '/_chart-editor', label: '차트', icon: '📊' },
] as const;

export const FOOTER_NAV_GROUPS = [
  {
    title: '사이트',
    links: [
      { href: '/', label: '홈' },
      { href: '/posts/', label: '글' },
      { href: '/notes/', label: '노트' },
      { href: '/wiki/', label: '위키' },
      { href: '/graph/', label: '그래프' },
      { href: '/about/', label: '소개' },
    ],
  },
  {
    title: '컨텐츠',
    links: [
      { href: '/glossary/', label: '용어' },
      { href: '/courses/', label: '코스' },
      { href: '/animations/', label: '애니메이션' },
      { href: '/posts/categories/', label: '카테고리' },
      { href: '/wiki/categories/', label: '위키 카테고리' },
    ],
  },
  {
    title: '참고 자료',
    links: [
      { href: '/sources/', label: 'References' },
      { href: '/tags/', label: '태그' },
      { href: '/feed/', label: 'RSS 피드' },
      { href: '/search/', label: '검색' },
    ],
  },
  {
    title: '외부',
    links: [
      { href: 'https://shinkeonkim.com/my-resume', label: '이력서', external: true },
      { href: 'https://shinkeonkim.com/my-portfolio', label: '포트폴리오', external: true },
      { href: 'https://shinkeonkim.com/my-cv', label: 'CV', external: true },
      { href: 'https://github.com/shinkeonkim', label: 'GitHub', external: true },
    ],
  },
] as const;
