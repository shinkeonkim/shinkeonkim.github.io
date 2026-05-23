import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads');
const MAX_SIZE = 20 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};

function sanitize(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

interface FetchBody {
  url?: string;
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response('Not available', { status: 404 });
  }

  let body: FetchBody;
  try {
    body = (await request.json()) as FetchBody;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawUrl = (body.url ?? '').trim();
  if (!rawUrl) {
    return new Response(JSON.stringify({ error: 'url required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return new Response(JSON.stringify({ error: '잘못된 URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'http/https URL 만 허용' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { 'User-Agent': 'shinkeonkim-blog-dev-editor/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `원격 응답 ${res.status} ${res.statusText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const contentType = res.headers.get('content-type')?.split(';')[0].trim() ?? 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: `이미지가 아닙니다 (${contentType})` }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > MAX_SIZE) {
      return new Response(JSON.stringify({ error: `너무 큽니다 (>${MAX_SIZE / 1024 / 1024}MB)` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_SIZE) {
      return new Response(JSON.stringify({ error: `너무 큽니다 (>${MAX_SIZE / 1024 / 1024}MB)` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const urlExt = path.extname(target.pathname).toLowerCase();
    const ext = (urlExt && /^\.[a-z0-9]+$/i.test(urlExt) ? urlExt : '') || EXT_BY_TYPE[contentType] || '.bin';
    const base = sanitize(path.basename(target.pathname, urlExt) || target.hostname);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const rand = Math.random().toString(36).slice(2, 8);
    const filename = `${timestamp}-${rand}${base ? '-' + base : ''}${ext}`;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return new Response(
      JSON.stringify({
        path: `/uploads/${filename}`,
        sourceUrl: target.toString(),
        size: buffer.length,
        type: contentType,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: '다운로드 실패: ' + msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
