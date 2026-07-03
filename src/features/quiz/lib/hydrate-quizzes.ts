import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import Quiz from '@/features/quiz/ui/Quiz';
import type { QuizData } from '@/features/quiz/types';

declare global {
  interface Window {
    __quizzesBound?: boolean;
  }
}

function decodeAttribute(raw: string): string {
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function storageKeyFor(slug: string, index: number): string {
  return `${slug}#${index}`;
}

function hydratePlaceholder(el: HTMLElement, slug: string, index: number): void {
  if (el.dataset.quizHydrated === '1') return;
  el.dataset.quizHydrated = '1';
  const raw = el.dataset.quizSource;
  if (!raw) return;
  let data: QuizData;
  try {
    data = JSON.parse(decodeAttribute(raw)) as QuizData;
  } catch {
    return;
  }
  const container = document.createElement('div');
  el.replaceWith(container);
  const root = createRoot(container);
  root.render(createElement(Quiz, { data, storageKey: storageKeyFor(slug, index) }));
}

export function setupQuizzes(): void {
  const anchor = document.querySelector<HTMLElement>('[data-quiz-anchor]');
  const slug = anchor?.dataset.quizAnchor ?? window.location.pathname;
  const placeholders = Array.from(
    document.querySelectorAll<HTMLElement>('.quiz-placeholder[data-quiz-source]'),
  );
  if (placeholders.length === 0) return;

  if (typeof IntersectionObserver !== 'function') {
    placeholders.forEach((el, i) => hydratePlaceholder(el, slug, i));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        const index = placeholders.indexOf(el);
        hydratePlaceholder(el, slug, index >= 0 ? index : 0);
        observer.unobserve(el);
      }
    }
  }, { rootMargin: '200px' });

  for (const el of placeholders) observer.observe(el);
}
