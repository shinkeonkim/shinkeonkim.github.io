import { todayIsoDate, todayIsoTime } from '@/dev-only/editor/lib/utils';
import type { CollectionName } from '@/dev-only/editor/core/state';

export function newFileTemplate(collection: CollectionName, slug: string): string {
  const filename = slug.split('/').pop() ?? slug;
  if (collection === 'posts') {
    return `---\ntitle: "${filename}"\ndescription: ""\ndate: ${todayIsoDate()}\ntags: []\ndraft: true\n---\n\n`;
  }
  if (collection === 'notes') {
    return `---\ndate: ${todayIsoTime()}\ntags: []\n---\n\n`;
  }
  if (collection === 'sources') {
    return `---\ntitle: "${filename}"\ntype: website\ntags: []\n---\n\n출처에 대한 간단한 설명을 작성하세요.\n`;
  }
  return `---\ntitle: "${filename}"\naliases: []\ntags: []\nupdated: ${todayIsoDate()}\n---\n\n## 개요\n\n`;
}
