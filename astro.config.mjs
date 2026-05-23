// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import tailwindcss from '@tailwindcss/vite';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkWikilink from './src/plugins/remark-wikilink.mjs';
import remarkMermaid from './src/plugins/remark-mermaid.mjs';
import devEditor from './src/dev-only/integration.mjs';

export default defineConfig({
  site: 'https://shinkeonkim.com',
  integrations: [
    mdx(),
    react(),
    sitemap(),
    pagefind(),
    devEditor(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['three'],
    },
  },
  markdown: {
    remarkPlugins: [remarkMermaid, remarkAlert, remarkWikilink],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'one-dark-pro',
      },
      wrap: true,
    },
  },
});
