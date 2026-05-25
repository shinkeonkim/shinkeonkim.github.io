import type { ImageElement } from '../../animations/schema';
import { addElement, getDef, uniqueElementId } from './state';

export type IconCategory = 'cloud' | 'aws' | 'database' | 'language' | 'frontend' | 'tool' | 'network' | 'erd' | 'shape';

export interface IconEntry {
  id: string;
  title: string;
  src: string;
  category: IconCategory;
}

function simpleIcon(slug: string, color = '6366f1'): string {
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}

function iconify(prefix: string, name: string, color?: string): string {
  const c = color ? `?color=%23${color}` : '';
  return `https://api.iconify.design/${prefix}/${name}.svg${c}`;
}

function dataSvg(svg: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const ICON_LIBRARY_RAW: IconEntry[] = [
  { id: 'aws', title: 'AWS', src: simpleIcon('amazonwebservices', 'ff9900'), category: 'cloud' },
  { id: 'gcp', title: 'Google Cloud', src: simpleIcon('googlecloud', '4285f4'), category: 'cloud' },
  { id: 'azure', title: 'Azure', src: simpleIcon('microsoftazure', '0078d4'), category: 'cloud' },
  { id: 'cloudflare', title: 'Cloudflare', src: simpleIcon('cloudflare', 'f38020'), category: 'cloud' },
  { id: 'vercel', title: 'Vercel', src: simpleIcon('vercel', '000000'), category: 'cloud' },
  { id: 'netlify', title: 'Netlify', src: simpleIcon('netlify', '00c7b7'), category: 'cloud' },
  { id: 'digitalocean', title: 'DigitalOcean', src: simpleIcon('digitalocean', '0080ff'), category: 'cloud' },
  { id: 'heroku', title: 'Heroku', src: simpleIcon('heroku', '430098'), category: 'cloud' },
  { id: 'fly', title: 'Fly.io', src: simpleIcon('fly', '24175b'), category: 'cloud' },
  { id: 'render', title: 'Render', src: simpleIcon('render', '46e3b7'), category: 'cloud' },
  { id: 'firebase', title: 'Firebase', src: simpleIcon('firebase', 'ffca28'), category: 'cloud' },
  { id: 'supabase', title: 'Supabase', src: simpleIcon('supabase', '3ecf8e'), category: 'cloud' },

  { id: 'aws-ec2', title: 'EC2', src: iconify('logos', 'aws-ec2'), category: 'aws' },
  { id: 'aws-s3', title: 'S3', src: iconify('logos', 'aws-s3'), category: 'aws' },
  { id: 'aws-rds', title: 'RDS', src: iconify('logos', 'aws-rds'), category: 'aws' },
  { id: 'aws-lambda', title: 'Lambda', src: iconify('logos', 'aws-lambda'), category: 'aws' },
  { id: 'aws-dynamodb', title: 'DynamoDB', src: iconify('logos', 'aws-dynamodb'), category: 'aws' },
  { id: 'aws-cloudfront', title: 'CloudFront', src: iconify('logos', 'aws-cloudfront'), category: 'aws' },
  { id: 'aws-route53', title: 'Route 53', src: iconify('logos', 'aws-route-53'), category: 'aws' },
  { id: 'aws-sqs', title: 'SQS', src: iconify('logos', 'aws-sqs'), category: 'aws' },
  { id: 'aws-sns', title: 'SNS', src: iconify('logos', 'aws-sns'), category: 'aws' },
  { id: 'aws-elb', title: 'ELB', src: iconify('logos', 'aws-elb'), category: 'aws' },
  { id: 'aws-iam', title: 'IAM', src: iconify('logos', 'aws-iam'), category: 'aws' },
  { id: 'aws-vpc', title: 'VPC', src: iconify('logos', 'aws-vpc'), category: 'aws' },
  { id: 'aws-kinesis', title: 'Kinesis', src: iconify('logos', 'aws-kinesis'), category: 'aws' },
  { id: 'aws-ecs', title: 'ECS', src: iconify('logos', 'aws-ecs'), category: 'aws' },
  { id: 'aws-eks', title: 'EKS', src: iconify('logos', 'aws-eks'), category: 'aws' },
  { id: 'aws-aurora', title: 'Aurora', src: iconify('logos', 'aws-aurora'), category: 'aws' },
  { id: 'aws-elasticache', title: 'ElastiCache', src: iconify('logos', 'aws-elasticache'), category: 'aws' },
  { id: 'aws-apigateway', title: 'API Gateway', src: iconify('logos', 'aws-api-gateway'), category: 'aws' },
  { id: 'aws-cloudwatch', title: 'CloudWatch', src: iconify('logos', 'aws-cloudwatch'), category: 'aws' },

  { id: 'postgres', title: 'PostgreSQL', src: simpleIcon('postgresql', '4169e1'), category: 'database' },
  { id: 'mysql', title: 'MySQL', src: simpleIcon('mysql', '4479a1'), category: 'database' },
  { id: 'mongodb', title: 'MongoDB', src: simpleIcon('mongodb', '47a248'), category: 'database' },
  { id: 'redis', title: 'Redis', src: simpleIcon('redis', 'dc382d'), category: 'database' },
  { id: 'sqlite', title: 'SQLite', src: simpleIcon('sqlite', '003b57'), category: 'database' },
  { id: 'elasticsearch', title: 'Elasticsearch', src: simpleIcon('elasticsearch', '005571'), category: 'database' },
  { id: 'cassandra', title: 'Cassandra', src: simpleIcon('apachecassandra', '1287b1'), category: 'database' },
  { id: 'kafka', title: 'Kafka', src: simpleIcon('apachekafka', '231f20'), category: 'database' },
  { id: 'rabbitmq', title: 'RabbitMQ', src: simpleIcon('rabbitmq', 'ff6600'), category: 'database' },
  { id: 'mariadb', title: 'MariaDB', src: simpleIcon('mariadb', '003545'), category: 'database' },
  { id: 'dynamodb', title: 'DynamoDB', src: iconify('logos', 'aws-dynamodb'), category: 'database' },
  { id: 'neo4j', title: 'Neo4j', src: simpleIcon('neo4j', '008cc1'), category: 'database' },
  { id: 'influxdb', title: 'InfluxDB', src: simpleIcon('influxdb', '22adf6'), category: 'database' },

  { id: 'python', title: 'Python', src: simpleIcon('python', '3776ab'), category: 'language' },
  { id: 'js', title: 'JavaScript', src: simpleIcon('javascript', 'f7df1e'), category: 'language' },
  { id: 'ts', title: 'TypeScript', src: simpleIcon('typescript', '3178c6'), category: 'language' },
  { id: 'go', title: 'Go', src: simpleIcon('go', '00add8'), category: 'language' },
  { id: 'rust', title: 'Rust', src: simpleIcon('rust', '000000'), category: 'language' },
  { id: 'java', title: 'Java', src: simpleIcon('openjdk', '000000'), category: 'language' },
  { id: 'ruby', title: 'Ruby', src: simpleIcon('ruby', 'cc342d'), category: 'language' },
  { id: 'kotlin', title: 'Kotlin', src: simpleIcon('kotlin', '7f52ff'), category: 'language' },
  { id: 'swift', title: 'Swift', src: simpleIcon('swift', 'f05138'), category: 'language' },
  { id: 'csharp', title: 'C#', src: simpleIcon('csharp', '512bd4'), category: 'language' },
  { id: 'cpp', title: 'C++', src: simpleIcon('cplusplus', '00599c'), category: 'language' },
  { id: 'php', title: 'PHP', src: simpleIcon('php', '777bb4'), category: 'language' },
  { id: 'elixir', title: 'Elixir', src: simpleIcon('elixir', '4b275f'), category: 'language' },

  { id: 'react', title: 'React', src: simpleIcon('react', '61dafb'), category: 'frontend' },
  { id: 'vue', title: 'Vue', src: simpleIcon('vuedotjs', '4fc08d'), category: 'frontend' },
  { id: 'svelte', title: 'Svelte', src: simpleIcon('svelte', 'ff3e00'), category: 'frontend' },
  { id: 'nextjs', title: 'Next.js', src: simpleIcon('nextdotjs', '000000'), category: 'frontend' },
  { id: 'nuxt', title: 'Nuxt', src: simpleIcon('nuxtdotjs', '00dc82'), category: 'frontend' },
  { id: 'astro-fw', title: 'Astro', src: simpleIcon('astro', 'bc52ee'), category: 'frontend' },
  { id: 'remix', title: 'Remix', src: simpleIcon('remix', '000000'), category: 'frontend' },
  { id: 'solid', title: 'SolidJS', src: simpleIcon('solid', '2c4f7c'), category: 'frontend' },
  { id: 'angular', title: 'Angular', src: simpleIcon('angular', 'dd0031'), category: 'frontend' },
  { id: 'tailwind', title: 'Tailwind', src: simpleIcon('tailwindcss', '06b6d4'), category: 'frontend' },
  { id: 'sass', title: 'Sass', src: simpleIcon('sass', 'cc6699'), category: 'frontend' },
  { id: 'webpack', title: 'Webpack', src: simpleIcon('webpack', '8dd6f9'), category: 'frontend' },
  { id: 'vite', title: 'Vite', src: simpleIcon('vite', '646cff'), category: 'frontend' },

  { id: 'docker', title: 'Docker', src: simpleIcon('docker', '2496ed'), category: 'tool' },
  { id: 'k8s', title: 'Kubernetes', src: simpleIcon('kubernetes', '326ce5'), category: 'tool' },
  { id: 'nginx', title: 'Nginx', src: simpleIcon('nginx', '009639'), category: 'tool' },
  { id: 'github', title: 'GitHub', src: simpleIcon('github', '181717'), category: 'tool' },
  { id: 'git', title: 'Git', src: simpleIcon('git', 'f05032'), category: 'tool' },
  { id: 'gitlab', title: 'GitLab', src: simpleIcon('gitlab', 'fc6d26'), category: 'tool' },
  { id: 'terraform', title: 'Terraform', src: simpleIcon('terraform', '7b42bc'), category: 'tool' },
  { id: 'ansible', title: 'Ansible', src: simpleIcon('ansible', 'ee0000'), category: 'tool' },
  { id: 'jenkins', title: 'Jenkins', src: simpleIcon('jenkins', 'd24939'), category: 'tool' },
  { id: 'githubactions', title: 'GitHub Actions', src: simpleIcon('githubactions', '2088ff'), category: 'tool' },
  { id: 'prometheus', title: 'Prometheus', src: simpleIcon('prometheus', 'e6522c'), category: 'tool' },
  { id: 'grafana', title: 'Grafana', src: simpleIcon('grafana', 'f46800'), category: 'tool' },

  { id: 'http', title: 'HTTP', src: simpleIcon('curl', '073551'), category: 'network' },
  { id: 'graphql', title: 'GraphQL', src: simpleIcon('graphql', 'e10098'), category: 'network' },
  { id: 'grpc', title: 'gRPC', src: simpleIcon('trpc', '398ccb'), category: 'network' },
  { id: 'websocket', title: 'WebSocket', src: simpleIcon('socketdotio', '010101'), category: 'network' },
  { id: 'lb-icon', title: 'Load Balancer', src: iconify('mdi', 'scale-balance', '6366f1'), category: 'network' },
  { id: 'cdn-icon', title: 'CDN', src: iconify('mdi', 'web', '6366f1'), category: 'network' },
  { id: 'firewall', title: 'Firewall', src: iconify('mdi', 'wall', '6366f1'), category: 'network' },
  { id: 'vpn', title: 'VPN', src: iconify('mdi', 'vpn', '6366f1'), category: 'network' },
  { id: 'router', title: 'Router', src: iconify('mdi', 'router-wireless', '6366f1'), category: 'network' },
  { id: 'switch-icon', title: 'Switch', src: iconify('mdi', 'switch', '6366f1'), category: 'network' },

  { id: 'erd-table', title: 'Table', src: iconify('mdi', 'table', '6366f1'), category: 'erd' },
  { id: 'erd-key', title: 'Primary Key', src: iconify('mdi', 'key', 'fbbf24'), category: 'erd' },
  { id: 'erd-key-link', title: 'Foreign Key', src: iconify('mdi', 'key-link', '6366f1'), category: 'erd' },
  { id: 'erd-relation', title: 'Relationship', src: iconify('mdi', 'relation-many-to-many', '6366f1'), category: 'erd' },
  { id: 'erd-one-many', title: 'One to Many', src: iconify('mdi', 'relation-one-to-many', '6366f1'), category: 'erd' },
  { id: 'erd-one-one', title: 'One to One', src: iconify('mdi', 'relation-one-to-one', '6366f1'), category: 'erd' },
  { id: 'erd-index', title: 'Index', src: iconify('mdi', 'database-search', '6366f1'), category: 'erd' },
  { id: 'erd-view', title: 'View', src: iconify('mdi', 'eye', '6366f1'), category: 'erd' },

  { id: 'user', title: '사용자', src: dataSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6366f1"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>'), category: 'shape' },
  { id: 'server', title: '서버', src: dataSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r="0.8" fill="#6366f1"/><circle cx="7" cy="17" r="0.8" fill="#6366f1"/></svg>'), category: 'shape' },
  { id: 'database-icon', title: '데이터베이스', src: dataSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></svg>'), category: 'shape' },
  { id: 'cloud-icon', title: '클라우드', src: dataSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M18 10h-1.3A6 6 0 0 0 5 9a4 4 0 0 0-1 7.9h13a4 4 0 0 0 1-7.9z"/></svg>'), category: 'shape' },
  { id: 'queue', title: '큐', src: iconify('mdi', 'tray-full', '6366f1'), category: 'shape' },
  { id: 'cache', title: '캐시', src: iconify('mdi', 'database-clock', '6366f1'), category: 'shape' },
  { id: 'lock', title: '잠금', src: iconify('mdi', 'lock', '6366f1'), category: 'shape' },
  { id: 'check', title: '체크', src: iconify('mdi', 'check-circle', '22c55e'), category: 'shape' },
  { id: 'cross', title: '엑스', src: iconify('mdi', 'close-circle', 'ef4444'), category: 'shape' },
  { id: 'warning', title: '경고', src: iconify('mdi', 'alert', 'fbbf24'), category: 'shape' },
  { id: 'info', title: '정보', src: iconify('mdi', 'information', '3b82f6'), category: 'shape' },
  { id: 'mobile', title: '모바일', src: iconify('mdi', 'cellphone', '6366f1'), category: 'shape' },
  { id: 'laptop', title: '노트북', src: iconify('mdi', 'laptop', '6366f1'), category: 'shape' },
  { id: 'monitor', title: '모니터', src: iconify('mdi', 'monitor', '6366f1'), category: 'shape' },
  { id: 'api-icon', title: 'API', src: iconify('mdi', 'api', '6366f1'), category: 'shape' },
];

export const ICON_LIBRARY: IconEntry[] = ICON_LIBRARY_RAW;

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

    const cats: IconCategory[] | string[] = ['all', 'cloud', 'aws', 'database', 'language', 'frontend', 'tool', 'network', 'erd', 'shape'];
    const catLabels: Record<string, string> = {
      all: '전체', cloud: '☁ Cloud', aws: '🟧 AWS', database: '🗄 DB',
      language: '💻 Lang', frontend: '🎨 FE', tool: '🔧 Tool',
      network: '🌐 Net', erd: '🔗 ERD', shape: '◇ Shape',
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
