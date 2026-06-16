// @ts-check
import { parse as parsePath, resolve as resolvePath } from 'node:path';
import { defineConfig } from 'astro/config';
import { parse as parseJs } from 'acorn';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { EnumChangefreq } from 'sitemap';
import pagefind from 'astro-pagefind';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
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
import modulepreload from './src/lib/modulepreload-integration.mjs';
import { buildImageMap } from './src/lib/sitemap-images.mjs';
import { buildLastmodMap, resolveLastmod } from './src/lib/sitemap-lastmod.mjs';

// MDX auto-imports, in-tree replacement for astro-auto-import.
// astro-auto-import@0.5.1 (latest) still injects via the deprecated
// `markdown.remarkPlugins` key, which causes Astro 6.4+ to emit a
// one-time `markdown.remarkPlugins ... are deprecated` warning at boot
// even when our own config uses `markdown.processor`. To remove the
// warning without making writers add `import CodeWithOutput from '...'`
// to every MDX file, we wire the same plugin directly onto our
// `unified()` processor. The plugin is intentionally identical in shape
// to astro-auto-import's (build an `mdxjsEsm` node once, then unshift
// it onto every non-`.md` file's mdast).
const MDX_AUTO_IMPORTS = [
  './src/components/CodeWithOutput.astro',
  './src/components/ChartJs.tsx',
];

/** @param {string} p */
function defaultImportName(p) {
  return parsePath(p).name.replaceAll(/[^\w\d]/g, '');
}

/** @param {string[]} paths */
function buildMdxImportsNode(paths) {
  const js = paths
    .map((p) => `import ${defaultImportName(p)} from ${JSON.stringify(resolvePath(p))};`)
    .join('\n');
  // `acorn.parse` with `sourceType: 'module'` already returns a Program
  // node (with `body`, `type: 'Program'`, `sourceType: 'module'`). MDX
  // wants this raw estree under `data.estree`. astro-auto-import added
  // a dead `body: []` here to placate its old MDX types and suppressed
  // the resulting duplicate-key warning - we don't need either.
  return {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: parseJs(js, { ecmaVersion: 'latest', sourceType: 'module' }),
    },
  };
}

const mdxAutoImportsNode = buildMdxImportsNode(MDX_AUTO_IMPORTS);

function remarkInjectMdxAutoImports() {
  /** @param {any} tree @param {any} vfile */
  return (tree, vfile) => {
    // Skip pure `.md` files. They are not JSX-aware and a stray
    // `mdxjsEsm` node would either be ignored or break the parser.
    if (!vfile.basename?.endsWith('.md')) {
      tree.children.unshift(mdxAutoImportsNode);
    }
  };
}

const SITE_URL = 'https://shinkeonkim.com';
// Pre-build URL → cover/thumbnail and URL → lastmod maps once, at
// config-load time. sitemap serialize() is synchronous, so we resolve
// these up-front and look them up per item.
const [imageMap, lastmodMap] = await Promise.all([
  buildImageMap(SITE_URL),
  buildLastmodMap(SITE_URL),
]);

// URLs to exclude from the production sitemap.
// - `/_editor`, `/_studio`, `/__`, dev-only injected routes (the
//   integration already guards them on `command !== 'dev'`, but this is
//   defense in depth).
// - `/dev/`, the live component showcase page (src/pages/dev/) is
//   intended for in-progress visual review of internal building blocks,
//   not for public search indexing.
// - `/og/`, programmatically generated OG images, not browsable pages.
/** @param {string} page */
function isExcludedFromSitemap(page) {
  return (
    page.includes('/_editor') ||
    page.includes('/_studio') ||
    page.includes('/__') ||
    page.includes('/dev/') ||
    page.includes('/og/')
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
        } else if (path === '/wiki/' || path.startsWith('/wiki/')) {
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
    pagefind(),
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
    // Astro 6.4+: pass the remark/rehype plugin chain via a `unified()`
    // processor instead of the deprecated `markdown.{remarkPlugins,
    // rehypePlugins,remarkRehype}` keys. `@astrojs/mdx@6.x` reads
    // `markdown.processor` and inherits the same plugins for .mdx files
    // automatically, so we don't need to duplicate the list in mdx().
    processor: unified({
      remarkPlugins: [
        remarkAnimation,
        remarkMermaid,
        remarkAlert,
        remarkWikilink,
        remarkMathLenient,
        remarkMath,
        remarkUrlPreview,
        // Last in the chain to match the original astro-auto-import
        // ordering (it was appended at the end by Astro's legacy
        // plugin coercion). The plugin only unshifts a single
        // `mdxjsEsm` node, no other plugin needs to see it.
        remarkInjectMdxAutoImports,
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
    }),
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'one-dark-pro',
      },
      wrap: true,
    },
  },
});
