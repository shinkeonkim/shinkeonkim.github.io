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
import remarkWikilink from './src/plugins/remark-wikilink.mjs';
import remarkMermaid from './src/plugins/remark-mermaid.mjs';
import remarkMathLenient from './src/plugins/remark-math-lenient.mjs';
import remarkUrlPreview from './src/plugins/remark-url-preview.mjs';
import devEditor from './src/dev-only/integration.mjs';

export default defineConfig({
  site: 'https://shinkeonkim.com',
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
        return item;
      },
    }),
    pagefind(),
    devEditor(),
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
              if (id.includes('three') || id.includes('react-force-graph-3d')) return 'vendor-three';
              if (id.includes('/d3-')) return 'vendor-d3';
              if (id.includes('katex')) return 'vendor-katex';
              if (id.includes('react-dom')) return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
  },
  markdown: {
    remarkPlugins: [
      remarkMermaid,
      remarkAlert,
      remarkWikilink,
      remarkMathLenient,
      remarkMath,
      remarkUrlPreview,
    ],
    rehypePlugins: [[rehypeKatex, { output: 'html', strict: 'ignore' }]],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'one-dark-pro',
      },
      wrap: true,
    },
  },
});
