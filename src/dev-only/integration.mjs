import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

export default function devEditor() {
  return {
    name: 'dev-editor',
    hooks: {
      'astro:config:setup': ({ injectRoute, command, logger }) => {
        if (command !== 'dev') return;
        logger.info('dev-editor: injecting routes (only available in dev)');
        injectRoute({
          pattern: '/_editor',
          entrypoint: path.join(here, 'editor.astro'),
        });
        injectRoute({
          pattern: '/_studio',
          entrypoint: path.join(here, 'studio.astro'),
        });
        injectRoute({
          pattern: '/_studio/api/animations',
          entrypoint: path.join(here, 'api-animations.ts'),
        });
        injectRoute({
          pattern: '/_studio/api/animations/[id]',
          entrypoint: path.join(here, 'api-animation.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/files',
          entrypoint: path.join(here, 'api-files.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/file',
          entrypoint: path.join(here, 'api-file.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/render',
          entrypoint: path.join(here, 'api-render.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/upload',
          entrypoint: path.join(here, 'api-upload.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/fetch',
          entrypoint: path.join(here, 'api-fetch.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/ops',
          entrypoint: path.join(here, 'api-file-ops.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/git',
          entrypoint: path.join(here, 'api-git.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/sources',
          entrypoint: path.join(here, 'api-sources.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/url-preview',
          entrypoint: path.join(here, 'api-url-preview.ts'),
        });
        injectRoute({
          pattern: '/_editor/api/grep',
          entrypoint: path.join(here, 'api-grep.ts'),
        });
      },
    },
  };
}
