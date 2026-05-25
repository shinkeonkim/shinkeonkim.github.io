import { visit } from 'unist-util-visit';

const SKIP_PROPS = new Set(['eager-loading', 'priority']);

function isExternalImg(src) {
  return /^https?:\/\//i.test(src ?? '');
}

export default function rehypeLazyImages() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;
      const props = node.properties ?? (node.properties = {});
      if (SKIP_PROPS.has(props.dataPriority) || props['data-eager']) return;
      if (!props.loading) props.loading = 'lazy';
      if (!props.decoding) props.decoding = 'async';
      if (!props.fetchpriority && !isExternalImg(props.src)) {
        props.fetchpriority = 'low';
      }
    });
  };
}
