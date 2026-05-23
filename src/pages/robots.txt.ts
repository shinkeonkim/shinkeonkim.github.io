import type { APIContext } from 'astro';
import { SITE_URL } from '../consts';

export async function GET(_context: APIContext) {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap-index.xml\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
