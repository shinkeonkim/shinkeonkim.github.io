import { visit } from 'unist-util-visit';

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseBullets(raw) {
  const sections = [];
  let current = null;
  const lines = raw.split('\n');
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { title: heading[1].trim(), items: [] };
      sections.push(current);
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) {
      if (!current) {
        current = { title: null, items: [] };
        sections.push(current);
      }
      current.items.push(bullet[1].trim());
    }
  }
  return sections.filter((s) => s.items.length > 0);
}

export default function remarkCheatsheet() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'cheatsheet') return;
      if (!parent || typeof index !== 'number') return;
      const sections = parseBullets(node.value ?? '');
      const html = renderInlineCheatsheet(sections);
      parent.children[index] = { type: 'html', value: html };
    });
  };
}

function renderInlineCheatsheet(sections) {
  if (sections.length === 0) {
    return '<aside class="cheatsheet-inline not-prose"><p class="cheatsheet-inline-empty">치트시트 내용이 비어 있습니다.</p></aside>';
  }
  const inner = sections
    .map((s) => {
      const title = s.title ? `<h4 class="cheatsheet-inline-heading">${escapeHtml(s.title)}</h4>` : '';
      const items = s.items.map((it) => `<li>${escapeHtml(it)}</li>`).join('');
      return `<section class="cheatsheet-inline-section">${title}<ul>${items}</ul></section>`;
    })
    .join('');
  return `<aside class="cheatsheet-inline not-prose" data-cheatsheet-inline aria-label="이 글의 핵심 요약"><header class="cheatsheet-inline-header"><span aria-hidden="true">🃏</span> 이 글의 핵심</header>${inner}</aside>`;
}
