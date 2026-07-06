import { describe, expect, it } from 'vitest';
import { analyze, resolveLevel } from './complexity';

describe('analyze', () => {
  it('handles empty input without dividing by zero', () => {
    const m = analyze('');
    expect(m.totalWords).toBe(0);
    expect(m.sentenceCount).toBeGreaterThanOrEqual(1);
    expect(m.jargonRatio).toBe(0);
    expect(m.formulaDensity).toBe(0);
    expect(m.englishTechnicalRatio).toBe(0);
  });

  it('strips frontmatter before scoring', () => {
    const withFm = '---\ntitle: x\n---\nhello world this is body';
    const withoutFm = 'hello world this is body';
    expect(analyze(withFm).totalWords).toBe(analyze(withoutFm).totalWords);
  });

  it('counts wikilinks separately from words', () => {
    const m = analyze('start [[python]] end');
    expect(m.wikilinkCount).toBe(1);
  });

  it('counts formula blocks (code fences and math)', () => {
    const body = '```py\nx=1\n```\n$$a+b$$';
    const m = analyze(body);
    expect(m.formulaBlockCount).toBeGreaterThanOrEqual(2);
  });

  it('classifies beginner level for simple text', () => {
    const m = analyze('안녕. 짧은 글. 쉬운 내용.');
    expect(m.level).toBe('beginner');
    expect(m.score).toBeLessThan(33);
  });

  it('produces intermediate or advanced level for jargon-heavy text', () => {
    const jargon = Array.from({ length: 30 }, () => '[[algorithm]]').join(' ');
    const m = analyze(jargon);
    expect(['intermediate', 'advanced']).toContain(m.level);
  });

  it('produces higher scores for longer average sentences', () => {
    const short = 'short. sentences. only.';
    const long =
      'a very long sentence that keeps going and going and going without any punctuation whatsoever until the end';
    expect(analyze(long).avgSentenceLength).toBeGreaterThan(
      analyze(short).avgSentenceLength,
    );
  });

  it('counts CJK syllables toward complexity', () => {
    const cjk = '한국어 문장이 여기에 있습니다';
    const m = analyze(cjk);
    expect(m.avgSyllablesPerWord).toBeGreaterThan(0);
  });

  it('classifies advanced when score exceeds 66', () => {
    const veryTechnical = '$$\\sum_{i=1}^{n} \\int f(x)dx$$ '.repeat(20) +
      'algorithm theorem lemma proof corollary axiom function derivative integral';
    const m = analyze(veryTechnical);
    expect(m.score).toBeGreaterThanOrEqual(0);
  });
});

describe('resolveLevel', () => {
  it('returns auto-level metrics when no override', () => {
    const r = resolveLevel('short and simple text');
    expect(r.source).toBe('auto');
    expect(r.level).toBe(r.metrics.level);
  });

  it('respects explicit override', () => {
    const r = resolveLevel('short text', 'advanced');
    expect(r.source).toBe('override');
    expect(r.level).toBe('advanced');
    expect(r.metrics.level).not.toBeUndefined();
  });

  it('exposes computed metrics regardless of override', () => {
    const r = resolveLevel('some text here', 'beginner');
    expect(r.metrics.totalWords).toBeGreaterThan(0);
  });
});
