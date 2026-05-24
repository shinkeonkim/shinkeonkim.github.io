import type { CollectionName, Ext } from './state';

export interface TreeEntry {
  name: string;
  type: 'file' | 'folder';
  slug: string;
  ext?: Ext;
  children?: TreeEntry[];
}

export interface FilesResponse {
  collections: CollectionName[];
  tree: Record<CollectionName, TreeEntry[]>;
}

export interface FileLoadResponse {
  collection: CollectionName;
  slug: string;
  content: string;
  ext: Ext;
}

export interface SaveResponse {
  ok: boolean;
  path: string;
  bytes: number;
}

export interface UploadResponse {
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface FetchResponse {
  path: string;
  sourceUrl: string;
  size: number;
  type: string;
}

export interface GitFile {
  path: string;
  staged: boolean;
  status: string;
  allowed: boolean;
}

export interface GitStatusPayload {
  branch: string | null;
  ahead: number;
  behind: number;
  hasRemote: boolean;
  files: GitFile[];
}

export interface SourceSummary {
  id: string;
  title: string;
  type: string;
  author?: string;
  publisher?: string;
  year?: number;
  url?: string;
  aliases: string[];
  tags: string[];
}

async function jsonRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status}`);
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error ?? `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

export const api = {
  files(): Promise<FilesResponse> {
    return jsonRequest<FilesResponse>('/_editor/api/files');
  },
  loadFile(collection: CollectionName, slug: string): Promise<FileLoadResponse> {
    const q = new URLSearchParams({ collection, slug });
    return jsonRequest<FileLoadResponse>(`/_editor/api/file?${q.toString()}`);
  },
  saveFile(payload: {
    collection: CollectionName;
    slug: string;
    ext: Ext;
    content: string;
  }): Promise<SaveResponse> {
    return jsonRequest<SaveResponse>('/_editor/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  render(payload: {
    content: string;
    ext: Ext;
  }): Promise<{ html: string; frontmatter: unknown; componentNames: string[] }> {
    return jsonRequest('/_editor/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  upload(file: File): Promise<UploadResponse> {
    const fd = new FormData();
    fd.append('file', file);
    return jsonRequest<UploadResponse>('/_editor/api/upload', { method: 'POST', body: fd });
  },
  fetchImage(url: string): Promise<FetchResponse> {
    return jsonRequest<FetchResponse>('/_editor/api/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  },
  fileOps(payload: Record<string, unknown>): Promise<{ ok: boolean } & Record<string, unknown>> {
    return jsonRequest('/_editor/api/ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  gitStatus(): Promise<{ ok: boolean; status: GitStatusPayload }> {
    return jsonRequest('/_editor/api/git?action=status');
  },
  gitDiff(file: string): Promise<{ ok: boolean; diff: string }> {
    const q = new URLSearchParams({ action: 'diff', file });
    return jsonRequest(`/_editor/api/git?${q.toString()}`);
  },
  gitCommit(
    files: string[],
    message: string,
  ): Promise<{ ok: boolean; committed: string; files: string[] }> {
    return jsonRequest('/_editor/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'commit', files, message }),
    });
  },
  gitPush(): Promise<{ ok: boolean; output: string }> {
    return jsonRequest('/_editor/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'push' }),
    });
  },
  gitFetch(): Promise<{ ok: boolean; output: string }> {
    return jsonRequest('/_editor/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetch' }),
    });
  },
  gitPull(): Promise<{ ok: boolean; output: string }> {
    return jsonRequest('/_editor/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pull' }),
    });
  },
  gitAmend(
    files: string[],
    message?: string,
  ): Promise<{ ok: boolean; committed: string; files: string[] }> {
    return jsonRequest('/_editor/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'amend', files, message }),
    });
  },
  gitBranches(): Promise<{ ok: boolean; branches: { current: string; all: string[] } }> {
    return jsonRequest('/_editor/api/git?action=branches');
  },
  listSources(): Promise<{ sources: SourceSummary[] }> {
    return jsonRequest<{ sources: SourceSummary[] }>('/_editor/api/sources');
  },
  urlPreview(
    url: string,
    force = false,
  ): Promise<{ preview: UrlPreviewResponse; cached: boolean }> {
    const q = new URLSearchParams({ url });
    if (force) q.set('force', '1');
    return jsonRequest(`/_editor/api/url-preview?${q.toString()}`);
  },
};

export interface UrlPreviewResponse {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  fetchedAt: string;
  error?: string;
}
