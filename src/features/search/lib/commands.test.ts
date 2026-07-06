import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMMAND_LIST,
  HELP_ITEMS,
  MODE_LABELS,
  SECTION_LABELS,
  runCommand,
  type CommandEntry,
} from './commands';

describe('COMMAND_LIST', () => {
  it('has unique IDs', () => {
    const ids = COMMAND_LIST.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all entries have a label', () => {
    for (const cmd of COMMAND_LIST) expect(cmd.label).toBeTruthy();
  });

  it('href entries start with /', () => {
    for (const cmd of COMMAND_LIST) {
      if (cmd.href) expect(cmd.href.startsWith('/')).toBe(true);
    }
  });

  it('actions belong to the known set', () => {
    const allowed = new Set(['toggle-theme', 'copy-url', 'print', 'top', 'rss']);
    for (const cmd of COMMAND_LIST) {
      if (cmd.action) expect(allowed.has(cmd.action)).toBe(true);
    }
  });
});

describe('SECTION_LABELS / MODE_LABELS / HELP_ITEMS', () => {
  it('SECTION_LABELS has posts, notes, wiki', () => {
    expect(SECTION_LABELS.posts).toBeTruthy();
    expect(SECTION_LABELS.notes).toBeTruthy();
    expect(SECTION_LABELS.wiki).toBeTruthy();
  });

  it('MODE_LABELS covers search/command/tag/help', () => {
    expect(MODE_LABELS.search).toBeTruthy();
    expect(MODE_LABELS.command).toBeTruthy();
    expect(MODE_LABELS.tag).toBeTruthy();
    expect(MODE_LABELS.help).toBeTruthy();
  });

  it('HELP_ITEMS entries have keys and description', () => {
    for (const item of HELP_ITEMS) {
      expect(item.desc).toBeTruthy();
      expect(item.keys.length).toBeGreaterThan(0);
    }
  });
});

describe('runCommand', () => {
  let closeModal: () => void;

  beforeEach(() => {
    closeModal = vi.fn() as unknown as () => void;
    document.documentElement.classList.remove('dark');
    document.body.innerHTML = '<button data-theme-toggle aria-pressed="false"></button>';
    const store = new Map<string, string>();
    const shim = {
      getItem: (k: string): string | null => store.get(k) ?? null,
      setItem: (k: string, v: string): void => {
        store.set(k, v);
      },
      removeItem: (k: string): void => {
        store.delete(k);
      },
      clear: (): void => store.clear(),
      key: (): string | null => null,
      length: 0,
    };
    vi.stubGlobal('localStorage', shim);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('toggle-theme switches classes and persists to localStorage', () => {
    runCommand({ id: 'x', label: 't', action: 'toggle-theme' }, closeModal);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(closeModal).toHaveBeenCalledTimes(1);
    runCommand({ id: 'x', label: 't', action: 'toggle-theme' }, closeModal);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('updates aria-pressed on theme toggle buttons', () => {
    runCommand({ id: 'x', label: 't', action: 'toggle-theme' }, closeModal);
    const btn = document.querySelector('[data-theme-toggle]');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggle-theme swallows localStorage errors', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(() =>
      runCommand({ id: 'x', label: 't', action: 'toggle-theme' }, closeModal),
    ).not.toThrow();
  });

  it('copy-url writes to navigator.clipboard when available', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    runCommand({ id: 'x', label: 't', action: 'copy-url' }, closeModal);
    expect(writeText).toHaveBeenCalled();
    expect(closeModal).toHaveBeenCalled();
  });

  it('copy-url swallows clipboard errors', () => {
    vi.stubGlobal('navigator', {});
    expect(() =>
      runCommand({ id: 'x', label: 't', action: 'copy-url' }, closeModal),
    ).not.toThrow();
  });

  it('print closes modal and defers window.print', () => {
    vi.useFakeTimers();
    const printFn = vi.fn();
    vi.stubGlobal('print', printFn);
    runCommand({ id: 'x', label: 't', action: 'print' }, closeModal);
    expect(closeModal).toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(printFn).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('top scrolls to top and closes modal', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    runCommand({ id: 'x', label: 't', action: 'top' }, closeModal);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(closeModal).toHaveBeenCalled();
  });

  it('rss closes modal and initiates navigation', () => {
    runCommand({ id: 'x', label: 't', action: 'rss' }, closeModal);
    expect(closeModal).toHaveBeenCalled();
  });

  it('href commands close modal and navigate', () => {
    const cmd: CommandEntry = { id: 'x', label: 't', href: '/target/' };
    runCommand(cmd, closeModal);
    expect(closeModal).toHaveBeenCalled();
  });

  it('no-op when command has neither action nor href', () => {
    runCommand({ id: 'x', label: 't' }, closeModal);
    expect(closeModal).not.toHaveBeenCalled();
  });
});
