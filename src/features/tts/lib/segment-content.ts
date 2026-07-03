export type SegmentKind = 'text' | 'heading' | 'quote' | 'alert' | 'skipped';

export interface Segment {
  kind: SegmentKind;
  element: HTMLElement;
  text: string;
  prefix?: string;
}

const SKIPPED_SELECTORS = [
  'pre',
  'code:not(:has(*))',
  '.katex',
  '.katex-display',
  '[data-mermaid-source]',
  '.chart-js-wrap',
  '.animation-fence',
  '[data-cheatsheet-inline]',
  '.footnote-ref',
  '.heading-anchor',
];

const HEADING_LEVEL_LABEL: Record<string, string> = {
  H2: '섹션',
  H3: '항목',
  H4: '소항목',
  H5: '세부',
  H6: '세부',
};

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function elementIsInsideSkipped(el: HTMLElement, root: HTMLElement): boolean {
  const skipSelector = SKIPPED_SELECTORS.join(', ');
  let cursor: HTMLElement | null = el;
  while (cursor && cursor !== root) {
    if (cursor.matches?.(skipSelector)) return true;
    cursor = cursor.parentElement;
  }
  return false;
}

function textOf(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  const skipSelector = SKIPPED_SELECTORS.join(', ');
  clone.querySelectorAll(skipSelector).forEach((node) => node.remove());
  return collapseWhitespace(clone.textContent ?? '');
}

export function segmentContent(root: HTMLElement): Segment[] {
  const segments: Segment[] = [];
  const walkables = root.querySelectorAll<HTMLElement>(
    'h2, h3, h4, h5, h6, p, li, blockquote',
  );
  for (const el of walkables) {
    if (elementIsInsideSkipped(el, root)) continue;
    const tag = el.tagName;

    if (tag === 'BLOCKQUOTE') {
      const isAlert = el.classList.contains('markdown-alert') ||
        el.classList.contains('alert') ||
        Array.from(el.classList).some((c) => c.startsWith('markdown-alert-'));
      const text = textOf(el);
      if (!text) continue;
      segments.push({
        kind: isAlert ? 'alert' : 'quote',
        element: el,
        text,
        prefix: isAlert ? '알림.' : '인용.',
      });
      continue;
    }

    if (tag[0] === 'H' && /^H[2-6]$/.test(tag)) {
      const text = textOf(el);
      if (!text) continue;
      const label = HEADING_LEVEL_LABEL[tag] ?? '';
      segments.push({
        kind: 'heading',
        element: el,
        text,
        prefix: label ? `${label}.` : undefined,
      });
      continue;
    }

    if (tag === 'LI') {
      if (el.parentElement && ['UL', 'OL'].includes(el.parentElement.tagName)) {
        const text = textOf(el);
        if (!text) continue;
        segments.push({ kind: 'text', element: el, text });
      }
      continue;
    }

    if (tag === 'P') {
      const text = textOf(el);
      if (!text) continue;
      segments.push({ kind: 'text', element: el, text });
    }
  }
  return segments;
}
