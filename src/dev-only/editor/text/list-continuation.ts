type Match =
  | { kind: 'task'; indent: string; marker: string; rest: string }
  | { kind: 'unordered'; indent: string; marker: string; rest: string }
  | { kind: 'ordered'; indent: string; num: number; rest: string };

const TASK_RE = /^(\s*)([-*+])\s+\[[ xX]\]\s+(.*)$/;
const UNORDERED_RE = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED_RE = /^(\s*)(\d+)\.\s+(.*)$/;

function classify(line: string): Match | null {
  const task = TASK_RE.exec(line);
  if (task) return { kind: 'task', indent: task[1], marker: task[2], rest: task[3] };
  const unordered = UNORDERED_RE.exec(line);
  if (unordered) return { kind: 'unordered', indent: unordered[1], marker: unordered[2], rest: unordered[3] };
  const ordered = ORDERED_RE.exec(line);
  if (ordered) return { kind: 'ordered', indent: ordered[1], num: Number(ordered[2]), rest: ordered[3] };
  return null;
}

function nextMarker(m: Match): string {
  if (m.kind === 'task') return `${m.indent}${m.marker} [ ] `;
  if (m.kind === 'unordered') return `${m.indent}${m.marker} `;
  return `${m.indent}${m.num + 1}. `;
}

export function setupListContinuation(textarea: HTMLTextAreaElement): void {
  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (textarea.selectionStart !== textarea.selectionEnd) return;
    const caret = textarea.selectionStart;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
    const lineEnd = value.indexOf('\n', caret);
    const lineEndIdx = lineEnd === -1 ? value.length : lineEnd;
    const currentLine = value.slice(lineStart, lineEndIdx);
    const match = classify(currentLine);
    if (!match) return;
    e.preventDefault();
    if (!match.rest.trim()) {
      const before = value.slice(0, lineStart);
      const after = value.slice(lineEndIdx);
      textarea.value = before + after;
      textarea.selectionStart = textarea.selectionEnd = lineStart;
    } else {
      const insert = `\n${nextMarker(match)}`;
      const before = value.slice(0, caret);
      const after = value.slice(caret);
      textarea.value = before + insert + after;
      textarea.selectionStart = textarea.selectionEnd = caret + insert.length;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
