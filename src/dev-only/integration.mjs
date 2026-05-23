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
      },
    },
  };
}
