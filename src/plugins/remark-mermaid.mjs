import { visit } from 'unist-util-visit';

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid') return;
      if (!parent || typeof index !== 'number') return;
      parent.children[index] = {
        type: 'html',
        value: `<pre class="mermaid not-prose" data-mermaid-source>${escapeHtml(node.value)}</pre>`,
      };
    });
  };
}
