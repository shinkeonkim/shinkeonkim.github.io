import type { ImageElement } from '../../animations/schema';
import { addElement, getDef, uniqueElementId } from './state';

export interface IconEntry {
  id: string;
  title: string;
  src: string;
  category: 'cloud' | 'database' | 'language' | 'tool' | 'network' | 'shape';
}

function simpleIcon(slug: string, color = '6366f1'): string {
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}

export const ICON_LIBRARY: IconEntry[] = [
  { id: 'aws', title: 'AWS', src: simpleIcon('amazonwebservices', 'ff9900'), category: 'cloud' },
  { id: 'gcp', title: 'Google Cloud', src: simpleIcon('googlecloud', '4285f4'), category: 'cloud' },
  { id: 'azure', title: 'Azure', src: simpleIcon('microsoftazure', '0078d4'), category: 'cloud' },
  { id: 'cloudflare', title: 'Cloudflare', src: simpleIcon('cloudflare', 'f38020'), category: 'cloud' },
  { id: 'vercel', title: 'Vercel', src: simpleIcon('vercel', '000000'), category: 'cloud' },
  { id: 'netlify', title: 'Netlify', src: simpleIcon('netlify', '00c7b7'), category: 'cloud' },

  { id: 'postgres', title: 'PostgreSQL', src: simpleIcon('postgresql', '4169e1'), category: 'database' },
  { id: 'mysql', title: 'MySQL', src: simpleIcon('mysql', '4479a1'), category: 'database' },
  { id: 'mongodb', title: 'MongoDB', src: simpleIcon('mongodb', '47a248'), category: 'database' },
  { id: 'redis', title: 'Redis', src: simpleIcon('redis', 'dc382d'), category: 'database' },
  { id: 'sqlite', title: 'SQLite', src: simpleIcon('sqlite', '003b57'), category: 'database' },
  { id: 'elasticsearch', title: 'Elasticsearch', src: simpleIcon('elasticsearch', '005571'), category: 'database' },

  { id: 'python', title: 'Python', src: simpleIcon('python', '3776ab'), category: 'language' },
  { id: 'js', title: 'JavaScript', src: simpleIcon('javascript', 'f7df1e'), category: 'language' },
  { id: 'ts', title: 'TypeScript', src: simpleIcon('typescript', '3178c6'), category: 'language' },
  { id: 'go', title: 'Go', src: simpleIcon('go', '00add8'), category: 'language' },
  { id: 'rust', title: 'Rust', src: simpleIcon('rust', '000000'), category: 'language' },
  { id: 'java', title: 'Java', src: simpleIcon('openjdk', '000000'), category: 'language' },

  { id: 'docker', title: 'Docker', src: simpleIcon('docker', '2496ed'), category: 'tool' },
  { id: 'k8s', title: 'Kubernetes', src: simpleIcon('kubernetes', '326ce5'), category: 'tool' },
  { id: 'nginx', title: 'Nginx', src: simpleIcon('nginx', '009639'), category: 'tool' },
  { id: 'github', title: 'GitHub', src: simpleIcon('github', '181717'), category: 'tool' },
  { id: 'git', title: 'Git', src: simpleIcon('git', 'f05032'), category: 'tool' },

  { id: 'http', title: 'HTTP', src: simpleIcon('curl', '073551'), category: 'network' },
  { id: 'graphql', title: 'GraphQL', src: simpleIcon('graphql', 'e10098'), category: 'network' },
  { id: 'grpc', title: 'gRPC', src: simpleIcon('trpc', '398ccb'), category: 'network' },

  { id: 'user', title: '사용자', src: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>'), category: 'shape' },
  { id: 'server', title: '서버', src: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r="0.8" fill="%236366f1"/><circle cx="7" cy="17" r="0.8" fill="%236366f1"/></svg>'), category: 'shape' },
  { id: 'database-icon', title: '데이터베이스', src: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></svg>'), category: 'shape' },
  { id: 'cloud-icon', title: '클라우드', src: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"><path d="M18 10h-1.3A6 6 0 0 0 5 9a4 4 0 0 0-1 7.9h13a4 4 0 0 0 1-7.9z"/></svg>'), category: 'shape' },
];

export class IconLibraryDialog {
  private dialog: HTMLDialogElement;
  private listEl: HTMLElement;
  private searchEl: HTMLInputElement;
  private categoryFilter: string = 'all';

  constructor(dialog: HTMLDialogElement, listEl: HTMLElement, searchEl: HTMLInputElement) {
    this.dialog = dialog;
    this.listEl = listEl;
    this.searchEl = searchEl;
    this.bind();
  }

  static mount(): IconLibraryDialog | null {
    const dialog = document.getElementById('studio-icon-dialog') as HTMLDialogElement | null;
    const listEl = document.getElementById('studio-icon-list');
    const searchEl = document.getElementById('studio-icon-search') as HTMLInputElement | null;
    if (!dialog || !listEl || !searchEl) return null;
    return new IconLibraryDialog(dialog, listEl, searchEl);
  }

  open(): void {
    this.render();
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
  }

  close(): void {
    if (typeof this.dialog.close === 'function') this.dialog.close();
    else this.dialog.removeAttribute('open');
  }

  private bind(): void {
    this.searchEl.addEventListener('input', () => this.render());
    this.dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-icon-dialog-close]')) {
        this.close();
        return;
      }
      const catBtn = target.closest<HTMLElement>('[data-icon-cat]');
      if (catBtn) {
        this.categoryFilter = catBtn.dataset.iconCat ?? 'all';
        this.render();
        return;
      }
      const pickBtn = target.closest<HTMLElement>('[data-icon-pick]');
      if (pickBtn) {
        const id = pickBtn.dataset.iconPick ?? '';
        this.insertIcon(id);
        return;
      }
    });
  }

  private render(): void {
    const query = this.searchEl.value.trim().toLowerCase();
    const filtered = ICON_LIBRARY.filter((it) => {
      if (this.categoryFilter !== 'all' && it.category !== this.categoryFilter) return false;
      if (query && !it.id.includes(query) && !it.title.toLowerCase().includes(query)) return false;
      return true;
    });

    const cats = ['all', 'cloud', 'database', 'language', 'tool', 'network', 'shape'];
    const catLabels: Record<string, string> = {
      all: '전체', cloud: '☁ Cloud', database: '🗄 DB', language: '💻 Lang',
      tool: '🔧 Tool', network: '🌐 Net', shape: '◇ Shape',
    };
    const catBar = cats
      .map((c) => `<button type="button" data-icon-cat="${c}" class="studio-icon-cat-btn ${this.categoryFilter === c ? 'is-active' : ''}">${catLabels[c]}</button>`)
      .join('');

    const grid = filtered.length === 0
      ? '<div class="studio-icon-empty">검색 결과 없음</div>'
      : filtered
          .map(
            (it) => `<button type="button" data-icon-pick="${it.id}" class="studio-icon-item" title="${it.title}">
              <img src="${it.src}" alt="${it.title}" />
              <span>${it.title}</span>
            </button>`,
          )
          .join('');

    this.listEl.innerHTML = `
      <div class="studio-icon-cat-bar">${catBar}</div>
      <div class="studio-icon-grid">${grid}</div>
    `;
  }

  private insertIcon(iconId: string): void {
    const def = getDef();
    if (!def) return;
    const icon = ICON_LIBRARY.find((i) => i.id === iconId);
    if (!icon) return;
    const cx = def.canvas.width / 2;
    const cy = def.canvas.height / 2;
    const id = uniqueElementId(iconId.replace(/[^a-z0-9]/g, ''));
    const el: ImageElement = {
      type: 'image',
      id,
      rotation: 0,
      x: cx - 32,
      y: cy - 32,
      width: 64,
      height: 64,
      src: icon.src,
      preserveAspectRatio: 'xMidYMid meet',
      opacity: 1,
    };
    addElement(el);
    this.close();
  }
}
