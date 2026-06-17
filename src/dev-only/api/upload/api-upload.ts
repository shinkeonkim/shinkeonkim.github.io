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
  if (!import.meta.env.DEV) return notFoundResponse();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('multipart 요청이 아닙니다', 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) return errorResponse('file 필드가 필요합니다', 400);
  if (file.size === 0) return errorResponse('빈 파일', 400);
  if (file.size > FILE_UPLOAD_MAX_BYTES) {
    return errorResponse(`파일이 너무 큽니다 (>${FILE_UPLOAD_MAX_BYTES / 1024 / 1024}MB)`, 413);
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
  await fs.writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return jsonResponse({
    path: `/uploads/${filename}`,
    name: file.name,
    size: file.size,
    type: file.type,
  });
};
