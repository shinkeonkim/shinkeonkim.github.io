export interface ExternalProfile {
  key: string;
  label: string;
  url: string;
  icon: string;
  status: 'live' | 'planned';
  description?: string;
}

export const EXTERNAL_PROFILES: ExternalProfile[] = [
  {
    key: 'cv',
    label: 'CV',
    url: 'https://shinkeonkim.com/my-cv',
    icon: '📄',
    status: 'live',
    description: '경력 · 학력 · 기술 스택을 한 페이지로 정리한 이력서.',
  },
  {
    key: 'resume',
    label: 'Resume',
    url: 'https://shinkeonkim.com/my-resume',
    icon: '📋',
    status: 'live',
    description: '국문 자기소개서 + 주요 프로젝트 요약.',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    url: 'https://shinkeonkim.com/my-portfolio',
    icon: '💼',
    status: 'planned',
    description: '주요 프로젝트 상세 + 스크린샷 모음 (준비 중).',
  },
];

export const EXTERNAL_PROFILE_LIVE_URLS = EXTERNAL_PROFILES
  .filter((p) => p.status === 'live')
  .map((p) => p.url);
