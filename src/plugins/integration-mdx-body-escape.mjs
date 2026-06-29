/**
 * Astro integration wrapper around the vite-mdx-body-escape vite plugin.
 *
 * The vite plugin version (./vite-mdx-body-escape.mjs) was registered under
 * `vite.plugins` and observed to never be invoked for .mdx files, because
 * @astrojs/mdx routes content collection .mdx files through its own loader
 * that bypasses the regular vite transform graph. Wrapping the same plugin
 * inside an Astro integration lets us register it via `updateConfig` at the
 * astro:config:setup hook, which Astro then merges into the canonical vite
 * config used for mdx compilation.
 *
 * The work is delegated to the existing vite plugin; this file only handles
 * the Astro integration lifecycle.
 */
import mdxBodyEscape from './vite-mdx-body-escape.mjs';

/**
 * @returns {import('astro').AstroIntegration}
 */
export default function mdxBodyEscapeIntegration() {
  return {
    name: 'mdx-body-escape',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [mdxBodyEscape()],
          },
        });
      },
    },
  };
}
