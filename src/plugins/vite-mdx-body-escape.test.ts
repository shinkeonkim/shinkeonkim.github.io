import { describe, expect, it } from 'vitest';
import mdxBodyEscape from './vite-mdx-body-escape.mjs';

interface VitePlugin {
  name: string;
  enforce?: string;
  transform: (code: string, id: string) => { code: string; map: null } | null;
}

function run(code: string, id = '/some/file.md'): string {
  const plugin = mdxBodyEscape() as VitePlugin;
  const result = plugin.transform(code, id);
  return result ? result.code : code;
}

describe('mdxBodyEscape (plugin metadata)', () => {
  it('exposes name and pre enforce', () => {
    const p = mdxBodyEscape() as VitePlugin;
    expect(p.name).toBe('mdx-body-escape');
    expect(p.enforce).toBe('pre');
  });

  it('returns null for non-markdown files', () => {
    const p = mdxBodyEscape() as VitePlugin;
    expect(p.transform('anything', '/x.js')).toBeNull();
  });

  it('returns null when id is empty', () => {
    const p = mdxBodyEscape() as VitePlugin;
    expect(p.transform('anything', '')).toBeNull();
  });

  it('skips files under node_modules', () => {
    const p = mdxBodyEscape() as VitePlugin;
    expect(p.transform('x < y', '/foo/node_modules/x.md')).toBeNull();
  });

  it('handles ?query suffix on id', () => {
    const p = mdxBodyEscape() as VitePlugin;
    expect(p.transform('plain text', '/foo.md?astro=jsx')).toBeNull();
  });
});

describe('escape < before identifiers', () => {
  it('escapes < before unknown identifier followed by = (math expr)', () => {
    expect(run('the value H <= 10 works')).toContain('H \\<= 10');
  });

  it('leaves valid HTML inline tags alone', () => {
    expect(run('use <em>italic</em> or <br /> tags')).toContain('<em>');
  });

  it('escapes < before non-HTML lowercase tag', () => {
    expect(run('vector<int, int> foo')).toContain('vector\\<int, int>');
  });

  it('leaves capital-first component names when long enough alone', () => {
    expect(run('the <CodeWithOutput /> component')).toContain('<CodeWithOutput');
  });

  it('escapes < before short capital identifier', () => {
    expect(run('H <A> is not a component')).toContain('\\<A>');
  });

  it('leaves closing HTML inline tags alone', () => {
    expect(run('text <em>x</em> here')).toContain('</em>');
  });

  it('escapes < followed by /unknown tag', () => {
    expect(run('foo </unknowntag> bar')).toContain('\\<');
  });

  it('preserves <! and <? which are HTML control sequences', () => {
    expect(run('start <!-- comment --> end')).toContain('<!--');
  });
});

describe('escape { with hazards', () => {
  it('escapes {expr} containing letters', () => {
    expect(run('the {alpha} value')).toContain('\\{alpha\\}');
  });

  it('escapes {expr} containing spread ...', () => {
    expect(run('use {...rest} spread')).toContain('\\{...rest\\}');
  });

  it('escapes {expr} containing Greek/math symbols', () => {
    expect(run('formula {Σ x} here')).toContain('\\{Σ x\\}');
  });

  it('leaves numeric-only braces {}', () => {
    expect(run('numbers {123}')).toContain('{123}');
  });

  it('leaves whitespace-only braces {  }', () => {
    expect(run('empty {  }')).toContain('{  }');
  });
});

describe('preserves fenced code blocks', () => {
  it('does not modify content inside fenced code', () => {
    const code = '\ninline\n```\nx < y and {foo}\n```\nend\n';
    const out = run(code);
    expect(out).toContain('x < y and {foo}');
  });

  it('processes lines outside of fences', () => {
    const code = 'front <bar>\n```\nx < y\n```\ntail {expr}';
    const out = run(code);
    expect(out).toContain('```');
    expect(out).toContain('x < y');
  });
});

describe('preserves frontmatter', () => {
  it('leaves YAML frontmatter untouched', () => {
    const code = '---\ntitle: value with <angles>\n---\nbody < text';
    const out = run(code);
    expect(out.startsWith('---\ntitle: value with <angles>')).toBe(true);
  });
});

describe('preserves JSX blocks and indented code', () => {
  it('leaves lines inside a JSX component intact', () => {
    const code = '<Component prop="a">\n  child text with <inner />\n</Component>\n';
    const out = run(code);
    expect(out).toContain('<Component');
  });

  it('leaves indented code lines untouched', () => {
    const code = 'text\n    x < y and {expr}\ntext2';
    const out = run(code);
    expect(out).toContain('    x < y');
  });
});

describe('table pipe escaping in backticks', () => {
  it('escapes | inside backticks within a table row', () => {
    const code = '| a | `x|y` |\n';
    const out = run(code);
    expect(out).toContain('`x\\|y`');
  });

  it('leaves | outside backticks alone in table rows', () => {
    const code = '| a | b | c |\n';
    const out = run(code);
    expect(out).toBe(code);
  });
});

describe('returns null when no changes needed', () => {
  it('returns null for benign content', () => {
    const p = mdxBodyEscape() as VitePlugin;
    const result = p.transform('plain text with no hazards', '/x.md');
    expect(result).toBeNull();
  });
});
