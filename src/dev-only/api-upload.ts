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
  'application/pdf': '.pdf',
};

function sanitizeName(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response('Not available', { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'multipart 요청이 아닙니다' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'file 필드가 필요합니다' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (file.size === 0) {
    return new Response(JSON.stringify({ error: '빈 파일' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: `파일이 너무 큽니다 (>${MAX_SIZE / 1024 / 1024}MB)` }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const originalExt = path.extname(file.name).toLowerCase();
  const guessedExt = EXT_BY_TYPE[file.type] ?? '';
  const ext = originalExt || guessedExt || '.bin';
  const base = path.basename(file.name, originalExt);
  const safe = sanitizeName(base);
  const timestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-:T]/g, '')
    .replace(/\d{6}$/, (s) => s);
  const rand = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${rand}${safe ? '-' + safe : ''}${ext}`;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const fullPath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

  return new Response(
    JSON.stringify({
      path: `/uploads/${filename}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
