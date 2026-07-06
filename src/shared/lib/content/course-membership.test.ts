import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

import { getCollection } from 'astro:content';

const getCollectionMock = vi.mocked(getCollection);

const sampleCourse = {
  id: 'python-basics',
  data: {
    title: 'Python Basics',
    chapters: [
      { collection: 'posts', id: 'intro', note: 'start here' },
      { collection: 'wiki', id: 'python' },
    ],
  },
};

describe('course-membership module', () => {
  beforeEach(() => {
    vi.resetModules();
    getCollectionMock.mockReset();
  });

  it('getCourseMemberships builds map from courses', async () => {
    getCollectionMock.mockResolvedValue([sampleCourse] as never);
    const mod = await import('./course-membership');
    const map = await mod.getCourseMemberships();
    expect(map.get('posts:intro')?.[0].courseId).toBe('python-basics');
    expect(map.get('posts:intro')?.[0].note).toBe('start here');
    expect(map.get('wiki:python')?.[0].chapterIndex).toBe(1);
    expect(map.get('wiki:python')?.[0].total).toBe(2);
  });

  it('getCourseMemberships caches after first call', async () => {
    getCollectionMock.mockResolvedValue([sampleCourse] as never);
    const mod = await import('./course-membership');
    await mod.getCourseMemberships();
    await mod.getCourseMemberships();
    expect(getCollectionMock).toHaveBeenCalledTimes(1);
  });

  it('getMembershipsFor returns list for known collection+slug', async () => {
    getCollectionMock.mockResolvedValue([sampleCourse] as never);
    const mod = await import('./course-membership');
    const memberships = await mod.getMembershipsFor('posts', 'intro');
    expect(memberships).toHaveLength(1);
    expect(memberships[0].courseTitle).toBe('Python Basics');
  });

  it('getMembershipsFor returns empty array for unknown slug', async () => {
    getCollectionMock.mockResolvedValue([sampleCourse] as never);
    const mod = await import('./course-membership');
    expect(await mod.getMembershipsFor('posts', 'missing')).toEqual([]);
  });

  it('accumulates memberships when a page is in multiple courses', async () => {
    const secondCourse = {
      id: 'advanced',
      data: {
        title: 'Advanced',
        chapters: [{ collection: 'posts', id: 'intro' }],
      },
    };
    getCollectionMock.mockResolvedValue([sampleCourse, secondCourse] as never);
    const mod = await import('./course-membership');
    const memberships = await mod.getMembershipsFor('posts', 'intro');
    expect(memberships).toHaveLength(2);
  });
});
