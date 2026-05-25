// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { EnumChangefreq } from 'sitemap';
import pagefind from 'astro-pagefind';
import tailwindcss from '@tailwindcss/vite';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkWikilink from './src/plugins/remark-wikilink.mjs';
import remarkMermaid from './src/plugins/remark-mermaid.mjs';
import remarkMathLenient from './src/plugins/remark-math-lenient.mjs';
import remarkUrlPreview from './src/plugins/remark-url-preview.mjs';
import remarkAnimation from './src/plugins/remark-animation.mjs';
import devEditor from './src/dev-only/integration.mjs';
import modulepreload from './src/lib/modulepreload-integration.mjs';
import { buildImageMap } from './src/lib/sitemap-images.mjs';

const SITE_URL = 'https://shinkeonkim.com';
// Pre-build the URL → cover/thumbnail map once, at config-load time.
// sitemap serialize() is synchronous, so we resolve the map up-front.
const imageMap = await buildImageMap(SITE_URL);

export default defineConfig({
  site: SITE_URL,
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/_editor') && !page.includes('/__'),
      serialize(item) {
        const url = new URL(item.url);
        const path = url.pathname;
        if (path === '/') {
          item.changefreq = EnumChangefreq.DAILY;
          item.priority = 1.0;
        } else if (
          path.startsWith('/posts/') &&
          !path.startsWith('/posts/category/') &&
          !path.startsWith('/posts/series/') &&
          path !== '/posts/'
        ) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.8;
        } else if (path === '/posts/' || path.startsWith('/posts/')) {
          item.changefreq = EnumChangefreq.DAILY;
          item.priority = 0.7;
        } else if (path.startsWith('/projects/')) {
          item.changefreq = EnumChangefreq.MONTHLY;
          item.priority = 0.8;
        } else if (path.startsWith('/wiki/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.7;
        } else if (path.startsWith('/notes/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.6;
        } else if (path.startsWith('/tags/')) {
          item.changefreq = EnumChangefreq.WEEKLY;
          item.priority = 0.5;
        } else {
          item.changefreq = EnumChangefreq.MONTHLY;
          item.priority = 0.5;
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
          content: { type: 'text', value: '#' },
        },
      ],
      [rehypeKatex, { output: 'html', strict: 'ignore' }],
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
