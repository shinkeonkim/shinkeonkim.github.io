import { api } from '@/dev-only/editor/core/api';
import { confirmModal, openModal } from '@/dev-only/editor/ui/modal';
import { setStatus } from '@/dev-only/editor/core/status';
import type { DraggedItem, DropTarget } from '@/dev-only/editor/ui/tree';
import type { CollectionName, Ext } from '@/dev-only/editor/core/state';

import { COLLECTION_NAMES } from '@/dev-only/editor/core/state';
const COLLECTION_OPTIONS = COLLECTION_NAMES.map((c) => ({ value: c, label: c }));

function splitNameAndExt(name: string, fallbackExt: Ext): { base: string; ext: Ext } {
  if (name.endsWith('.mdx')) return { base: name.slice(0, -4), ext: '.mdx' };
  if (name.endsWith('.md')) return { base: name.slice(0, -3), ext: '.md' };
  return { base: name, ext: fallbackExt };
}

type FileChangeHandler = (
  oldFile: { collection: CollectionName; slug: string } | null,
  newFile: { collection: CollectionName; slug: string; ext: Ext } | null,
) => void;

type FolderChangeHandler = (
  oldFolder: { collection: CollectionName; folder: string },
  newFolder: { collection: CollectionName; folder: string },
) => void;

export class FileOpsController {
  private onChanged: () => Promise<void>;
  private onFileChanged: FileChangeHandler;
  private onFolderChanged: FolderChangeHandler;

  constructor(opts: {
    onChanged: () => Promise<void>;
    onFileChanged: FileChangeHandler;
    onFolderChanged: FolderChangeHandler;
  }) {
    this.onChanged = opts.onChanged;
    this.onFileChanged = opts.onFileChanged;
    this.onFolderChanged = opts.onFolderChanged;
  }

  async newFile(
    collection: CollectionName,
    folder: string,
  ): Promise<{ collection: CollectionName; slug: string; ext: '.md' | '.mdx' } | null> {
    const r = await openModal({
      title: '새 파일',
      fields: [
        {
          name: 'collection',
          label: '컬렉션',
          type: 'select',
          value: collection,
          options: COLLECTION_OPTIONS,
        },
        {
          name: 'slug',
          label: '슬러그 (하위 폴더 포함 가능)',
          value: folder ? folder + '/' : '',
          placeholder: 'my-post 또는 sub/folder/name',
          required: true,
        },
        {
          name: 'ext',
          label: '확장자',
          type: 'select',
          value: '.md',
          options: [
            { value: '.md', label: '.md (일반 마크다운)' },
            { value: '.mdx', label: '.mdx (MDX 컴포넌트 사용)' },
          ],
        },
      ],
      confirmLabel: '만들기',
    });
    if (!r.confirmed) return null;
    const slug = r.values.slug.trim();
    if (!slug) return null;
    const targetCollection = r.values.collection as CollectionName;
    const ext = (r.values.ext === '.mdx' ? '.mdx' : '.md') as '.md' | '.mdx';
    return { collection: targetCollection, slug, ext };
  }

  async newFolder(collection: CollectionName, parent: string): Promise<void> {
    const r = await openModal({
      title: '새 폴더',
      description: parent ? `상위: ${collection}/${parent}` : `상위: ${collection}/`,
      fields: [
        {
          name: 'name',
          label: '폴더 이름',
          required: true,
          placeholder: 'subfolder 또는 nested/sub',
        },
      ],
    });
    if (!r.confirmed) return;
    const name = r.values.name.trim();
    if (!name) return;
    const target = parent ? `${parent}/${name}` : name;
    try {
      await api.fileOps({ action: 'create-folder', collection, folder: target });
      setStatus(`폴더 생성: ${collection}/${target}`, 'ok');
      await this.onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('폴더 생성 실패: ' + msg, 'error');
    }
  }

  async fileMenu(
    collection: CollectionName,
    slug: string,
    currentExt: '.md' | '.mdx',
    anchor: HTMLElement,
  ): Promise<void> {
    const r = await openModal({
      title: '파일 작업',
      description: `${collection}/${slug}${currentExt}`,
      fields: [
        {
          name: 'action',
          label: '작업',
          type: 'select',
          value: 'rename',
          options: [
            { value: 'rename', label: '이름 변경 / 위치 이동' },
            { value: 'move-collection', label: '다른 컬렉션으로 이동' },
            { value: 'delete', label: '삭제' },
          ],
        },
      ],
    });
    anchor.blur();
    if (!r.confirmed) return;
    if (r.values.action === 'rename') await this.renameFile(collection, slug, currentExt);
    else if (r.values.action === 'move-collection')
      await this.moveFile(collection, slug, currentExt);
    else if (r.values.action === 'delete') await this.deleteFile(collection, slug, currentExt);
  }

  async folderMenu(collection: CollectionName, folder: string, anchor: HTMLElement): Promise<void> {
    const r = await openModal({
      title: '폴더 작업',
      description: `${collection}/${folder}`,
      fields: [
        {
          name: 'action',
          label: '작업',
          type: 'select',
          value: 'rename',
          options: [
            { value: 'rename', label: '이름 변경' },
            { value: 'delete', label: '삭제 (내부 파일 모두 삭제)' },
          ],
        },
      ],
    });
    anchor.blur();
    if (!r.confirmed) return;
    if (r.values.action === 'rename') await this.renameFolder(collection, folder);
    else if (r.values.action === 'delete') await this.deleteFolder(collection, folder);
  }

  private async renameFile(
    collection: CollectionName,
    slug: string,
    ext: '.md' | '.mdx',
  ): Promise<void> {
    const r = await openModal({
      title: '파일 이름 변경 / 이동',
      fields: [
        { name: 'slug', label: '새 슬러그 (폴더 변경 가능)', value: slug, required: true },
        {
          name: 'ext',
          label: '확장자',
          type: 'select',
          value: ext,
          options: [
            { value: '.md', label: '.md' },
            { value: '.mdx', label: '.mdx' },
          ],
        },
      ],
      confirmLabel: '변경',
    });
    if (!r.confirmed) return;
    const newSlug = r.values.slug.trim();
    const newExt = (r.values.ext === '.mdx' ? '.mdx' : '.md') as '.md' | '.mdx';
    if (!newSlug || (newSlug === slug && newExt === ext)) return;
    try {
      await api.fileOps({
        action: 'rename-file',
        collection,
        slug,
        ext,
        toSlug: newSlug,
        toExt: newExt,
      });
      setStatus(`이름 변경: ${slug}${ext} → ${newSlug}${newExt}`, 'ok');
      await this.onChanged();
      this.onFileChanged({ collection, slug }, { collection, slug: newSlug, ext: newExt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('이름 변경 실패: ' + msg, 'error');
    }
  }

  private async moveFile(
    collection: CollectionName,
    slug: string,
    ext: '.md' | '.mdx',
  ): Promise<void> {
    const r = await openModal({
      title: '컬렉션 이동',
      fields: [
        {
          name: 'toCollection',
          label: '대상 컬렉션',
          type: 'select',
          value: collection,
          options: COLLECTION_OPTIONS,
        },
        { name: 'toSlug', label: '대상 슬러그', value: slug, required: true },
      ],
      confirmLabel: '이동',
    });
    if (!r.confirmed) return;
    const toCollection = r.values.toCollection as CollectionName;
    const toSlug = r.values.toSlug.trim();
    if (!toSlug) return;
    if (toCollection === collection && toSlug === slug) return;
    try {
      await api.fileOps({
        action: 'move-file',
        collection,
        slug,
        ext,
        toCollection,
        toSlug,
      });
      setStatus(`이동: ${collection}/${slug} → ${toCollection}/${toSlug}`, 'ok');
      await this.onChanged();
      this.onFileChanged({ collection, slug }, { collection: toCollection, slug: toSlug, ext });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('이동 실패: ' + msg, 'error');
    }
  }

  private async deleteFile(
    collection: CollectionName,
    slug: string,
    ext: '.md' | '.mdx',
  ): Promise<void> {
    const confirmed = await confirmModal({
      title: '파일 삭제',
      description: `${collection}/${slug}${ext} 파일을 정말 삭제할까요? 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.fileOps({ action: 'delete-file', collection, slug, ext });
      setStatus(`삭제: ${collection}/${slug}${ext}`, 'ok');
      await this.onChanged();
      this.onFileChanged({ collection, slug }, null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('삭제 실패: ' + msg, 'error');
    }
  }

  private async renameFolder(collection: CollectionName, folder: string): Promise<void> {
    const r = await openModal({
      title: '폴더 이름 변경',
      fields: [{ name: 'toFolder', label: '새 경로', value: folder, required: true }],
      confirmLabel: '변경',
    });
    if (!r.confirmed) return;
    const toFolder = r.values.toFolder.trim();
    if (!toFolder || toFolder === folder) return;
    await this.executeFolderRename(collection, folder, toFolder);
  }

  async renameFileInline(
    collection: CollectionName,
    slug: string,
    ext: Ext,
    newBaseName: string,
  ): Promise<void> {
    const trimmed = newBaseName.trim();
    if (!trimmed) return;
    const parts = slug.split('/');
    const oldBase = parts[parts.length - 1];
    const { base, ext: parsedExt } = splitNameAndExt(trimmed, ext);
    if (base === oldBase && parsedExt === ext) return;
    parts[parts.length - 1] = base;
    const newSlug = parts.join('/');
    try {
      await api.fileOps({
        action: 'rename-file',
        collection,
        slug,
        ext,
        toSlug: newSlug,
        toExt: parsedExt,
      });
      setStatus(`이름 변경: ${slug}${ext} → ${newSlug}${parsedExt}`, 'ok');
      await this.onChanged();
      this.onFileChanged({ collection, slug }, { collection, slug: newSlug, ext: parsedExt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('이름 변경 실패: ' + msg, 'error');
    }
  }

  async renameFolderInline(
    collection: CollectionName,
    folder: string,
    newName: string,
  ): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const parts = folder.split('/');
    if (parts[parts.length - 1] === trimmed) return;
    parts[parts.length - 1] = trimmed;
    const newFolder = parts.join('/');
    await this.executeFolderRename(collection, folder, newFolder);
  }

  async toggleExt(collection: CollectionName, slug: string, ext: Ext): Promise<Ext | null> {
    const targetExt: Ext = ext === '.md' ? '.mdx' : '.md';
    try {
      await api.fileOps({
        action: 'rename-file',
        collection,
        slug,
        ext,
        toSlug: slug,
        toExt: targetExt,
      });
      setStatus(`확장자 변경: ${slug}${ext} → ${slug}${targetExt}`, 'ok');
      await this.onChanged();
      this.onFileChanged({ collection, slug }, { collection, slug, ext: targetExt });
      return targetExt;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('확장자 변경 실패: ' + msg, 'error');
      return null;
    }
  }

  async dropItem(item: DraggedItem, target: DropTarget): Promise<void> {
    if (item.type === 'file') {
      const filename = item.slug.includes('/') ? item.slug.split('/').pop()! : item.slug;
      const toSlug = target.folder ? `${target.folder}/${filename}` : filename;
      if (item.collection === target.collection && item.slug === toSlug) return;
      try {
        if (item.collection === target.collection) {
          await api.fileOps({
            action: 'rename-file',
            collection: item.collection,
            slug: item.slug,
            ext: item.ext,
            toSlug,
            toExt: item.ext,
          });
        } else {
          await api.fileOps({
            action: 'move-file',
            collection: item.collection,
            slug: item.slug,
            ext: item.ext,
            toCollection: target.collection,
            toSlug,
          });
        }
        setStatus(`이동: ${item.collection}/${item.slug} → ${target.collection}/${toSlug}`, 'ok');
        await this.onChanged();
        this.onFileChanged(
          { collection: item.collection, slug: item.slug },
          { collection: target.collection, slug: toSlug, ext: item.ext },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('이동 실패: ' + msg, 'error');
      }
      return;
    }
    if (item.collection !== target.collection) {
      setStatus('폴더는 같은 컬렉션 안에서만 이동할 수 있습니다', 'error');
      return;
    }
    const folderName = item.folder.includes('/') ? item.folder.split('/').pop()! : item.folder;
    const toFolder = target.folder ? `${target.folder}/${folderName}` : folderName;
    if (item.folder === toFolder) return;
    if (toFolder === item.folder || toFolder.startsWith(item.folder + '/')) {
      setStatus('자기 자신 또는 하위 폴더로는 이동할 수 없습니다', 'error');
      return;
    }
    await this.executeFolderRename(item.collection, item.folder, toFolder);
  }

  private async executeFolderRename(
    collection: CollectionName,
    folder: string,
    toFolder: string,
  ): Promise<void> {
    try {
      await api.fileOps({ action: 'rename-folder', collection, folder, toFolder });
      setStatus(`폴더 변경: ${collection}/${folder} → ${collection}/${toFolder}`, 'ok');
      await this.onChanged();
      this.onFolderChanged({ collection, folder }, { collection, folder: toFolder });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('폴더 변경 실패: ' + msg, 'error');
    }
  }

  private async deleteFolder(collection: CollectionName, folder: string): Promise<void> {
    const confirmed = await confirmModal({
      title: '폴더 삭제',
      description: `${collection}/${folder} 폴더와 모든 하위 파일을 영구 삭제합니다. 정말로 진행할까요?`,
      confirmLabel: '삭제',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const res = await api.fileOps({ action: 'delete-folder', collection, folder });
      const removed = typeof res.removed === 'number' ? res.removed : 0;
      setStatus(`폴더 삭제: ${folder} (파일 ${removed}개)`, 'ok');
      await this.onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('폴더 삭제 실패: ' + msg, 'error');
    }
  }
}
