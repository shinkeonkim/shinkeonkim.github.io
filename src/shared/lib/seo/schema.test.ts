import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  breadcrumbSchema,
  collectionPageSchema,
  personSchema,
  websiteSchema,
} from './schema';
import { SITE_URL } from '@/shared/config';

describe('absoluteUrl', () => {
  it('joins site URL with absolute pathname', () => {
    expect(absoluteUrl('/posts/abc/')).toBe(`${SITE_URL}/posts/abc/`);
  });

  it('handles root pathname', () => {
    expect(absoluteUrl('/')).toBe(`${SITE_URL}/`);
  });
});

describe('websiteSchema', () => {
  it('has @type WebSite without SearchAction', () => {
    const s = websiteSchema();
    expect(s['@type']).toBe('WebSite');
    expect(s['@id']).toBe(`${SITE_URL}/#website`);
    expect(s.potentialAction).toBeUndefined();
  });

  it('publisher references Person @id (graph link)', () => {
    const s = websiteSchema();
    expect(s.publisher).toEqual({ '@id': `${SITE_URL}/#person` });
  });
});

describe('personSchema', () => {
  it('has @type Person with sameAs links and knowsAbout', () => {
    const s = personSchema();
    expect(s['@type']).toBe('Person');
    expect(s['@id']).toBe(`${SITE_URL}/#person`);
    expect(Array.isArray(s.sameAs)).toBe(true);
    expect((s.sameAs as string[]).every((u) => u.startsWith('http'))).toBe(true);
    expect(Array.isArray(s.knowsAbout)).toBe(true);
  });
});

describe('breadcrumbSchema', () => {
  it('produces 1-indexed ListItems', () => {
    const s = breadcrumbSchema([
      { name: '글', url: `${SITE_URL}/posts/` },
      { name: '제목', url: `${SITE_URL}/posts/x/` },
    ]);
    const items = s.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[0].name).toBe('글');
    expect(items[1].position).toBe(2);
    expect(items[1].item).toBe(`${SITE_URL}/posts/x/`);
  });
});

describe('collectionPageSchema', () => {
  it('omits ItemList when itemCount is undefined', () => {
    const s = collectionPageSchema({ name: '태그', description: 'd', url: `${SITE_URL}/tags/` });
    expect(s['@type']).toBe('CollectionPage');
    expect(s.mainEntity).toBeUndefined();
  });

  it('includes ItemList numberOfItems when provided', () => {
    const s = collectionPageSchema({
      name: '태그',
      description: 'd',
      url: `${SITE_URL}/tags/`,
      itemCount: 12,
    });
    expect(s.mainEntity).toEqual({ '@type': 'ItemList', numberOfItems: 12 });
  });
});
