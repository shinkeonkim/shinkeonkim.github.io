import type { APIRoute } from 'astro';
import { notFoundResponse } from '@/dev-only/shared/api-utils';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkWikilink from '@/plugins/remark-wikilink.mjs';
import remarkMermaid from '@/plugins/remark-mermaid.mjs';
import remarkMathLenient from '@/plugins/remark-math-lenient.mjs';
import remarkUrlPreview from '@/plugins/remark-url-preview.mjs';
import remarkAnimation from '@/plugins/remark-animation.mjs';
import { preprocessMdx } from './mdx-preprocess';

export const prerender = false;

let processorPromise: Promise<Awaited<ReturnType<typeof createMarkdownProcessor>>> | null = null;
function getProcessor() {
  if (!processorPromise) {
    processorPromise = createMarkdownProcessor({
      gfm: true,
      smartypants: true,
      remarkPlugins: [
        remarkAnimation,
        remarkMermaid,
        remarkAlert,
        remarkWikilink,
        remarkMathLenient,
        remarkMath,
        remarkUrlPreview,
      ],
      rehypePlugins: [[rehypeKatex, { output: 'html', strict: 'ignore' }]],
      shikiConfig: {
        themes: { light: 'github-light', dark: 'one-dark-pro' },
        wrap: true,
      },
    });
  }
  return processorPromise;
}

interface RenderBody {
  content?: string;
  ext?: string;
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return notFoundResponse();
  }

  let body: RenderBody;
  try {
    body = (await request.json()) as RenderBody;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const raw = typeof body.content === 'string' ? body.content : '';
  const ext = body.ext === '.mdx' ? '.mdx' : '.md';

  try {
    const parsed = parseFrontmatter(raw, { frontmatter: 'empty-with-spaces' });
    const fm = parsed.frontmatter;
    let markdown = parsed.content;
    let componentNames: string[] = [];

    if (ext === '.mdx') {
      const pre = await preprocessMdx(markdown);
      markdown = pre.transformed;
      componentNames = pre.componentNames;
    }

    const processor = await getProcessor();
    const result = await processor.render(markdown);

    return new Response(
      JSON.stringify({
        html: result.code,
        frontmatter: fm,
        componentNames,
        ext,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg, stack: err instanceof Error ? err.stack : undefined }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
