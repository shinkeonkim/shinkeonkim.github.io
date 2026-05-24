import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';

const REPO_ROOT = process.cwd();
const ALLOWED_PREFIXES = ['src/content/', 'src/lib/taxonomy.ts', 'public/uploads/'];

let _git: SimpleGit | null = null;
function git(): SimpleGit {
  if (!_git) _git = simpleGit({ baseDir: REPO_ROOT });
  return _git;
}

export interface GitFileStatus {
  path: string;
  staged: boolean;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  allowed: boolean;
}

export interface GitStatus {
  branch: string | null;
  ahead: number;
  behind: number;
  hasRemote: boolean;
  files: GitFileStatus[];
}

function isAllowed(p: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix));
}

function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/');
}

export async function getStatus(): Promise<GitStatus> {
  const s = await git().status();
  const files: GitFileStatus[] = [];
  const seen = new Set<string>();
  function add(p: string, status: GitFileStatus['status'], staged: boolean) {
    const norm = normalizeRel(p);
    const key = staged + ':' + norm;
    if (seen.has(key)) return;
    seen.add(key);
    files.push({ path: norm, staged, status, allowed: isAllowed(norm) });
  }
  for (const f of s.staged) add(f, 'modified', true);
  for (const f of s.created) add(f, 'added', true);
  for (const f of s.deleted) add(f, 'deleted', true);
  for (const f of s.renamed) add(`${f.from} → ${f.to}`, 'renamed', true);
  for (const f of s.modified) add(f, 'modified', false);
  for (const f of s.not_added) add(f, 'untracked', false);
  for (const f of s.conflicted) add(f, 'conflicted', false);

  const remotes = await git()
    .getRemotes()
    .catch(() => []);
  const hasRemote = remotes.length > 0;

  return {
    branch: s.current,
    ahead: s.ahead,
    behind: s.behind,
    hasRemote,
    files,
  };
}

export async function getDiff(filePath: string): Promise<string> {
  const norm = normalizeRel(filePath);
  if (!isAllowed(norm)) throw new Error('file not in allowed scope');
  const absolute = path.resolve(REPO_ROOT, norm);
  const rel = path.relative(REPO_ROOT, absolute);
  if (rel.startsWith('..')) throw new Error('path outside repo');
  return git().diff(['--', norm]);
}

export async function commit(
  files: string[],
  message: string,
): Promise<{ committed: string; files: string[] }> {
  if (!message.trim()) throw new Error('commit message required');
  if (files.length === 0) throw new Error('no files selected');
  const filtered: string[] = [];
  for (const raw of files) {
    const norm = normalizeRel(raw);
    if (!isAllowed(norm)) throw new Error(`not allowed: ${norm}`);
    filtered.push(norm);
  }
  await git().add(filtered);
  const result = await git().commit(message, filtered);
  return { committed: result.commit, files: filtered };
}

export async function push(): Promise<{ pushed: boolean; output: string }> {
  const remotes = await git().getRemotes();
  if (remotes.length === 0) throw new Error('no git remote configured');
  const result = await git().push();
  const output =
    (result.pushed ?? []).map((p) => `${p.local} → ${p.remote}`).join('\n') || 'push complete';
  return { pushed: true, output };
}

export async function fetchOrigin(): Promise<{ output: string }> {
  const remotes = await git().getRemotes();
  if (remotes.length === 0) throw new Error('no git remote configured');
  const result = await git().fetch();
  const lines: string[] = [];
  if (Array.isArray(result.updated) && result.updated.length > 0) {
    lines.push(`updated ${result.updated.length} ref(s)`);
  }
  if (Array.isArray(result.deleted) && result.deleted.length > 0) {
    lines.push(`deleted ${result.deleted.length} ref(s)`);
  }
  if (lines.length === 0) lines.push('no updates');
  return { output: lines.join('\n') };
}

export async function pull(): Promise<{ output: string }> {
  const remotes = await git().getRemotes();
  if (remotes.length === 0) throw new Error('no git remote configured');
  const result = await git().pull(['--ff-only']);
  const changed = Array.isArray(result.files) ? result.files.length : 0;
  const summary = `pull complete (${changed} file change${changed === 1 ? '' : 's'})`;
  return { output: summary };
}

export async function amendCommit(
  files: string[],
  message?: string,
): Promise<{ committed: string; files: string[] }> {
  const filtered: string[] = [];
  for (const raw of files) {
    const norm = normalizeRel(raw);
    if (!isAllowed(norm)) throw new Error(`not allowed: ${norm}`);
    filtered.push(norm);
  }
  if (filtered.length > 0) {
    await git().add(filtered);
  }
  const args = ['commit', '--amend'];
  if (message && message.trim()) {
    args.push('-m', message.trim());
  } else {
    args.push('--no-edit');
  }
  await git().raw(args);
  const sha = (await git().revparse(['HEAD'])).trim();
  return { committed: sha, files: filtered };
}

export interface BranchSummary {
  current: string;
  all: string[];
}

export async function listBranches(): Promise<BranchSummary> {
  const result = await git().branchLocal();
  return { current: result.current, all: result.all };
}
