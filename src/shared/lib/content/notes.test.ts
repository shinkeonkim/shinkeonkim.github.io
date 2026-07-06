import { describe, expect, it } from 'vitest';
import { noteColorClass, notePreview, noteTitle } from './notes';

describe('notePreview', () => {
  it('returns empty string for missing body', () => {
    expect(notePreview(undefined)).toBe('');
    expect(notePreview('')).toBe('');
  });

  it('picks the first non-empty line', () => {
    expect(notePreview('\n\nfirst content\nsecond')).toBe('first content');
  });

  it('resolves wikilinks with alias', () => {
    expect(notePreview('see [[python|파이썬]] docs')).toBe('see 파이썬 docs');
  });

  it('resolves wikilinks without alias', () => {
    expect(notePreview('see [[python]] docs')).toBe('see python docs');
  });

  it('resolves wikilinks with heading anchors', () => {
    expect(notePreview('see [[python#gil|GIL]] docs')).toBe('see GIL docs');
  });

  it('truncates lines longer than maxLen with ellipsis', () => {
    const long = 'a'.repeat(200);
    const preview = notePreview(long, 20);
    expect(preview).toHaveLength(20);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('honors the default maxLen of 80', () => {
    const long = 'a'.repeat(200);
    expect(notePreview(long)).toHaveLength(80);
  });
});

describe('noteTitle', () => {
  it('strips trailing punctuation and trims', () => {
    expect(noteTitle('This is a note!!!')).toBe('This is a note');
    expect(noteTitle('mixed period end.')).toBe('mixed period end');
  });

  it('handles undefined body', () => {
    expect(noteTitle(undefined)).toBe('');
  });

  it('returns empty for whitespace-only body', () => {
    expect(noteTitle('   ')).toBe('');
  });
});

describe('noteColorClass', () => {
  it('returns a class from the fixed palette', () => {
    const result = noteColorClass('abc');
    expect(['note-card-yellow', 'note-card-green', 'note-card-blue', 'note-card-pink']).toContain(
      result,
    );
  });

  it('produces deterministic output for the same slug', () => {
    expect(noteColorClass('same-slug')).toBe(noteColorClass('same-slug'));
  });

  it('handles empty slug', () => {
    const result = noteColorClass('');
    expect(result).toMatch(/^note-card-/);
  });

  it('distributes across the palette', () => {
    const slugs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const classes = new Set(slugs.map(noteColorClass));
    expect(classes.size).toBeGreaterThan(1);
  });
});
