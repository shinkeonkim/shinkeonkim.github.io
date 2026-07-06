import { describe, expect, it, vi } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import { noteToFeedItem, postToFeedItem, renderBodyForFeed, wikiToFeedItem } from './feed';

vi.mock('@astrojs/markdown-remark', () => ({
  createMarkdownProcessor: vi.fn(async () => ({
    render: async (input: string) => ({ code: `<p>${input}</p>` }),
  })),
}));

describe('renderBodyForFeed', () => {
  it('returns empty string for empty body', async () => {
    expect(await renderBodyForFeed('')).toBe('');
  });

  it('strips MDX import statements', async () => {
    const out = await renderBodyForFeed("import x from 'y';\nreal content");
    expect(out).toContain('real content');
    expect(out).not.toContain('import');
  });

  it('replaces self-closing JSX components with placeholder', async () => {
    const out = await renderBodyForFeed('start <Component prop="x" /> end');
    expect(out).toContain('mdx-component');
    expect(out).not.toContain('<Component');
  });

  it('replaces open+close JSX with placeholder preserving inner text', async () => {
    const out = await renderBodyForFeed('<Wrapper>inner text</Wrapper>');
    expect(out).toContain('mdx-component: Wrapper');
    expect(out).toContain('inner text');
  });

  it('absolutizes href="/x" to full URL', async () => {
    const out = await renderBodyForFeed('<a href="/posts/x/">link</a>');
    expect(out).not.toContain('href="/posts/x/"');
    expect(out).toMatch(/href="https?:\/\/[^"]+\/posts\/x\/"/);
  });

  it('absolutizes src=\'/x\' to full URL', async () => {
    const out = await renderBodyForFeed("<img src='/img.png'>");
    expect(out).toMatch(/src='https?:\/\/[^']+\/img\.png'/);
  });

  it('leaves protocol-relative URLs alone', async () => {
    const out = await renderBodyForFeed('<a href="//cdn.example.com/x">');
    expect(out).toContain('//cdn.example.com/x');
  });

  it('returns empty string when render throws', async () => {
    vi.resetModules();
    vi.doMock('@astrojs/markdown-remark', () => ({
      createMarkdownProcessor: vi.fn(async () => ({
        render: async () => {
          throw new Error('render failed');
        },
      })),
    }));
    const { renderBodyForFeed: fn } = await import('./feed');
    const out = await fn('body');
    expect(out).toBe('');
    vi.doUnmock('@astrojs/markdown-remark');
  });
});

function makePost(overrides: Partial<CollectionEntry<'posts'>['data']> = {}, body = 'x'): CollectionEntry<'posts'> {
  return {
    id: 'my-post',
    collection: 'posts',
    data: {
      title: 'Title',
      description: 'description',
      date: new Date('2024-01-01'),
      tags: ['a'],
      ...overrides,
    },
    body,
  } as unknown as CollectionEntry<'posts'>;
}

function makeNote(body = 'first line'): CollectionEntry<'notes'> {
  return {
    id: 'my-note',
    collection: 'notes',
    data: { date: new Date('2024-01-15'), tags: ['n'] },
    body,
  } as unknown as CollectionEntry<'notes'>;
}

function makeWiki(overrides: Partial<CollectionEntry<'wiki'>['data']> = {}, body = ''): CollectionEntry<'wiki'> {
  return {
    id: 'w',
    collection: 'wiki',
    data: {
      title: 'Wiki Title',
      updated: new Date('2024-02-01'),
      tags: ['w'],
      ...overrides,
    },
    body,
  } as unknown as CollectionEntry<'wiki'>;
}

describe('postToFeedItem', () => {
  it('produces a base feed item without content when fullContent=false', async () => {
    const item = await postToFeedItem(makePost());
    expect(item.title).toBe('Title');
    expect(item.description).toBe('description');
    expect(item.categories).toEqual(['a']);
    expect(item.link).toContain('/posts/my-post/');
    expect(item.content).toBeUndefined();
  });

  it('includes rendered content when fullContent=true', async () => {
    const item = await postToFeedItem(makePost({}, 'body text'), { fullContent: true });
    expect(item.content).toBeDefined();
    expect(item.content).toContain('body text');
  });

  it('falls back to empty description when missing', async () => {
    const item = await postToFeedItem(makePost({ description: undefined }));
    expect(item.description).toBe('');
  });
});

describe('noteToFeedItem', () => {
  it('uses date ISO slice as title when body has no title', async () => {
    const item = noteToFeedItem(makeNote(''));
    expect(item.title).toBe('2024-01-15');
  });

  it('uses first line as title when body is present', async () => {
    const item = noteToFeedItem(makeNote('note title\nrest of body'));
    expect(item.title).toBe('note title');
  });

  it('provides a truncated description', async () => {
    const item = noteToFeedItem(makeNote('short'));
    expect(item.description).toContain('short');
  });
});

describe('wikiToFeedItem', () => {
  it('produces base feed item without content', async () => {
    const item = await wikiToFeedItem(makeWiki());
    expect(item.title).toBe('Wiki Title');
    expect(item.link).toContain('/wiki/w/');
    expect(item.content).toBeUndefined();
  });

  it('includes rendered content when fullContent=true', async () => {
    const item = await wikiToFeedItem(makeWiki({}, 'wiki body'), { fullContent: true });
    expect(item.content).toContain('wiki body');
  });

  it('uses epoch date when updated is missing', async () => {
    const item = await wikiToFeedItem(makeWiki({ updated: undefined }));
    expect(item.pubDate.getTime()).toBe(0);
  });
});
