import { describe, expect, it } from 'vitest';
import remarkAnimation from './remark-animation.mjs';

interface MdNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MdNode[];
}

function tree(node: MdNode): MdNode {
  return { type: 'root', children: [node] };
}

describe('remarkAnimation', () => {
  it('replaces anim: code fence with placeholder div', () => {
    const t = tree({ type: 'code', lang: 'anim:demo', value: '{}' });
    remarkAnimation()(t as never);
    const child = t.children?.[0];
    expect(child?.type).toBe('html');
    expect(child?.value).toContain('data-anim-id="demo"');
    expect(child?.value).toContain('anim-placeholder');
  });

  it('uses {} as default when overrides body is empty', () => {
    const t = tree({ type: 'code', lang: 'anim:test', value: '' });
    remarkAnimation()(t as never);
    expect(t.children?.[0].value).toContain('data-anim-overrides="{}"');
  });

  it('emits anim-error when JSON is invalid', () => {
    const t = tree({ type: 'code', lang: 'anim:x', value: '{ bad json' });
    remarkAnimation()(t as never);
    const child = t.children?.[0];
    expect(child?.type).toBe('html');
    expect(child?.value).toContain('anim-error');
  });

  it('leaves non-anim fences unchanged', () => {
    const t = tree({ type: 'code', lang: 'python', value: 'print("hi")' });
    remarkAnimation()(t as never);
    expect(t.children?.[0].type).toBe('code');
  });

  it('ignores nodes without lang', () => {
    const t = tree({ type: 'code' });
    remarkAnimation()(t as never);
    expect(t.children?.[0].type).toBe('code');
  });

  it('escapes HTML-hazardous characters in id and overrides', () => {
    const t = tree({ type: 'code', lang: 'anim:demo', value: '{"a":"<b>&\\"c\\""}' });
    remarkAnimation()(t as never);
    const html = t.children?.[0].value ?? '';
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;');
  });
});
