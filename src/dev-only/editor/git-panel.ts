import { api, type GitFile, type GitStatusPayload } from './api';
import { confirmModal, openModal } from './modal';
import { setStatus } from './status';
import { escapeHtml } from './utils';

export class GitPanel {
  private root: HTMLElement;
  private status: GitStatusPayload | null = null;
  private selected = new Set<string>();
  private message = '';
  private busy = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.render();
  }

  async refresh(): Promise<void> {
    try {
      const res = await api.gitStatus();
      this.status = res.status;
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
                <button type="button" class="editor-btn editor-btn-small" data-git-diff data-file="${escapeHtml(f.path)}">diff</button>
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
      ${filesHtml}
      ${blockedHtml}
      <div class="git-panel-commit">
        <label class="git-panel-message-label">
          <span>커밋 메시지</span>
          <textarea data-git-message rows="3" placeholder="요약 한 줄&#10;&#10;본문(선택)">${escapeHtml(this.message)}</textarea>
        </label>
        <div class="git-panel-commit-actions">
          <button type="button" class="editor-btn editor-btn-primary" data-git-commit ${this.busy ? 'disabled' : ''}>
            선택한 파일 커밋 (${this.selected.size})
          </button>
          <button type="button" class="editor-btn" data-git-push ${s.hasRemote && !this.busy ? '' : 'disabled'}>
            origin 으로 push
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

    this.root
      .querySelector('[data-git-refresh]')
      ?.addEventListener('click', () => void this.refresh());
    this.root.querySelector('[data-git-close]')?.addEventListener('click', () => this.close());

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

    this.root.querySelector('[data-git-commit]')?.addEventListener('click', async () => {
      if (this.selected.size === 0) {
        setStatus('커밋할 파일을 선택하세요', 'error');
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
  }

  private showOutput(text: string): void {
    const pre = this.root.querySelector<HTMLElement>('[data-git-output]');
    if (!pre) return;
    pre.hidden = false;
    pre.textContent = text;
  }
}
