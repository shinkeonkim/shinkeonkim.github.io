import { describe, expect, it } from 'vitest';
import remarkQuiz from './remark-quiz.mjs';

interface MdNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MdNode[];
}

function tree(node: MdNode): MdNode {
  return { type: 'root', children: [node] };
}

const validData = {
  items: [
    {
      type: 'multiple-choice',
      question: 'What is 1+1?',
      options: ['1', '2'],
      answer: 1,
    },
  ],
};

describe('remarkQuiz', () => {
  it('renders placeholder with quiz JSON when data is valid', () => {
    const t = tree({ type: 'code', lang: 'quiz', value: JSON.stringify(validData) });
    remarkQuiz()(t as never);
    expect(t.children?.[0].type).toBe('html');
    expect(t.children?.[0].value).toContain('quiz-placeholder');
    expect(t.children?.[0].value).toContain('data-quiz-source');
  });

  it('renders error when JSON is malformed', () => {
    const t = tree({ type: 'code', lang: 'quiz', value: 'not json' });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('quiz-error');
    expect(t.children?.[0].value).toContain('JSON parse error');
  });

  it('renders error when items is missing', () => {
    const t = tree({ type: 'code', lang: 'quiz', value: JSON.stringify({}) });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('items must be a non-empty array');
  });

  it('renders error when items is empty', () => {
    const t = tree({ type: 'code', lang: 'quiz', value: JSON.stringify({ items: [] }) });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('non-empty array');
  });

  it('renders error when item type is unknown', () => {
    const t = tree({
      type: 'code',
      lang: 'quiz',
      value: JSON.stringify({ items: [{ type: 'unknown', question: 'x' }] }),
    });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('unknown type');
  });

  it('renders error when item is missing question', () => {
    const t = tree({
      type: 'code',
      lang: 'quiz',
      value: JSON.stringify({ items: [{ type: 'true-false' }] }),
    });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('missing question');
  });

  it('renders error when multiple-choice has too few options', () => {
    const t = tree({
      type: 'code',
      lang: 'quiz',
      value: JSON.stringify({
        items: [{ type: 'multiple-choice', question: 'x', options: ['only'] }],
      }),
    });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('at least 2 entries');
  });

  it('renders error when items are not objects', () => {
    const t = tree({
      type: 'code',
      lang: 'quiz',
      value: JSON.stringify({ items: [null] }),
    });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('not an object');
  });

  it('accepts short-answer and true-false types', () => {
    const data = {
      items: [
        { type: 'short-answer', question: 'q1' },
        { type: 'true-false', question: 'q2' },
      ],
    };
    const t = tree({ type: 'code', lang: 'quiz', value: JSON.stringify(data) });
    remarkQuiz()(t as never);
    expect(t.children?.[0].value).toContain('quiz-placeholder');
  });

  it('leaves non-quiz code untouched', () => {
    const t = tree({ type: 'code', lang: 'python', value: 'x=1' });
    remarkQuiz()(t as never);
    expect(t.children?.[0].type).toBe('code');
  });
});
