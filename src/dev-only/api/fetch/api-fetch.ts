import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FILE_UPLOAD_MAX_BYTES } from '@/shared/config';
import { errorResponse, jsonResponse, notFoundResponse } from '@/dev-only/shared/api-utils';

export const prerender = false;

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads');

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

const tooLargeMessage = `너무 큽니다 (>${FILE_UPLOAD_MAX_BYTES / 1024 / 1024}MB)`;

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return notFoundResponse();

  let body: FetchBody;
  try {
    body = (await request.json()) as FetchBody;
  } catch {
    return errorResponse('invalid json', 400);
  }

  const rawUrl = (body.url ?? '').trim();
  if (!rawUrl) return errorResponse('url required', 400);

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return errorResponse('잘못된 URL', 400);
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return errorResponse('http/https URL 만 허용', 400);
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { 'User-Agent': 'shinkeonkim-blog-dev-editor/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) {
      return errorResponse(`원격 응답 ${res.status} ${res.statusText}`, 502);
    }
    const contentType =
      res.headers.get('content-type')?.split(';')[0].trim() ?? 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return errorResponse(`이미지가 아닙니다 (${contentType})`, 415);
    }
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > FILE_UPLOAD_MAX_BYTES) return errorResponse(tooLargeMessage, 413);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > FILE_UPLOAD_MAX_BYTES) return errorResponse(tooLargeMessage, 413);

    const urlExt = path.extname(target.pathname).toLowerCase();
    const ext =
      (urlExt && /^\.[a-z0-9]+$/i.test(urlExt) ? urlExt : '') || EXT_BY_TYPE[contentType] || '.bin';
    const base = sanitize(path.basename(target.pathname, urlExt) || target.hostname);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const rand = Math.random().toString(36).slice(2, 8);
    const filename = `${timestamp}-${rand}${base ? '-' + base : ''}${ext}`;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return jsonResponse({
      path: `/uploads/${filename}`,
      sourceUrl: target.toString(),
      size: buffer.length,
      type: contentType,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? '다운로드 실패: ' + err.message : '다운로드 실패',
      502,
    );
  }
};
