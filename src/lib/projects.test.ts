import { describe, expect, it } from 'vitest';
import { formatPeriod, parseGitHubUrl } from './projects';

describe('parseGitHubUrl', () => {
  it('extracts owner + repo from https URL', () => {
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World')).toEqual({
      owner: 'octocat',
      repo: 'Hello-World',
    });
  });

  it('strips .git suffix', () => {
    expect(parseGitHubUrl('https://github.com/octocat/Hello-World.git')).toEqual({
      owner: 'octocat',
      repo: 'Hello-World',
    });
  });

  it('returns null for non-github URL', () => {
    expect(parseGitHubUrl('https://gitlab.com/x/y')).toBeNull();
  });

  it('returns null for malformed URL', () => {
    expect(parseGitHubUrl('not a url')).toBeNull();
  });

  it('returns null for github URL without repo', () => {
    expect(parseGitHubUrl('https://github.com/octocat')).toBeNull();
  });
});

describe('formatPeriod', () => {
  it('shows "진행 중" without end date', () => {
    const result = formatPeriod(new Date('2024-01-15'), undefined, 'ko-KR');
    expect(result).toContain('진행 중');
  });

  it('shows single label when start and end same month', () => {
    const result = formatPeriod(new Date('2024-01-15'), new Date('2024-01-30'), 'ko-KR');
    expect(result).not.toContain('~');
  });

  it('shows range when different months', () => {
    const result = formatPeriod(new Date('2024-01-15'), new Date('2024-06-30'), 'ko-KR');
    expect(result).toContain('~');
  });
});
