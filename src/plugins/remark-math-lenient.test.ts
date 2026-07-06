import { describe, expect, it } from 'vitest';
import remarkMathLenient from './remark-math-lenient.mjs';

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

function textTree(value: string): MdNode {
  return { type: 'root', children: [{ type: 'text', value }] };
}

describe('remarkMathLenient', () => {
  it('collapses display-inline $$ x $$ into inline $x$', () => {
    const t = textTree('$$ x + y $$');
    remarkMathLenient()(t as never);
    expect(t.children?.[0].value).toBe('$x + y$');
  });

  it('trims inner whitespace of lenient inline $ x $', () => {
    const t = textTree('start $ a + b $ end');
    remarkMathLenient()(t as never);
    expect(t.children?.[0].value).toBe('start $a + b$ end');
  });

  it('handles multiple matches', () => {
    const t = textTree('$$ p $$ then $ q $');
    remarkMathLenient()(t as never);
    expect(t.children?.[0].value).toContain('$p$');
    expect(t.children?.[0].value).toContain('$q$');
  });

  it('leaves text without $ unchanged', () => {
    const t = textTree('no math here');
    remarkMathLenient()(t as never);
    expect(t.children?.[0].value).toBe('no math here');
  });

  it('skips nodes without value', () => {
    const t: MdNode = { type: 'root', children: [{ type: 'text' }] };
    expect(() => remarkMathLenient()(t as never)).not.toThrow();
  });
});
