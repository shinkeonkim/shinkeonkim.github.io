interface StoredProgress {
  completed: number[];
  startedAt: number;
  completedAt?: number;
}

declare global {
  interface Window {
    __courseProgressBound?: string;
  }
}

function storageKey(courseId: string): string {
  return `course-progress:${courseId}`;
}

function load(courseId: string): StoredProgress {
  try {
    const raw = localStorage.getItem(storageKey(courseId));
    if (!raw) return { completed: [], startedAt: Date.now() };
    const parsed = JSON.parse(raw) as StoredProgress;
    if (!Array.isArray(parsed.completed)) parsed.completed = [];
    return parsed;
  } catch {
    return { completed: [], startedAt: Date.now() };
  }
}

function save(courseId: string, state: StoredProgress): void {
  try {
    localStorage.setItem(storageKey(courseId), JSON.stringify(state));
  } catch {
    // localStorage disabled
  }
}

function setupWithCourseId(courseId: string, root: HTMLElement): void {
  const chapters = Array.from(
    root.querySelectorAll<HTMLElement>('[data-course-chapter-index]'),
  );
  if (chapters.length === 0) return;
  const total = chapters.length;
  const wrap = root.querySelector<HTMLElement>('[data-course-progress-wrap]');
  const label = root.querySelector<HTMLElement>('[data-course-progress-label]');
  const percentEl = root.querySelector<HTMLElement>('[data-course-progress-percent]');
  const fill = root.querySelector<HTMLElement>('[data-course-progress-fill]');
  const bar = root.querySelector<HTMLElement>('[role="progressbar"]');
  const celebrate = root.querySelector<HTMLElement>('[data-course-celebrate]');

  if (wrap) wrap.hidden = false;

  const state = load(courseId);
  const completedSet = new Set<number>(state.completed);

  function render(): void {
    for (const el of chapters) {
      const idx = Number(el.dataset.courseChapterIndex);
      const done = completedSet.has(idx);
      el.classList.toggle('is-completed', done);
      const checkbox = el.querySelector<HTMLInputElement>('[data-course-chapter-checkbox]');
      if (checkbox) checkbox.checked = done;
    }
    const count = completedSet.size;
    if (label) label.textContent = `${count}/${total} 완료`;
    const percent = Math.round((count / total) * 100);
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (fill) fill.style.width = `${percent}%`;
    if (bar) bar.setAttribute('aria-valuenow', String(count));
    if (celebrate) celebrate.hidden = count < total;
  }

  render();

  for (const el of chapters) {
    const checkbox = el.querySelector<HTMLInputElement>('[data-course-chapter-checkbox]');
    if (!checkbox) continue;
    checkbox.addEventListener('change', () => {
      const idx = Number(el.dataset.courseChapterIndex);
      if (checkbox.checked) {
        completedSet.add(idx);
        if (!state.completedAt && completedSet.size === total) {
          state.completedAt = Date.now();
        }
      } else {
        completedSet.delete(idx);
        if (completedSet.size < total) state.completedAt = undefined;
      }
      state.completed = Array.from(completedSet).sort((a, b) => a - b);
      save(courseId, state);
      render();
    });
  }
}

function setupBadgeAutoComplete(): void {
  const badges = document.querySelectorAll<HTMLAnchorElement>('[data-course-badge]');
  if (badges.length === 0) return;
  for (const badge of badges) {
    const courseId = badge.dataset.courseBadge;
    const idxStr = badge.dataset.courseChapterIndex;
    if (!courseId || idxStr === undefined) continue;
    const idx = Number(idxStr);
    if (Number.isNaN(idx)) continue;
    const total = Number(badge.dataset.courseChapterTotal ?? 0);
    if (total <= 0) continue;
    const state = load(courseId);
    if (state.completed.includes(idx)) continue;
    state.completed = [...new Set([...state.completed, idx])].sort((a, b) => a - b);
    if (!state.completedAt && state.completed.length === total) {
      state.completedAt = Date.now();
    }
    save(courseId, state);
  }
}

export function setupCourseProgress(): void {
  const detailRoot = document.querySelector<HTMLElement>('[data-course-id]');
  if (detailRoot) {
    const courseId = detailRoot.dataset.courseId;
    if (courseId && window.__courseProgressBound !== courseId) {
      window.__courseProgressBound = courseId;
      setupWithCourseId(courseId, detailRoot);
    }
  }
  setupBadgeAutoComplete();
}
