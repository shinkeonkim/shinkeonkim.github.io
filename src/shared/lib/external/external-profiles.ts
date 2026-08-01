export interface ExternalProfile {
  key: string;
  label: string;
  url: string;
  icon: string;
  description?: string;
}

export const EXTERNAL_PROFILES: ExternalProfile[] = [
  {
    key: 'cv',
    label: 'CV',
    url: 'https://cv.shinkeonkim.com/',
    icon: '📄',
    description: '경력 · 학력 · 기술 스택을 한 페이지로 정리한 이력서.',
  },
  {
    key: 'resume',
    label: 'Resume',
    url: 'https://resume.shinkeonkim.com/',
    icon: '📋',
    description: '국문 자기소개서 + 주요 프로젝트 요약.',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    url: 'https://portfolio.shinkeonkim.com/',
    icon: '💼',
    description: '주요 프로젝트 상세 + 스크린샷 모음.',
  },
];
