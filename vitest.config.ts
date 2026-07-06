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
      include: [
        'src/shared/lib/**/*.{ts,mjs}',
        'src/plugins/**/*.mjs',
        'src/features/*/lib/**/*.ts',
        'src/entities/animation/engine/**/*.ts',
        'src/dev-only/shared/api-utils.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        // Files with heavy external side effects (satori/resvg font loading, react-dom hydration,
        // dynamic CDN imports, IntersectionObserver-driven lazy render) are integration-tested
        // via astro:build and playwright, not vitest unit tests.
        'src/shared/lib/seo/og-image.ts',
        'src/features/quiz/lib/hydrate-quizzes.ts',
        'src/features/mermaid/lib/mermaid-render.ts',
        'src/features/mermaid/lib/mermaid-zoom.ts',
        'src/features/mermaid/lib/setup-mermaid.ts',
        // DOM-heavy filter modules that orchestrate URL state + full page filter UI.
        // Their pure helpers are extracted and tested; the orchestration functions
        // (setupWikiFilter, setupAnimFilter, setupSearchModal, setupGlossary, setupCourseProgress)
        // are covered by playwright integration tests.
        'src/features/wiki-filter/lib/wiki-filter.ts',
        'src/features/animation-filter/lib/animation-filter.ts',
        'src/features/search/lib/search-modal.ts',
        'src/features/glossary/lib/glossary-filter.ts',
        'src/features/courses/lib/course-progress.ts',
        // Content graph / taxonomy / related / build-glossary depend on live astro:content
        // collection data; they are covered by the build (fails if graph edges are wrong)
        // rather than unit tests over synthetic collection stubs.
        'src/shared/lib/content/content-graph.ts',
        'src/shared/lib/content/taxonomy.ts',
        'src/shared/lib/content/related.ts',
        'src/features/glossary/lib/build-glossary.ts',
        // Pure re-export barrels with no logic to cover.
        'src/entities/animation/engine/schema/index.ts',
      ],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 85,
      },
    },
  },
});
