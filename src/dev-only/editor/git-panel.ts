import { api, type GitFile, type GitStatusPayload } from './api';
import { confirmModal, openModal } from './modal';
import { setStatus } from './status';
import { escapeHtml } from './utils';

export class GitPanel {
  private root: HTMLElement;
  private status: GitStatusPayload | null = null;
  private selected = new Set<string>();
  private message = '';
  private amend = false;
  private busy = false;
  private branches: { current: string; all: string[] } | null = null;
  private stashes: { index: number; message: string }[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();
  }

  async refresh(): Promise<void> {
    try {
      const [statusRes, branchesRes, stashesRes] = await Promise.all([
        api.gitStatus(),
        api.gitBranches().catch(() => null),
        api.gitStashList().catch(() => null),
      ]);
      this.status = statusRes.status;
      if (branchesRes) this.branches = branchesRes.branches;
      this.stashes = stashesRes?.stashes ?? [];
      const allowedPaths = new Set(this.status.files.filter((f) => f.allowed).map((f) => f.path));
      for (const p of Array.from(this.selected)) if (!allowedPaths.has(p)) this.selected.delete(p);
      this.render();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.root.innerHTML = `<p class="git-panel-error">상태 가져오기 실패: ${escapeHtml(msg)}</p>`;
    }
  }

  open(): void {
    this.root.hidden = false;
    void this.refresh();
  }

  close(): void {
    this.root.hidden = true;
  }

  toggle(): void {
    if (this.root.hidden) this.open();
    else this.close();
  }

  private fileLabel(f: GitFile): string {
    const labels: Record<string, string> = {
      modified: '수정',
      added: '추가',
      deleted: '삭제',
      renamed: '이름 변경',
      untracked: '추적 안 됨',
      conflicted: '충돌',
    };
    return `${labels[f.status] ?? f.status}${f.staged ? ' · staged' : ''}`;
  }

  private render(): void {
    const s = this.status;
    if (!s) {
      this.root.innerHTML = '<p class="git-panel-loading">git 상태 가져오는 중…</p>';
      return;
    }
    const allowedFiles = s.files.filter((f) => f.allowed);
    const blockedFiles = s.files.filter((f) => !f.allowed);
    const branchInfo = s.branch
      ? `<strong>${escapeHtml(s.branch)}</strong>` +
        (s.ahead || s.behind ? ` <small>(↑${s.ahead} ↓${s.behind})</small>` : '')
      : '<em>(no branch)</em>';

    const branchSwitcher = this.branches
      ? `<div class="git-panel-branch-row">
          <label class="git-panel-branch-label">전환:
            <select data-git-branch-select>
              ${this.branches.all
                .map(
                  (b) => `<option value="${escapeHtml(b)}" ${b === this.branches?.current ? 'selected' : ''}>${escapeHtml(b)}</option>`,
                )
                .join('')}
            </select>
          </label>
          <button type="button" class="editor-btn editor-btn-small" data-git-new-branch>+ 새 브랜치</button>
        </div>`
      : '';

    const filesHtml =
      allowedFiles.length === 0
        ? '<p class="git-panel-empty">콘텐츠/리소스 파일에 변경 사항이 없습니다.</p>'
        : `<ul class="git-panel-files">
          ${allowedFiles
            .map(
              (f) => `<li class="git-panel-file">
                <label>
                  <input type="checkbox" data-git-file value="${escapeHtml(f.path)}" ${this.selected.has(f.path) ? 'checked' : ''} />
                  <span class="git-panel-status git-panel-status-${f.status}">${this.fileLabel(f)}</span>
                  <span class="git-panel-path">${escapeHtml(f.path)}</span>
                </label>
                <span class="git-panel-file-actions">
                  <button type="button" class="editor-btn editor-btn-small" data-git-diff data-file="${escapeHtml(f.path)}">diff</button>
                  ${f.status !== 'untracked' && f.status !== 'added' ? `<button type="button" class="editor-btn editor-btn-small" data-git-hunks data-file="${escapeHtml(f.path)}" title="선택한 hunk 만 커밋">hunks</button>` : ''}
                </span>
              </li>`,
            )
            .join('')}
        </ul>`;

    const blockedHtml =
      blockedFiles.length === 0
        ? ''
        : `<details class="git-panel-blocked">
          <summary>커밋 범위 밖 (${blockedFiles.length})</summary>
          <ul>${blockedFiles.map((f) => `<li><code>${escapeHtml(f.path)}</code> <small>${escapeHtml(this.fileLabel(f))}</small></li>`).join('')}</ul>
        </details>`;

    this.root.innerHTML = `
      <header class="git-panel-header">
        <div>
          <strong>Git 패널</strong>
          <span class="git-panel-branch">브랜치: ${branchInfo}</span>
        </div>
        <div class="git-panel-actions">
          <button type="button" class="editor-btn editor-btn-small" data-git-refresh>↻ 새로고침</button>
          <button type="button" class="editor-btn editor-btn-small" data-git-close>✕ 닫기</button>
        </div>
      </header>
      ${branchSwitcher}
      ${this.renderStashSection()}
      ${filesHtml}
      ${blockedHtml}
      <div class="git-panel-commit">
        <label class="git-panel-message-label">
          <span>커밋 메시지</span>
          <textarea data-git-message rows="3" placeholder="요약 한 줄&#10;&#10;본문(선택)">${escapeHtml(this.message)}</textarea>
        </label>
        <label class="git-panel-amend-label">
          <input type="checkbox" data-git-amend-toggle ${this.amend ? 'checked' : ''} />
          마지막 커밋에 추가 (--amend, 메시지 비우면 그대로 유지)
        </label>
        <div class="git-panel-commit-actions">
          <button type="button" class="editor-btn editor-btn-primary" data-git-commit ${this.busy ? 'disabled' : ''}>
            ${this.amend ? '마지막 커밋 수정 (' + this.selected.size + ')' : '선택한 파일 커밋 (' + this.selected.size + ')'}
          </button>
          <button type="button" class="editor-btn" data-git-fetch ${s.hasRemote && !this.busy ? '' : 'disabled'}>
            ↓ fetch
          </button>
          <button type="button" class="editor-btn" data-git-pull ${s.hasRemote && !this.busy ? '' : 'disabled'}>
            ↓ pull (ff-only)
          </button>
          <button type="button" class="editor-btn" data-git-push ${s.hasRemote && !this.busy ? '' : 'disabled'}>
            ↑ push
          </button>
        </div>
      </div>
      <pre class="git-panel-output" data-git-output hidden></pre>
    `;
    this.bind();
  }

  private bind(): void {
    this.root.querySelectorAll<HTMLInputElement>('[data-git-file]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) this.selected.add(input.value);
        else this.selected.delete(input.value);
        const commitBtn = this.root.querySelector<HTMLButtonElement>('[data-git-commit]');
        if (commitBtn) commitBtn.textContent = `선택한 파일 커밋 (${this.selected.size})`;
      });
    });

    const messageEl = this.root.querySelector<HTMLTextAreaElement>('[data-git-message]');
    messageEl?.addEventListener('input', () => {
      this.message = messageEl.value;
    });

    const amendEl = this.root.querySelector<HTMLInputElement>('[data-git-amend-toggle]');
    amendEl?.addEventListener('change', () => {
      this.amend = amendEl.checked;
      this.render();
    });

    this.root
      .querySelector('[data-git-refresh]')
      ?.addEventListener('click', () => void this.refresh());
    this.root.querySelector('[data-git-close]')?.addEventListener('click', () => this.close());

    const branchSelect = this.root.querySelector<HTMLSelectElement>('[data-git-branch-select]');
    branchSelect?.addEventListener('change', async () => {
      const target = branchSelect.value;
      if (!this.branches || target === this.branches.current) return;
      const confirmed = await confirmModal({
        title: `브랜치 전환: ${target}`,
        description: `${this.branches.current} → ${target} 로 체크아웃합니다.\n작업 트리가 깨끗해야 합니다 (커밋 또는 stash 필요).`,
        confirmLabel: '전환',
      });
      if (!confirmed) {
        branchSelect.value = this.branches.current;
        return;
      }
      this.busy = true;
      this.render();
      try {
        const res = await api.gitCheckout(target);
        setStatus(`브랜치 전환됨: ${res.branch}`, 'ok');
        await this.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('체크아웃 실패: ' + msg, 'error');
        this.showOutput(`❌ ${msg}`);
      } finally {
        this.busy = false;
      }
    });

    this.root.querySelector('[data-git-stash-push]')?.addEventListener('click', async () => {
      const message = window.prompt('stash 메시지 (선택)', '') ?? '';
      this.busy = true;
      this.render();
      try {
        const res = await api.gitStashPush(message);
        setStatus('stash 완료', 'ok');
        this.showOutput(`📦 ${res.output}`);
        await this.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('stash 실패: ' + msg, 'error');
        this.showOutput(`❌ ${msg}`);
      } finally {
        this.busy = false;
      }
    });

    this.root.querySelectorAll<HTMLElement>('[data-git-stash-pop]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.stashIndex ?? '0');
        this.busy = true;
        this.render();
        try {
          const res = await api.gitStashPop(idx);
          setStatus(`stash@{${idx}} pop 완료`, 'ok');
          this.showOutput(`📦 ${res.output}`);
          await this.refresh();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus('stash pop 실패: ' + msg, 'error');
          this.showOutput(`❌ ${msg}`);
        } finally {
          this.busy = false;
        }
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-git-stash-drop]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.stashIndex ?? '0');
        const confirmed = await confirmModal({
          title: `stash@{${idx}} drop`,
          description: '이 stash 를 삭제합니다. 되돌릴 수 없습니다.',
          confirmLabel: '삭제',
          danger: true,
        });
        if (!confirmed) return;
        this.busy = true;
        this.render();
        try {
          await api.gitStashDrop(idx);
          setStatus(`stash@{${idx}} 삭제됨`, 'ok');
          await this.refresh();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus('stash drop 실패: ' + msg, 'error');
          this.showOutput(`❌ ${msg}`);
        } finally {
          this.busy = false;
        }
      });
    });

    this.root.querySelector('[data-git-new-branch]')?.addEventListener('click', async () => {
      const name = window.prompt('새 브랜치 이름 (예: feature/x)', '');
      if (!name) return;
      this.busy = true;
      this.render();
      try {
        const res = await api.gitCreateBranch(name, true);
        setStatus(`새 브랜치 생성/체크아웃: ${res.branch}`, 'ok');
        await this.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('브랜치 생성 실패: ' + msg, 'error');
        this.showOutput(`❌ ${msg}`);
      } finally {
        this.busy = false;
      }
    });

    this.root.querySelectorAll<HTMLElement>('[data-git-diff]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const file = btn.dataset.file ?? '';
        try {
          const res = await api.gitDiff(file);
          await openModal({
            title: `diff: ${file}`,
            body: `<pre class="editor-modal-diff">${escapeHtml(res.diff || '(변경 없음)')}</pre>`,
            confirmLabel: '닫기',
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus('diff 실패: ' + msg, 'error');
        }
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-git-hunks]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const file = btn.dataset.file ?? '';
        try {
          const res = await api.gitHunks(file);
          if (res.hunks.length === 0) {
            setStatus('hunk 가 없습니다 (untracked 또는 binary 파일)', 'error');
            return;
          }
          const body = `
            <p class="git-hunks-summary">${res.hunks.length}개 hunk · 체크된 hunk만 별도 커밋합니다.</p>
            <ol class="git-hunks-list">
              ${res.hunks
                .map(
                  (h) => `<li class="git-hunks-item">
                    <label class="git-hunks-label">
                      <input type="checkbox" data-hunk-index="${h.index}" checked />
                      <code>${escapeHtml(h.header)}</code>
                    </label>
                    <pre class="git-hunks-body">${escapeHtml(h.body)}</pre>
                  </li>`,
                )
                .join('')}
            </ol>
            <label class="git-hunks-message">
              <span>커밋 메시지</span>
              <input type="text" data-hunk-message placeholder="요약" />
            </label>
          `;
          const result = await openModal({
            title: `부분 커밋: ${file}`,
            body,
            confirmLabel: '선택한 hunk 커밋',
            cancelLabel: '닫기',
          });
          if (!result.confirmed) return;
          const modalHost = document.getElementById('editor-modal-host');
          const checked = modalHost
            ? Array.from(
                modalHost.querySelectorAll<HTMLInputElement>('[data-hunk-index]:checked'),
              ).map((cb) => Number(cb.dataset.hunkIndex))
            : [];
          const message = (modalHost?.querySelector<HTMLInputElement>('[data-hunk-message]')?.value ?? '').trim();
          if (!message) {
            setStatus('커밋 메시지 필요', 'error');
            return;
          }
          if (checked.length === 0) {
            setStatus('선택된 hunk 없음', 'error');
            return;
          }
          this.busy = true;
          this.render();
          try {
            const commitRes = await api.gitCommitHunks(file, checked, message);
            setStatus(`부분 커밋 완료: ${commitRes.committed}`, 'ok');
            this.showOutput(`✅ partial commit ${commitRes.committed}\n${commitRes.file}`);
            await this.refresh();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatus('hunk 커밋 실패: ' + msg, 'error');
            this.showOutput(`❌ ${msg}`);
          } finally {
            this.busy = false;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus('hunks 가져오기 실패: ' + msg, 'error');
        }
      });
    });

    this.root.querySelector('[data-git-commit]')?.addEventListener('click', async () => {
      if (this.selected.size === 0) {
        setStatus('커밋할 파일을 선택하세요', 'error');
        return;
      }
      if (this.amend) {
        const confirmed = await confirmModal({
          title: '마지막 커밋 수정 (--amend)',
          description:
            `${this.selected.size}개 파일을 마지막 커밋에 추가합니다.\n` +
            (this.message.trim()
              ? `메시지를 새로 씁니다:\n${this.message.trim()}`
              : '메시지는 그대로 유지합니다.') +
            '\n\n이미 push 된 경우 force-push 가 필요할 수 있습니다.',
          confirmLabel: 'Amend',
        });
        if (!confirmed) return;
        this.busy = true;
        this.render();
        try {
          const res = await api.gitAmend(
            Array.from(this.selected),
            this.message.trim() || undefined,
          );
          setStatus(`amend 완료: ${res.committed}`, 'ok');
          this.selected.clear();
          this.message = '';
          this.amend = false;
          this.showOutput(`✅ amend ${res.committed}\n${res.files.join('\n')}`);
          await this.refresh();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus('amend 실패: ' + msg, 'error');
          this.showOutput(`❌ ${msg}`);
        } finally {
          this.busy = false;
        }
        return;
      }
      if (!this.message.trim()) {
        setStatus('커밋 메시지를 입력하세요', 'error');
        return;
      }
      const confirmed = await confirmModal({
        title: '커밋 진행',
        description: `${this.selected.size}개 파일을 커밋합니다.\n\n메시지: ${this.message.trim()}`,
        confirmLabel: '커밋',
      });
      if (!confirmed) return;
      this.busy = true;
      this.render();
      try {
        const res = await api.gitCommit(Array.from(this.selected), this.message.trim());
        setStatus(`커밋 완료: ${res.committed}`, 'ok');
        this.selected.clear();
        this.message = '';
        this.showOutput(`✅ commit ${res.committed}\n${res.files.join('\n')}`);
        await this.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('커밋 실패: ' + msg, 'error');
        this.showOutput(`❌ ${msg}`);
      } finally {
        this.busy = false;
      }
    });

    this.root.querySelector('[data-git-push]')?.addEventListener('click', async () => {
      const confirmed = await confirmModal({
        title: 'GitHub 으로 push',
        description: '현재 브랜치를 origin 으로 push 합니다. 진행할까요?',
        confirmLabel: 'Push',
      });
      if (!confirmed) return;
      this.busy = true;
      this.render();
      try {
        const res = await api.gitPush();
        setStatus('push 완료', 'ok');
        this.showOutput(`✅ pushed\n${res.output}`);
        await this.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('push 실패: ' + msg, 'error');
        this.showOutput(`❌ ${msg}`);
      } finally {
        this.busy = false;
      }
    });

    this.root.querySelector('[data-git-fetch]')?.addEventListener('click', async () => {
      this.busy = true;
      this.render();
      try {
        const res = await api.gitFetch();
        setStatus('fetch 완료', 'ok');
        this.showOutput(`✅ fetch\n${res.output}`);
        await this.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('fetch 실패: ' + msg, 'error');
        this.showOutput(`❌ ${msg}`);
      } finally {
        this.busy = false;
      }
    });

    this.root.querySelector('[data-git-pull]')?.addEventListener('click', async () => {
      const confirmed = await confirmModal({
        title: 'origin 에서 pull (ff-only)',
        description:
          '현재 브랜치를 origin 의 같은 브랜치로 fast-forward 합니다.\n' +
          '병합 충돌 시 자동 중단합니다. 진행할까요?',
        confirmLabel: 'Pull',
      });
      if (!confirmed) return;
      this.busy = true;
      this.render();
      try {
        const res = await api.gitPull();
        setStatus('pull 완료', 'ok');
        this.showOutput(`✅ pull\n${res.output}`);
        await this.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('pull 실패: ' + msg, 'error');
        this.showOutput(`❌ ${msg}`);
      } finally {
        this.busy = false;
      }
    });
  }

  private showOutput(text: string): void {
    const pre = this.root.querySelector<HTMLElement>('[data-git-output]');
    if (!pre) return;
    pre.hidden = false;
    pre.textContent = text;
  }

  private renderStashSection(): string {
    const hasChanges = (this.status?.files.length ?? 0) > 0;
    const stashList = this.stashes.length === 0
      ? ''
      : `<ul class="git-panel-stash-list">
          ${this.stashes
            .map(
              (s) => `<li class="git-panel-stash-item">
                <span class="git-panel-stash-msg" title="stash@{${s.index}}">${escapeHtml(s.message)}</span>
                <span class="git-panel-stash-actions">
                  <button type="button" class="editor-btn editor-btn-small" data-git-stash-pop data-stash-index="${s.index}">pop</button>
                  <button type="button" class="editor-btn editor-btn-small editor-btn-danger" data-git-stash-drop data-stash-index="${s.index}">drop</button>
                </span>
              </li>`,
            )
            .join('')}
        </ul>`;
    if (!hasChanges && this.stashes.length === 0) return '';
    return `<details class="git-panel-stash">
        <summary>📦 Stash (${this.stashes.length})</summary>
        ${hasChanges ? '<button type="button" class="editor-btn editor-btn-small" data-git-stash-push>현재 변경사항 stash</button>' : ''}
        ${stashList}
      </details>`;
  }
}
