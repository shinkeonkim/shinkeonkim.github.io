import { describe, expect, it } from 'vitest';
import remarkCheatsheet from './remark-cheatsheet.mjs';

interface MdNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MdNode[];
}

function tree(node: MdNode): MdNode {
  return { type: 'root', children: [node] };
}

describe('remarkCheatsheet', () => {
  it('replaces cheatsheet fence with cheatsheet aside HTML', () => {
    const t = tree({
      type: 'code',
      lang: 'cheatsheet',
      value: '## First\n- item 1\n- item 2\n## Second\n- item 3',
    });
    remarkCheatsheet()(t as never);
    const child = t.children?.[0];
    expect(child?.type).toBe('html');
    expect(child?.value).toContain('cheatsheet-inline');
    expect(child?.value).toContain('First');
    expect(child?.value).toContain('item 1');
    expect(child?.value).toContain('Second');
  });

  it('renders empty aside when body has no bullets', () => {
    const t = tree({ type: 'code', lang: 'cheatsheet', value: 'just prose' });
    remarkCheatsheet()(t as never);
    expect(t.children?.[0].value).toContain('cheatsheet-inline-empty');
  });

  it('renders untitled section when bullets appear before heading', () => {
    const t = tree({
      type: 'code',
      lang: 'cheatsheet',
      value: '- top bullet\n## After heading\n- another',
    });
    remarkCheatsheet()(t as never);
    expect(t.children?.[0].value).toContain('top bullet');
    expect(t.children?.[0].value).toContain('another');
  });

  it('escapes HTML in title and items', () => {
    const t = tree({ type: 'code', lang: 'cheatsheet', value: '## <b>&"\n- <script>' });
    remarkCheatsheet()(t as never);
    expect(t.children?.[0].value).not.toContain('<b>');
    expect(t.children?.[0].value).not.toContain('<script>');
  });

  it('leaves non-cheatsheet fences untouched', () => {
    const t = tree({ type: 'code', lang: 'python', value: 'x=1' });
    remarkCheatsheet()(t as never);
    expect(t.children?.[0].type).toBe('code');
  });
});
