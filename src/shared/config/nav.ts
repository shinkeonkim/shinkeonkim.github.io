export const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/posts/', label: '글' },
  { href: '/notes/', label: '노트' },
  { href: '/wiki/', label: '위키' },
  { href: '/glossary/', label: '용어' },
  { href: '/animations/', label: '애니메이션' },
  { href: '/graph/', label: '그래프' },
  { href: '/errata/', label: '정오표' },
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
