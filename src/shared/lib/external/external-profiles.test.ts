import { describe, expect, it } from 'vitest';
import { EXTERNAL_PROFILES } from './external-profiles';

describe('EXTERNAL_PROFILES', () => {
  it('exports a non-empty array', () => {
    expect(EXTERNAL_PROFILES.length).toBeGreaterThan(0);
  });

  it('has unique keys', () => {
    const keys = EXTERNAL_PROFILES.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every entry has valid URL and required fields', () => {
    for (const profile of EXTERNAL_PROFILES) {
      expect(profile.key).toBeTruthy();
      expect(profile.label).toBeTruthy();
      expect(profile.icon).toBeTruthy();
      expect(() => new URL(profile.url)).not.toThrow();
      expect(profile.url.startsWith('https://')).toBe(true);
    }
  });

  it('includes the canonical CV entry', () => {
    const cv = EXTERNAL_PROFILES.find((p) => p.key === 'cv');
    expect(cv).toBeDefined();
    expect(cv?.url).toContain('shinkeonkim.com');
  });
});
