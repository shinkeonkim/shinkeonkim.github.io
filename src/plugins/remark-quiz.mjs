import { visit } from 'unist-util-visit';

function escapeAttribute(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const VALID_TYPES = new Set([
  'multiple-choice',
  'multiple-select',
  'true-false',
  'short-answer',
]);

function validateQuiz(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { error: `JSON parse error: ${e.message}` };
  }
  if (!data || typeof data !== 'object') return { error: 'root must be an object' };
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { error: 'items must be a non-empty array' };
  }
  for (const [i, item] of data.items.entries()) {
    if (!item || typeof item !== 'object') return { error: `item ${i} is not an object` };
    if (!VALID_TYPES.has(item.type)) return { error: `item ${i}: unknown type "${item.type}"` };
    if (typeof item.question !== 'string' || !item.question.trim()) {
      return { error: `item ${i}: missing question` };
    }
    if (item.type === 'multiple-choice' || item.type === 'multiple-select') {
      if (!Array.isArray(item.options) || item.options.length < 2) {
        return { error: `item ${i}: options must have at least 2 entries` };
      }
    }
  }
  return { data };
}

function renderError(msg) {
  return `<div class="quiz-error not-prose" role="alert"><strong>Quiz 오류:</strong> ${escapeAttribute(msg)}</div>`;
}

export default function remarkQuiz() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'quiz') return;
      if (!parent || typeof index !== 'number') return;
      const result = validateQuiz(node.value ?? '');
      if (result.error) {
        parent.children[index] = { type: 'html', value: renderError(result.error) };
        return;
      }
      parent.children[index] = {
        type: 'html',
        value: `<div class="quiz-placeholder not-prose" data-quiz-source="${escapeAttribute(JSON.stringify(result.data))}" data-pagefind-ignore="all"></div>`,
      };
    });
  };
}
