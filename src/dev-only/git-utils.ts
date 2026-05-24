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

export interface Hunk {
  index: number;
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  body: string;
}

export interface FileHunks {
  fileHeader: string;
  hunks: Hunk[];
}

const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export async function getFileHunks(filePath: string): Promise<FileHunks> {
  const norm = normalizeRel(filePath);
  if (!isAllowed(norm)) throw new Error('file not in allowed scope');
  const raw = await git().diff(['--no-color', '--no-prefix', '--', norm]);
  if (!raw) return { fileHeader: '', hunks: [] };
  const lines = raw.split('\n');
  let fileHeader = '';
  let headerEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('@@')) {
      headerEnd = i;
      break;
    }
    fileHeader += lines[i] + '\n';
  }
  const hunks: Hunk[] = [];
  let current: Hunk | null = null;
  for (let i = headerEnd; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('@@')) {
      if (current) hunks.push(current);
      const m = HUNK_HEADER_RE.exec(line);
      if (!m) continue;
      current = {
        index: hunks.length,
        header: line,
        oldStart: Number(m[1]),
        oldLines: Number(m[2] ?? '1'),
        newStart: Number(m[3]),
        newLines: Number(m[4] ?? '1'),
        body: line + '\n',
      };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) hunks.push(current);
  return { fileHeader, hunks };
}

export async function commitHunks(
  filePath: string,
  hunkIndexes: number[],
  message: string,
): Promise<{ committed: string; file: string }> {
  if (!message.trim()) throw new Error('commit message required');
  if (hunkIndexes.length === 0) throw new Error('no hunks selected');
  const norm = normalizeRel(filePath);
  if (!isAllowed(norm)) throw new Error('file not in allowed scope');
  const { fileHeader, hunks } = await getFileHunks(norm);
  const selectedHunks = hunkIndexes
    .filter((i) => i >= 0 && i < hunks.length)
    .map((i) => hunks[i]);
  if (selectedHunks.length === 0) throw new Error('no valid hunks');
  const patch = fileHeader + selectedHunks.map((h) => h.body).join('');
  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', ['apply', '--cached', '--whitespace=nowarn', '-'], { cwd: REPO_ROOT });
    let stderr = '';
    child.stderr.on('data', (b) => {
      stderr += b.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git apply failed: ${stderr.trim() || `exit ${code}`}`));
    });
    child.stdin.write(patch);
    child.stdin.end();
  });
  const result = await git().commit(message);
  return { committed: result.commit, file: norm };
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

function validateBranchName(name: string): void {
  if (!name || !/^[A-Za-z0-9._\/-]{1,80}$/.test(name)) {
    throw new Error(`invalid branch name: ${name}`);
  }
}

export async function checkoutBranch(name: string): Promise<{ branch: string }> {
  validateBranchName(name);
  const status = await git().status();
  if (!status.isClean()) {
    throw new Error('working tree is dirty — commit or stash before switching');
  }
  await git().checkout(name);
  const after = await git().status();
  return { branch: after.current ?? name };
}

export async function createBranch(name: string, checkout: boolean): Promise<{ branch: string }> {
  validateBranchName(name);
  if (checkout) await git().checkoutLocalBranch(name);
  else await git().branch([name]);
  const after = await git().status();
  return { branch: after.current ?? name };
}

export interface StashEntry {
  index: number;
  message: string;
}

export async function stashList(): Promise<StashEntry[]> {
  const result = await git().stashList();
  return result.all.map((entry, index) => ({
    index,
    message: entry.message ?? '(no message)',
  }));
}

export async function stashPush(message: string): Promise<{ output: string }> {
  const trimmed = message.trim();
  if (!/^[\w\sA-Za-z가-힣.,:\-_/()]*$/.test(trimmed)) {
    throw new Error('invalid stash message');
  }
  const args = trimmed ? ['stash', 'push', '-m', trimmed] : ['stash', 'push'];
  const output = await git().raw(args);
  return { output: output.trim() || 'stashed' };
}

export async function stashPop(index = 0): Promise<{ output: string }> {
  if (!Number.isInteger(index) || index < 0 || index > 99) {
    throw new Error('invalid stash index');
  }
  const output = await git().raw(['stash', 'pop', `stash@{${index}}`]);
  return { output: output.trim() || 'popped' };
}

export async function stashDrop(index: number): Promise<{ output: string }> {
  if (!Number.isInteger(index) || index < 0 || index > 99) {
    throw new Error('invalid stash index');
  }
  const output = await git().raw(['stash', 'drop', `stash@{${index}}`]);
  return { output: output.trim() || 'dropped' };
}
