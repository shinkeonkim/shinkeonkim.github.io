import { describe, expect, it } from 'vitest';
import remarkMermaid from './remark-mermaid.mjs';

interface MdNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MdNode[];
}

function tree(node: MdNode): MdNode {
  return { type: 'root', children: [node] };
}

describe('remarkMermaid', () => {
  it('replaces mermaid code fence with pre.mermaid html', () => {
    const t = tree({ type: 'code', lang: 'mermaid', value: 'graph LR;A-->B' });
    remarkMermaid()(t as never);
    const child = t.children?.[0];
    expect(child?.type).toBe('html');
    expect(child?.value).toContain('<pre class="mermaid not-prose"');
    expect(child?.value).toContain('data-mermaid-source');
    expect(child?.value).toContain('graph LR');
  });

  it('escapes HTML in source', () => {
    const t = tree({ type: 'code', lang: 'mermaid', value: '<script>' });
    remarkMermaid()(t as never);
    expect(t.children?.[0].value).toContain('&lt;script&gt;');
  });

  it('leaves non-mermaid fences alone', () => {
    const t = tree({ type: 'code', lang: 'python', value: 'x' });
    remarkMermaid()(t as never);
    expect(t.children?.[0].type).toBe('code');
  });
});
