import { segmentContent, type Segment } from './segment-content';
import { SpeakQueue, type PlaybackState } from './speak-queue';

const PREF_KEY = 'tts:prefs';

interface Prefs {
  rate: number;
  voiceURI: string | null;
}

declare global {
  interface Window {
    __ttsBound?: string;
  }
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw) as Prefs;
  } catch {
    // localStorage disabled
  }
  return { rate: 1, voiceURI: null };
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage disabled
  }
}

function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const preferred = voices.filter((v) => v.lang?.startsWith('ko'));
  if (preferred.length === 0) return voices[0] ?? null;
  const enhanced = preferred.find((v) => /enhanced|neural/i.test(v.name));
  return enhanced ?? preferred[0];
}

function populateVoices(select: HTMLSelectElement, voices: SpeechSynthesisVoice[], selectedURI: string | null): void {
  select.innerHTML = '';
  if (voices.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '음성 없음';
    select.append(opt);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  const sorted = [...voices].sort((a, b) => {
    const aKo = a.lang?.startsWith('ko') ? 0 : 1;
    const bKo = b.lang?.startsWith('ko') ? 0 : 1;
    if (aKo !== bKo) return aKo - bKo;
    return a.name.localeCompare(b.name);
  });
  for (const v of sorted) {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    if (selectedURI === v.voiceURI) opt.selected = true;
    select.append(opt);
  }
  if (!selectedURI) {
    const auto = pickKoreanVoice(sorted);
    if (auto) select.value = auto.voiceURI;
  }
}

function scrollToSegment(el: HTMLElement, reduceMotion: boolean): void {
  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
  const rect = el.getBoundingClientRect();
  const inView = rect.top >= 60 && rect.bottom <= (window.innerHeight - 60);
  if (inView) return;
  el.scrollIntoView({ block: 'center', behavior });
}

function statusLabel(state: PlaybackState): string {
  switch (state) {
    case 'playing':
      return '재생 중';
    case 'paused':
      return '일시 정지';
    case 'ended':
      return '재생 완료';
    default:
      return '대기';
  }
}

export function setupTtsControls(): void {
  const root = document.querySelector<HTMLDetailsElement>('[data-tts-controls]');
  if (!root) return;
  const rawSlug = root.dataset.ttsSlug;
  if (!rawSlug || window.__ttsBound === rawSlug) return;
  const slug: string = rawSlug;

  if (typeof window.speechSynthesis === 'undefined') {
    const status = root.querySelector<HTMLElement>('[data-tts-status]');
    const hint = root.querySelector<HTMLElement>('[data-tts-hint]');
    if (status) status.textContent = '미지원';
    if (hint) hint.textContent = '이 브라우저는 Web Speech API 를 지원하지 않습니다.';
    return;
  }

  const contentSelector = root.dataset.ttsContentSelector ?? '.prose-content';
  const contentEl = document.querySelector<HTMLElement>(contentSelector);
  if (!contentEl) return;

  const playBtn = root.querySelector<HTMLButtonElement>('[data-tts-play]');
  const stopBtn = root.querySelector<HTMLButtonElement>('[data-tts-stop]');
  const rateSel = root.querySelector<HTMLSelectElement>('[data-tts-rate]');
  const voiceSel = root.querySelector<HTMLSelectElement>('[data-tts-voice]');
  const status = root.querySelector<HTMLElement>('[data-tts-status]');
  const playLabel = root.querySelector<HTMLElement>('[data-tts-play-label]');
  const hint = root.querySelector<HTMLElement>('[data-tts-hint]');
  if (!playBtn || !stopBtn || !rateSel || !voiceSel) return;

  const prefs = loadPrefs();
  rateSel.value = String(prefs.rate);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let segments: Segment[] = [];
  let queue: SpeakQueue | null = null;
  let activeElement: HTMLElement | null = null;

  function ensureSegments(): void {
    if (segments.length > 0) return;
    segments = segmentContent(contentEl!);
  }

  function markActive(seg: Segment | null): void {
    if (activeElement) {
      activeElement.classList.remove('tts-active');
      activeElement = null;
    }
    if (!seg) return;
    seg.element.classList.add('tts-active');
    activeElement = seg.element;
    scrollToSegment(seg.element, reduceMotion);
  }

  function updateState(state: PlaybackState): void {
    if (status) status.textContent = statusLabel(state);
    if (playLabel) {
      playLabel.textContent = state === 'playing' ? '일시 정지' : state === 'paused' ? '이어 듣기' : '재생';
    }
    playBtn!.disabled = false;
    stopBtn!.disabled = state === 'idle';
    if (state === 'ended' || state === 'idle') markActive(null);
  }

  function initQueue(): SpeakQueue {
    ensureSegments();
    if (segments.length === 0) {
      if (hint) hint.textContent = '이 페이지에서 낭독할 문장이 없습니다.';
      throw new Error('empty segments');
    }
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find((v) => v.voiceURI === voiceSel!.value) ?? pickKoreanVoice(voices);
    return new SpeakQueue({
      slug,
      segments,
      voice: selectedVoice,
      rate: parseFloat(rateSel!.value) || 1,
      onSegmentChange: (_i, seg) => markActive(seg),
      onStateChange: updateState,
    });
  }

  function refreshVoices(): void {
    const voices = window.speechSynthesis.getVoices();
    populateVoices(voiceSel!, voices, prefs.voiceURI);
    if (voices.length === 0) {
      if (status) status.textContent = '음성 대기';
    } else {
      if (status) status.textContent = '대기';
      if (playBtn) playBtn.disabled = false;
    }
  }

  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => refreshVoices();

  playBtn.addEventListener('click', () => {
    try {
      if (!queue) queue = initQueue();
      const state = queue.getState();
      if (state === 'playing') queue.pause();
      else queue.play();
    } catch {
      // segments empty, message already shown
    }
  });

  stopBtn.addEventListener('click', () => {
    queue?.stop();
  });

  rateSel.addEventListener('change', () => {
    const rate = parseFloat(rateSel.value) || 1;
    savePrefs({ ...loadPrefs(), rate });
    queue?.setRate(rate);
  });

  voiceSel.addEventListener('change', () => {
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.voiceURI === voiceSel.value) ?? null;
    savePrefs({ ...loadPrefs(), voiceURI: voiceSel.value || null });
    queue?.setVoice(voice);
  });

  window.addEventListener('pagehide', () => {
    queue?.stop();
  });

  document.addEventListener('astro:before-swap', () => {
    queue?.stop();
  });

  window.__ttsBound = slug;
}
