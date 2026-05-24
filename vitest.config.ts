import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'astro:content': fileURLToPath(new URL('./tests/stubs/astro-content.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,mjs}', 'tests/**/*.{test,spec}.{ts,mjs}'],
    exclude: ['node_modules/**', 'dist/**', '.astro/**', '_posts/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.ts', 'src/plugins/**/*.mjs', 'src/dev-only/api-utils.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
  },
});
