// @ts-check
import { defineConfig } from 'astro/config';
import AutoImport from 'astro-auto-import';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { EnumChangefreq } from 'sitemap';
import tailwindcss from '@tailwindcss/vite';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import remarkWikilink from './src/plugins/remark-wikilink.mjs';
import remarkMermaid from './src/plugins/remark-mermaid.mjs';
import remarkMathLenient from './src/plugins/remark-math-lenient.mjs';
import remarkUrlPreview from './src/plugins/remark-url-preview.mjs';
import remarkAnimation from './src/plugins/remark-animation.mjs';
import rehypeLazyImages from './src/plugins/rehype-lazy-images.mjs';
import devEditor from './src/dev-only/integration.mjs';
import modulepreload from './src/shared/lib/modulepreload-integration.mjs';
import mdxBodyEscapeIntegration from './src/plugins/integration-mdx-body-escape.mjs';
import { buildImageMap } from './src/shared/lib/seo/sitemap-images.mjs';
import { buildLastmodMap, resolveLastmod } from './src/shared/lib/seo/sitemap-lastmod.mjs';

const SITE_URL = 'https://shinkeonkim.com';
// Pre-build URL → cover/thumbnail and URL → lastmod maps once, at
// config-load time. sitemap serialize() is synchronous, so we resolve
// these up-front and look them up per item.
const [imageMap, lastmodMap] = await Promise.all([
  buildImageMap(SITE_URL),
  buildLastmodMap(SITE_URL),
]);

// Tag slugs that are registered aliases (in src/data/tags.ts TAG_METADATA).
// The [tag] route emits them as alias pages whose <link rel="canonical">
// points to the registered canonical, so they should NOT appear in the
// sitemap (only the canonical URL should).
//
// Mirror src/data/tags.ts when adding/removing TAG_METADATA aliases.
const TAG_REGISTERED_ALIAS_SLUGS = new Set([
  'js',
  'JavaScript',
  'JS',
  'PS',
  '문제풀이',
  'async-await',
  'networking',
  'postgres',
  'PostgreSQL',
  'Python',
]);

// True when `page` looks like an alias tag URL we don't want in the sitemap:
// - any /tags/<slug>/ whose slug still contains a space (legacy slug kept
//   alive for backward compat by [tag].astro's legacy alias emission)
// - any /tags/<slug>/ matching a registered alias (lowercase or raw-case)
/** @param {string} page */
function isTagAliasUrl(page) {
  let pathname;
  try {
    pathname = new URL(page).pathname;
  } catch {
    return false;
  }
  const m = pathname.match(/^\/tags\/([^/]+)\/$/);
  if (!m) return false;
  let slug;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    return false;
  }
  if (slug.includes(' ')) return true;
  return TAG_REGISTERED_ALIAS_SLUGS.has(slug);
}

// URLs to exclude from the production sitemap.
// - `/_editor`, `/_studio`, `/__`, dev-only injected routes (the
//   integration already guards them on `command !== 'dev'`, but this is
//   defense in depth).
// - `/dev/`, the live component showcase page (src/pages/dev/) is
//   intended for in-progress visual review of internal building blocks,
//   not for public search indexing.
// - `/og/`, programmatically generated OG images, not browsable pages.
// - Tag alias URLs (see isTagAliasUrl above).
/** @param {string} page */
function isExcludedFromSitemap(page) {
  return (
    page.includes('/_editor') ||
    page.includes('/_studio') ||
    page.includes('/__') ||
    page.includes('/dev/') ||
    page.includes('/og/') ||
    isTagAliasUrl(page)
  );
}

// Pagination URL segment: trailing `/{integer}/` (e.g. `/posts/2/`).
const PAGINATION_RE = /\/\d+\/$/;

export default defineConfig({
  site: SITE_URL,
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
    responsiveStyles: true,
    layout: 'constrained',
  },
  integrations: [
    // MUST run before mdx(): rewrites body-text `<`/`{` hazards so the MDX
    // compiler does not see them as JSX. Source files on disk stay intact.
    mdxBodyEscapeIntegration(),
    // MUST be listed BEFORE mdx(), astro-auto-import injects import
    // statements into MDX files at compile time so writers can use
    // <CodeWithOutput .../> without a per-file import line.
    AutoImport({
      imports: [
        './src/features/code-with-output/ui/CodeWithOutput.astro',
        './src/widgets/chart-js/ChartJs.tsx',
      ],
    }),
    mdx(),
    react(),
    sitemap({
      filter: (page) => !isExcludedFromSitemap(page),
      serialize(item) {
        const url = new URL(item.url);
        const path = url.pathname;
        const isPaginated = PAGINATION_RE.test(path);

        // Priority + changefreq, ordered most-specific → most-generic.
        // Pagination URLs (e.g. /posts/2/) inherit their parent list
        // page's classification, they're navigation, not content.
        if (path === '/') {
          item.changefreq = EnumChangefreq.DAILY;
          item.priority = 1.0;
        } else if (path === '/posts/' || (path.startsWith('/posts/') && isPaginated)) {
          item.changefreq = EnumChangefreq.DAILY;
          item.priority = 0.9;
        } else if (
          path === '/posts/categories/' ||
          path === '/posts/series/'
        ) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.75;
        } else if (
          path.startsWith('/posts/category/') ||
          path.startsWith('/posts/series/')
        ) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.7;
        } else if (path.startsWith('/posts/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.8;
        } else if (path === '/wiki/' || (path.startsWith('/wiki/') && isPaginated && !path.startsWith('/wiki/category/'))) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.85;
        } else if (path === '/wiki/categories/') {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.7;
        } else if (path.startsWith('/wiki/category/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.65;
        } else if (path.startsWith('/wiki/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.7;
        } else if (path === '/notes/' || path.startsWith('/notes/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.6;
        } else if (path === '/tags/') {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.5;
        } else if (path.startsWith('/tags/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.5;
        } else if (path === '/animations/' || path.startsWith('/animations/')) {
          item.changefreq = EnumChangefreq.MONTHLY;
          item.priority = 0.6;
        } else if (path === '/sources/' || path.startsWith('/sources/')) {
          item.changefreq = EnumChangefreq.MONTHLY;
          item.priority = 0.5;
        } else if (path === '/about/') {
          item.changefreq = EnumChangefreq.MONTHLY;
          item.priority = 0.6;
        } else if (path === '/graph/') {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.5;
        } else {
          item.changefreq = EnumChangefreq.MONTHLY;
          item.priority = 0.5;
        }

        const lastmod = resolveLastmod(lastmodMap, item.url);
        if (lastmod) {
          /** @type {any} */ (item).lastmod = lastmod;
        }

        const img = imageMap.get(item.url);
        if (img) {
          /** @type {any} */ (item).img = [img];
        }
        return item;
      },
    }),
    devEditor(),
    modulepreload(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['three'],
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
              if (/[\\/]react[\\/]/.test(id)) return 'vendor-react';
              if (id.includes('three') || id.includes('react-force-graph-3d')) return 'vendor-three';
              if (id.includes('/d3-')) return 'vendor-d3';
              if (id.includes('katex')) return 'vendor-katex';
            }
            return undefined;
          },
        },
      },
    },
  },
  markdown: {
    remarkPlugins: [
      remarkAnimation,
      remarkMermaid,
      remarkAlert,
      remarkWikilink,
      remarkMathLenient,
      remarkMath,
      remarkUrlPreview,
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['heading-anchor'],
            ariaLabel: 'permalink',
            tabindex: -1,
          },
          // Empty content: the visible "#" comes from a CSS ::after pseudo-
          // element on .heading-anchor (see global.css). A bare text node here
          // would be concatenated into the heading's own text node, so
          // Astro's getHeadings() returns e.g. "제목#" - which leaks into
          // the TOC, Pagefind search index, RSS, and OG image titles.
          content: () => [],
        },
      ],
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener', 'noreferrer'],
          protocols: ['http', 'https'],
        },
      ],
      [rehypeKatex, { output: 'html', strict: 'ignore' }],
      rehypeLazyImages,
    ],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'one-dark-pro',
      },
      wrap: true,
    },
  },
});
