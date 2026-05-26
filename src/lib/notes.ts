export function notePreview(body: string | undefined, maxLen = 80): string {
  if (!body) return '';
  const firstLine = body.split('\n').find((l) => l.trim()) ?? '';
  let plain = firstLine.replace(
    /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_m, target, alias) => alias?.trim() ?? target.trim(),
  );
  if (plain.length > maxLen) {
    plain = plain.slice(0, maxLen - 1) + '…';
  }
  return plain;
}

export function noteTitle(body: string | undefined): string {
  let title = notePreview(body, 80);
  title = title.replace(/[.!?]+$/, '').trim();
  return title;
}
