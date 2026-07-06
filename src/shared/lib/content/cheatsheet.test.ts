import { describe, expect, it } from 'vitest';
import { buildCheatsheet } from './cheatsheet';

describe('buildCheatsheet', () => {
  it('returns empty result for empty body', () => {
    const r = buildCheatsheet('');
    expect(r.source).toBe('empty');
    expect(r.sections).toEqual([]);
  });

  it('extracts fenced cheatsheet blocks when present', () => {
    const body = 'preamble\n```cheatsheet\n## Section A\n- item one\n- item two\n```\n';
    const r = buildCheatsheet(body);
    expect(r.source).toBe('fence');
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0].title).toBe('Section A');
    expect(r.sections[0].items).toEqual(['item one', 'item two']);
  });

  it('handles fence bullets without a heading', () => {
    const body = '```cheatsheet\n- bullet without heading\n```';
    const r = buildCheatsheet(body);
    expect(r.source).toBe('fence');
    expect(r.sections[0].title).toBeNull();
    expect(r.sections[0].items).toContain('bullet without heading');
  });

  it('trims items over max length with ellipsis', () => {
    const long = 'a'.repeat(500);
    const body = `\`\`\`cheatsheet\n- ${long}\n\`\`\``;
    const r = buildCheatsheet(body);
    expect(r.sections[0].items[0].endsWith('…')).toBe(true);
    expect(r.sections[0].items[0].length).toBeLessThanOrEqual(200);
  });

  it('caps sections at MAX_SECTIONS from fence', () => {
    const many = Array.from({ length: 30 }, (_, i) => `## Sec ${i}\n- item ${i}`).join('\n');
    const body = `\`\`\`cheatsheet\n${many}\n\`\`\``;
    const r = buildCheatsheet(body);
    expect(r.sections.length).toBeLessThanOrEqual(15);
  });

  it('falls back to heuristic sections when no fence present', () => {
    const body = [
      '## Introduction',
      'This is the **key idea** we want to convey.',
      '',
      '- also this bullet',
      '',
      '## Details',
      'Some details with a sentence.',
      '- detail bullet',
    ].join('\n');
    const r = buildCheatsheet(body);
    expect(r.source).toBe('heuristic');
    expect(r.sections.length).toBeGreaterThan(0);
  });

  it('strips inline markup (bold, italic, code) from items', () => {
    const body = '```cheatsheet\n## t\n- **bold** and _italic_ and `code`\n```';
    const r = buildCheatsheet(body);
    expect(r.sections[0].items[0]).toBe('bold and italic and code');
  });

  it('strips wikilink and markdown link syntax', () => {
    const body = '```cheatsheet\n- see [[python|파이썬]] and [our post](/x)\n```';
    const r = buildCheatsheet(body);
    expect(r.sections[0].items[0]).toContain('파이썬');
    expect(r.sections[0].items[0]).toContain('our post');
  });

  it('strips image syntax from items', () => {
    const body = '```cheatsheet\n- with image ![alt](/img.png)\n```';
    const r = buildCheatsheet(body);
    expect(r.sections[0].items[0]).toBe('with image');
  });

  it('returns empty when no fence and no viable heuristic content', () => {
    expect(buildCheatsheet('plain text with no headings or bullets').source).toBe('empty');
  });

  it('ignores fenced code inside heuristic body', () => {
    const body = '## t\n```py\nnot part of cheatsheet\n```\n\nsentence.\n\n- bullet';
    const r = buildCheatsheet(body);
    expect(r.source).toBe('heuristic');
  });
});
