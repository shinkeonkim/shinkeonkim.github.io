import { describe, expect, it, vi } from 'vitest';
import mdxBodyEscapeIntegration from './integration-mdx-body-escape.mjs';

describe('mdxBodyEscapeIntegration', () => {
  it('returns an Astro integration with the expected name', () => {
    const integration = mdxBodyEscapeIntegration();
    expect(integration.name).toBe('mdx-body-escape');
    expect(integration.hooks).toBeDefined();
    expect(typeof integration.hooks['astro:config:setup']).toBe('function');
  });

  it('registers the vite plugin via updateConfig on setup', () => {
    const integration = mdxBodyEscapeIntegration();
    const updateConfig = vi.fn();
    const setup = integration.hooks['astro:config:setup'];
    if (typeof setup !== 'function') throw new Error('setup hook missing');
    setup({ updateConfig } as never);
    expect(updateConfig).toHaveBeenCalledTimes(1);
    const arg = updateConfig.mock.calls[0][0];
    expect(arg.vite.plugins).toHaveLength(1);
    expect(arg.vite.plugins[0].name).toBe('mdx-body-escape');
  });
});
