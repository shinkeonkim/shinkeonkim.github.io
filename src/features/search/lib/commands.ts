export interface CommandEntry {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: 'toggle-theme' | 'copy-url' | 'print' | 'top' | 'rss';
  keywords?: string[];
  shortcut?: string;
}

export const COMMAND_LIST: CommandEntry[] = [
  { id: 'go-home', label: '홈', href: '/', keywords: ['home', 'index', '메인'] },
  { id: 'go-posts', label: '글 (목록)', href: '/posts/', keywords: ['blog', 'posts'] },
  { id: 'go-notes', label: '노트', href: '/notes/', keywords: ['notes', '메모', '한줄'] },
  { id: 'go-wiki', label: '위키', href: '/wiki/', keywords: ['wiki'] },
  { id: 'go-tags', label: '태그', href: '/tags/', keywords: ['tags'] },
  { id: 'go-graph', label: '그래프', href: '/graph/', keywords: ['graph', 'network'] },
  { id: 'go-sources', label: '출처 / 인용', href: '/sources/', keywords: ['sources', 'bibliography', 'citation'] },
  { id: 'go-about', label: '소개', href: '/about/', keywords: ['about', 'profile'] },
  { id: 'toggle-theme', label: '테마 전환 (다크/라이트)', action: 'toggle-theme', keywords: ['theme', 'dark', 'light', 'mode'] },
  { id: 'copy-url', label: '현재 페이지 URL 복사', action: 'copy-url', keywords: ['copy', 'link', 'url'] },
  { id: 'scroll-top', label: '맨 위로', action: 'top', keywords: ['top', 'scroll'], shortcut: 'g g' },
  { id: 'rss', label: 'RSS 피드 보기', action: 'rss', keywords: ['rss', 'feed', '구독'] },
  { id: 'print', label: '현재 페이지 인쇄', action: 'print', keywords: ['print', '인쇄'] },
];

export const HELP_ITEMS = [
  { keys: ['⌘+K', '/'], desc: '검색 / 명령 팔레트 열기' },
  { keys: ['Esc'], desc: '모달 닫기' },
  { keys: ['↑', '↓'], desc: '결과 이동' },
  { keys: ['Enter'], desc: '선택 실행' },
  { keys: ['>'], desc: '명령 팔레트 모드' },
  { keys: ['#'], desc: '태그 점프 모드' },
  { keys: ['?'], desc: '이 도움말' },
  { keys: ['⌘+S'], desc: '저장 (에디터 안에서)' },
  { keys: ['⌘+B', '⌘+I', '⌘+K'], desc: '굵게 / 기울임 / 링크 (에디터 안에서)' },
];

export const SECTION_LABELS: Record<string, string> = { posts: '글', notes: '노트', wiki: '위키' };
export const MODE_LABELS: Record<string, string> = { search: '검색', command: '명령', tag: '태그', help: '도움말' };

declare global {
  interface Window {
    gtag?: (event: string, ...args: unknown[]) => void;
  }
}

export function runCommand(cmd: CommandEntry, closeModal: () => void): void {
  if (cmd.action === 'toggle-theme') {
    const root = document.documentElement;
    const isDark = root.classList.toggle('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    });
    closeModal();
    return;
  }
  if (cmd.action === 'copy-url') {
    navigator.clipboard?.writeText(location.href).catch(() => {});
    closeModal();
    return;
  }
  if (cmd.action === 'print') {
    closeModal();
    setTimeout(() => window.print(), 100);
    return;
  }
  if (cmd.action === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeModal();
    return;
  }
  if (cmd.action === 'rss') {
    closeModal();
    window.location.href = '/rss.xml';
    return;
  }
  if (cmd.href) {
    closeModal();
    window.location.href = cmd.href;
  }
}
