import { api, type TreeEntry } from './api';
import { escapeHtml } from './utils';
import type { CollectionName, CurrentFile, Ext } from './state';

export interface DraggedFile {
  type: 'file';
  collection: CollectionName;
  slug: string;
  ext: Ext;
}

export interface DraggedFolder {
  type: 'folder';
  collection: CollectionName;
  folder: string;
}

export type DraggedItem = DraggedFile | DraggedFolder;

export interface DropTarget {
  collection: CollectionName;
  folder: string;
}

export interface TreeHandlers {
  onSelectFile: (collection: CollectionName, slug: string) => void;
  onContextFolder: (collection: CollectionName, folder: string, anchor: HTMLElement) => void;
  onContextFile: (collection: CollectionName, slug: string, anchor: HTMLElement) => void;
  onNewFile: (collection: CollectionName, folder: string) => void;
  onNewFolder: (collection: CollectionName, folder: string) => void;
  onRenameFileInline: (collection: CollectionName, slug: string, ext: Ext, newBaseName: string) => Promise<void>;
  onRenameFolderInline: (collection: CollectionName, folder: string, newName: string) => Promise<void>;
  onDropItem: (item: DraggedItem, target: DropTarget) => Promise<void>;
}

const STORAGE_KEY = 'editor-tree-expanded';
const DRAG_MIME = 'application/x-editor-item';

export class FileTree {
  private root: HTMLElement;
  private handlers: TreeHandlers;
  private expanded: Set<string>;
  private currentSelection: CurrentFile | null = null;
  private treeData: Record<CollectionName, TreeEntry[]> | null = null;
  private inlineEditing: HTMLInputElement | null = null;

  constructor(root: HTMLElement, handlers: TreeHandlers) {
    this.root = root;
    this.handlers = handlers;
    this.expanded = this.loadExpanded();
  }

  async refresh(): Promise<void> {
    const data = await api.files();
    this.treeData = data.tree;
    this.render();
  }

  setSelection(file: CurrentFile | null): void {
    this.currentSelection = file;
    this.updateActiveStates();
  }

  private loadExpanded(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  private persistExpanded(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.expanded)));
    } catch {
      return;
    }
  }

  private folderKey(collection: CollectionName, folder: string): string {
    return `${collection}::${folder}`;
  }

  private render(): void {
    if (!this.treeData) return;
    const collections: CollectionName[] = ['posts', 'notes', 'wiki'];
    const parts: string[] = [];
    for (const collection of collections) {
      const entries = this.treeData[collection] ?? [];
      parts.push(this.renderCollection(collection, entries));
    }
    this.root.innerHTML = parts.join('');
    this.attachListeners();
    this.updateActiveStates();
  }

  private renderCollection(collection: CollectionName, entries: TreeEntry[]): string {
    const collectionKey = this.folderKey(collection, '');
    const isOpen = this.expanded.has(collectionKey);
    const childrenHtml = entries.map((e) => this.renderEntry(collection, e, 0)).join('');
    return `
      <section class="editor-tree-collection" data-collection-section="${collection}">
        <header class="editor-tree-collection-header"
                data-tree-toggle
                data-folder=""
                data-collection="${collection}"
                data-drop-target
                aria-expanded="${isOpen}">
          <span class="editor-tree-chevron" aria-hidden="true">${isOpen ? '▾' : '▸'}</span>
          <span class="editor-tree-name">${collection}</span>
          <span class="editor-tree-collection-actions">
            <button type="button" class="editor-tree-action" data-tree-new-file data-collection="${collection}" data-folder="" title="새 파일">📄+</button>
            <button type="button" class="editor-tree-action" data-tree-new-folder data-collection="${collection}" data-folder="" title="새 폴더">📁+</button>
          </span>
        </header>
        <div class="editor-tree-collection-body" ${isOpen ? '' : 'hidden'}>
          ${childrenHtml || '<p class="editor-tree-empty">(비어 있음)</p>'}
        </div>
      </section>
    `;
  }

  private renderEntry(collection: CollectionName, entry: TreeEntry, depth: number): string {
    const indent = depth * 12 + 6;
    if (entry.type === 'folder') {
      const key = this.folderKey(collection, entry.slug);
      const isOpen = this.expanded.has(key);
      const children = (entry.children ?? []).map((c) => this.renderEntry(collection, c, depth + 1)).join('');
      return `
        <div class="editor-tree-folder" data-folder-slug="${escapeHtml(entry.slug)}">
          <div class="editor-tree-row editor-tree-folder-row"
               style="padding-left:${indent}px"
               draggable="true"
               data-tree-toggle
               data-tree-folder
               data-drop-target
               data-collection="${collection}"
               data-folder="${escapeHtml(entry.slug)}"
               aria-expanded="${isOpen}">
            <span class="editor-tree-chevron" aria-hidden="true">${isOpen ? '▾' : '▸'}</span>
            <span class="editor-tree-icon">📁</span>
            <span class="editor-tree-name" data-tree-name>${escapeHtml(entry.name)}</span>
            <span class="editor-tree-row-actions">
              <button type="button" class="editor-tree-action" data-tree-new-file data-collection="${collection}" data-folder="${escapeHtml(entry.slug)}" title="새 파일">📄+</button>
              <button type="button" class="editor-tree-action" data-tree-new-folder data-collection="${collection}" data-folder="${escapeHtml(entry.slug)}" title="새 하위 폴더">📁+</button>
              <button type="button" class="editor-tree-action" data-tree-folder-menu data-collection="${collection}" data-folder="${escapeHtml(entry.slug)}" title="더보기">⋯</button>
            </span>
          </div>
          <div class="editor-tree-children" ${isOpen ? '' : 'hidden'}>${children}</div>
        </div>
      `;
    }
    const slug = entry.slug;
    const ext = entry.ext ?? '.md';
    return `
      <div class="editor-tree-row editor-tree-file-row"
           style="padding-left:${indent + 16}px"
           draggable="true"
           data-tree-file
           data-collection="${collection}"
           data-slug="${escapeHtml(slug)}"
           data-ext="${ext}">
        <span class="editor-tree-icon">📄</span>
        <span class="editor-tree-name" data-tree-name>${escapeHtml(entry.name)}</span>
        <span class="editor-tree-row-actions">
          <button type="button" class="editor-tree-action" data-tree-file-menu data-collection="${collection}" data-slug="${escapeHtml(slug)}" title="더보기">⋯</button>
        </span>
      </div>
    `;
  }

  private isInsideAction(target: EventTarget | null): boolean {
    return !!(target instanceof Element && target.closest('[data-tree-new-file], [data-tree-new-folder], [data-tree-folder-menu], [data-tree-file-menu], .editor-tree-name-input'));
  }

  private attachListeners(): void {
    this.root.querySelectorAll<HTMLElement>('[data-tree-toggle]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (this.isInsideAction(e.target)) return;
        if (this.inlineEditing) return;
        const collection = el.dataset.collection as CollectionName;
        const folder = el.dataset.folder ?? '';
        const key = this.folderKey(collection, folder);
        if (this.expanded.has(key)) this.expanded.delete(key);
        else this.expanded.add(key);
        this.persistExpanded();
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-tree-file]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (this.isInsideAction(e.target)) return;
        if (this.inlineEditing) return;
        const collection = el.dataset.collection as CollectionName;
        const slug = el.dataset.slug ?? '';
        this.handlers.onSelectFile(collection, slug);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-tree-new-file]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const collection = el.dataset.collection as CollectionName;
        const folder = el.dataset.folder ?? '';
        this.handlers.onNewFile(collection, folder);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-tree-new-folder]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const collection = el.dataset.collection as CollectionName;
        const folder = el.dataset.folder ?? '';
        this.handlers.onNewFolder(collection, folder);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-tree-file-menu]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const collection = el.dataset.collection as CollectionName;
        const slug = el.dataset.slug ?? '';
        this.handlers.onContextFile(collection, slug, el);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-tree-folder-menu]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const collection = el.dataset.collection as CollectionName;
        const folder = el.dataset.folder ?? '';
        this.handlers.onContextFolder(collection, folder, el);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-tree-name]').forEach((nameEl) => {
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startInlineEdit(nameEl);
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-tree-file], [data-tree-folder]').forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        const data = this.serializeDragSource(el);
        if (!data || !e.dataTransfer) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify(data));
        el.classList.add('is-dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('is-dragging'));
    });

    this.root.querySelectorAll<HTMLElement>('[data-drop-target]').forEach((el) => {
      el.addEventListener('dragover', (e) => {
        if (!e.dataTransfer?.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('is-drop-hover');
      });
      el.addEventListener('dragleave', () => el.classList.remove('is-drop-hover'));
      el.addEventListener('drop', (e) => {
        el.classList.remove('is-drop-hover');
        const raw = e.dataTransfer?.getData(DRAG_MIME);
        if (!raw) return;
        e.preventDefault();
        let item: DraggedItem;
        try {
          item = JSON.parse(raw) as DraggedItem;
        } catch {
          return;
        }
        const target: DropTarget = {
          collection: el.dataset.collection as CollectionName,
          folder: el.dataset.folder ?? '',
        };
        void this.handlers.onDropItem(item, target);
      });
    });
  }

  private serializeDragSource(el: HTMLElement): DraggedItem | null {
    const collection = el.dataset.collection as CollectionName | undefined;
    if (!collection) return null;
    if (el.dataset.treeFile !== undefined) {
      const slug = el.dataset.slug ?? '';
      const ext = (el.dataset.ext ?? '.md') as Ext;
      return { type: 'file', collection, slug, ext };
    }
    if (el.dataset.treeFolder !== undefined) {
      const folder = el.dataset.folder ?? '';
      return { type: 'folder', collection, folder };
    }
    return null;
  }

  private startInlineEdit(nameEl: HTMLElement): void {
    if (this.inlineEditing) return;
    const row = nameEl.closest<HTMLElement>('[data-tree-file], [data-tree-folder]');
    if (!row) return;
    const isFile = row.dataset.treeFile !== undefined;
    const original = nameEl.textContent ?? '';
    const collection = row.dataset.collection as CollectionName;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = original;
    input.className = 'editor-tree-name-input';
    input.spellcheck = false;
    const parent = nameEl.parentElement;
    if (!parent) return;
    parent.replaceChild(input, nameEl);
    this.inlineEditing = input;
    input.focus();
    if (isFile) {
      const ext = (row.dataset.ext ?? '.md') as Ext;
      const dot = original.length - ext.length;
      input.setSelectionRange(0, dot > 0 ? dot : original.length);
    } else {
      input.select();
    }

    let settled = false;
    const cleanup = (): void => {
      this.inlineEditing = null;
      input.replaceWith(nameEl);
    };
    const commit = async (): Promise<void> => {
      if (settled) return;
      settled = true;
      const value = input.value.trim();
      cleanup();
      if (!value || value === original) return;
      if (isFile) {
        const slug = row.dataset.slug ?? '';
        const ext = (row.dataset.ext ?? '.md') as Ext;
        await this.handlers.onRenameFileInline(collection, slug, ext, value);
      } else {
        const folder = row.dataset.folder ?? '';
        await this.handlers.onRenameFolderInline(collection, folder, value);
      }
    };
    const cancel = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
    };
    input.addEventListener('blur', () => void commit());
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        void commit();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        cancel();
      }
    });
    input.addEventListener('click', (ev) => ev.stopPropagation());
    input.addEventListener('dblclick', (ev) => ev.stopPropagation());
  }

  private updateActiveStates(): void {
    const cur = this.currentSelection;
    this.root.querySelectorAll<HTMLElement>('[data-tree-file]').forEach((el) => {
      const match = !!cur && el.dataset.collection === cur.collection && el.dataset.slug === cur.slug;
      el.classList.toggle('is-active', match);
    });
  }

  expandTo(file: CurrentFile): void {
    const parts = file.slug.split('/');
    parts.pop();
    let acc = '';
    this.expanded.add(this.folderKey(file.collection, ''));
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p;
      this.expanded.add(this.folderKey(file.collection, acc));
    }
    this.persistExpanded();
    this.render();
  }
}
