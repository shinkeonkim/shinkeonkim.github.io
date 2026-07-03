import { visit } from 'unist-util-visit';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textContentOf(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node.children)) return node.children.map(textContentOf).join('');
  if (typeof node.value === 'string') return node.value;
  return '';
}

let idCounter = 0;

export default function remarkSidenote() {
  return (tree, file) => {
    idCounter = 0;
    const filePath = file?.path ?? file?.history?.[0] ?? 'sidenote';
    visit(tree, ['textDirective', 'leafDirective', 'containerDirective'], (node, index, parent) => {
      if (node.name !== 'sidenote') return;
      if (!parent || typeof index !== 'number') return;
      const label = textContentOf(node).trim();
      const attrs = node.attributes ?? {};
      const content = attrs.content ?? '';
      if (!content || !label) {
        parent.children[index] = { type: 'text', value: label };
        return;
      }
      idCounter += 1;
      const id = `sn-${filePath.length}-${idCounter}`;
      const html =
        `<span class="sidenote-ref" tabindex="0" role="doc-noteref" aria-describedby="${escapeHtml(id)}" aria-expanded="false" data-sidenote-ref="${escapeHtml(id)}">${escapeHtml(label)}</span>` +
        `<aside class="sidenote" id="${escapeHtml(id)}" role="doc-note">${escapeHtml(content)}</aside>`;
      parent.children[index] = { type: 'html', value: html };
    });
  };
}
