import { visit } from 'unist-util-visit';

const DISPLAY_INLINE_RE = /\$\$\s+([^$\n]+?)\s+\$\$/g;
const INLINE_LENIENT_RE = /(^|[\s([{,;:'"\u2018\u201c])\$\s+([^$\n]+?)\s+\$(?=$|[\s)\]},;:.!?'"\u2019\u201d])/g;

export default function remarkMathLenient() {
  return (tree) => {
    visit(tree, 'text', (node) => {
      if (!node.value || !node.value.includes('$')) return;
      let next = node.value.replace(DISPLAY_INLINE_RE, (_m, inner) => `$${inner.trim()}$`);
      next = next.replace(INLINE_LENIENT_RE, (_m, lead, inner) => `${lead}$${inner.trim()}$`);
      if (next !== node.value) node.value = next;
    });
  };
}
