// Transforms code fences of the form ```anim:<id> { overrides } ```
// into a placeholder div. AnimationLoader fetches /animations/<id>.json at
// runtime and renders via the universal AnimationEngine.

import { visit } from 'unist-util-visit';

function escapeAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function remarkAnimation() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!node.lang) return;
      const m = node.lang.match(/^anim:([a-z0-9][a-z0-9_-]*)$/i);
      if (!m) return;
      if (!parent || typeof index !== 'number') return;

      const id = m[1];
      const overrides = (node.value || '').trim() || '{}';
      try {
        JSON.parse(overrides);
      } catch (err) {
        parent.children[index] = {
          type: 'html',
          value: `<div class="anim-error">애니메이션 overrides JSON 파싱 실패 (${escapeAttr(id)}): ${escapeAttr(err.message)}</div>`,
        };
        return;
      }

      parent.children[index] = {
        type: 'html',
        value: `<div class="anim-placeholder" data-anim-id="${escapeAttr(id)}" data-anim-overrides="${escapeAttr(overrides)}"></div>`,
      };
    });
  };
}
