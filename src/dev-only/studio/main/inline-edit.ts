import { updateElementBase } from '../state';

interface InlineTextTarget {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
}

export function startInlineTextEdit(canvas: SVGSVGElement, el: InlineTextTarget): void {
  canvas.querySelectorAll('[data-inline-text-editor]').forEach((n) => n.remove());
  const fontSize = el.fontSize ?? 16;
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('data-inline-text-editor', '');
  fo.setAttribute('x', String(el.x - 8));
  fo.setAttribute('y', String(el.y - fontSize));
  const width = Math.max(160, (el.content?.length ?? 5) * fontSize * 0.7);
  fo.setAttribute('width', String(width));
  fo.setAttribute('height', String(fontSize * 1.6));
  const input = document.createElement('input');
  input.type = 'text';
  input.value = el.content ?? '';
  Object.assign(input.style, {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    border: '2px solid #6366f1',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.96)',
    padding: '0 6px',
    font: `${el.fontWeight ?? 400} ${fontSize}px ui-sans-serif,system-ui,sans-serif`,
    color: el.color ?? '#0f172a',
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.2)',
  });
  fo.appendChild(input);
  canvas.appendChild(fo);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  let settled = false;
  const commit = (): void => {
    if (settled) return;
    settled = true;
    const newContent = input.value;
    fo.remove();
    if (newContent !== el.content) {
      updateElementBase(el.id, { content: newContent });
    }
  };
  const cancel = (): void => {
    if (settled) return;
    settled = true;
    fo.remove();
  };
  let isComposingFallback = false;
  input.addEventListener('compositionstart', () => { isComposingFallback = true; });
  input.addEventListener('compositionend', () => { isComposingFallback = false; });
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.isComposing || isComposingFallback) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
}
