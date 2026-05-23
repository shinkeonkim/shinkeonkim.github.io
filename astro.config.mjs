// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import tailwindcss from '@tailwindcss/vite';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkWikilink from './src/plugins/remark-wikilink.mjs';

export default defineConfig({
  site: 'https://shinkeonkim.com',
  integrations: [
    mdx(),
    react(),
    sitemap(),
    pagefind(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['three'],
    },
  },
  markdown: {
    remarkPlugins: [remarkAlert, remarkWikilink],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
