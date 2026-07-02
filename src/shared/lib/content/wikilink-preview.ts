// Shared by src/pages/wikilink-previews.json.ts (280-char hover popovers)
// and src/features/glossary/lib/build-glossary.ts (100-char post glossary).

export function stripMarkdown(body: string): string {
  return body
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[\[[^\]|#]+(?:\|([^\]]+))?\]\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}\s+/gm, '')
    .replace(/^[ \t]*>+\s?/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a preview snippet from a markdown body. Truncates to `maxLen`
 * characters with an ellipsis if needed.
 */
export function previewOf(body: string, maxLen: number): string {
  const stripped = stripMarkdown(body);
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen - 1) + '…';
}

export const normKey = (s: string): string => s.normalize('NFC').toLowerCase();
