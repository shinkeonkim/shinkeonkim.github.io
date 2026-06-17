import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import {
  animationDefSchema,
  type AnimationDef,
} from '@/entities/animation/engine/schema';
import PlayerWrapper from './AnimationPlayer';

const HYDRATED = new WeakSet<HTMLElement>();
const ROOTS = new WeakMap<HTMLElement, Root>();
const CACHE = new Map<string, Promise<AnimationDef | null>>();

async function fetchAnimation(id: string): Promise<AnimationDef | null> {
  if (CACHE.has(id)) return CACHE.get(id)!;
  const p = (async () => {
    try {
      const res = await fetch(`/animations/${id}.json`, {
        cache: import.meta.env.DEV ? 'no-store' : 'force-cache',
      });
      if (!res.ok) return null;
      const json = await res.json();
      const parsed = animationDefSchema.safeParse(json);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  })();
  CACHE.set(id, p);
  return p;
}

function fail(el: HTMLElement, msg: string): void {
  el.outerHTML = `<div class="anim-error">${msg}</div>`;
}

async function hydrate(el: HTMLElement): Promise<void> {
  if (HYDRATED.has(el)) return;
  HYDRATED.add(el);
  const id = el.dataset.animId ?? '';
  const def = await fetchAnimation(id);
  if (!def) {
    fail(el, `애니메이션 로드 실패: "${id}" (/animations/${id}.json 없음)`);
    return;
  }
  const root = createRoot(el);
  ROOTS.set(el, root);
  el.classList.remove('anim-placeholder');
  root.render(createElement(PlayerWrapper, { def }));
}

export function hydrateAllAnimations(): void {
  const els = document.querySelectorAll<HTMLElement>('.anim-placeholder');
  if (els.length === 0) return;
  if (typeof IntersectionObserver === 'undefined') {
    els.forEach((el) => void hydrate(el));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          io.unobserve(entry.target);
          void hydrate(entry.target as HTMLElement);
        }
      }
    },
    { rootMargin: '200px 0px' },
  );
  els.forEach((el) => io.observe(el));
}
