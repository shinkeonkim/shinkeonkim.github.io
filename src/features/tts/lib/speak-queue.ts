import type { Segment } from './segment-content';

export interface QueueOptions {
  slug: string;
  segments: Segment[];
  voice: SpeechSynthesisVoice | null;
  rate: number;
  onSegmentChange?: (index: number, segment: Segment) => void;
  onStateChange?: (state: PlaybackState) => void;
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';

interface PersistedState {
  segmentIndex: number;
  updatedAt: number;
}

function persistKey(slug: string): string {
  return `tts:progress:${slug}`;
}

export function loadProgress(slug: string): number {
  try {
    const raw = localStorage.getItem(persistKey(slug));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as PersistedState;
    return typeof parsed.segmentIndex === 'number' ? parsed.segmentIndex : 0;
  } catch {
    return 0;
  }
}

function saveProgress(slug: string, index: number): void {
  try {
    const payload: PersistedState = { segmentIndex: index, updatedAt: Date.now() };
    localStorage.setItem(persistKey(slug), JSON.stringify(payload));
  } catch {
    // localStorage disabled
  }
}

const CHROME_UTTERANCE_MAX_MS = 14000;
const AVG_CHARS_PER_SECOND = 12;

function chunkForBrowser(text: string): string[] {
  const budget = CHROME_UTTERANCE_MAX_MS * AVG_CHARS_PER_SECOND / 1000;
  if (text.length <= budget) return [text];
  const sentences = text.split(/(?<=[.!?…])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > budget) {
      if (current) chunks.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export class SpeakQueue {
  private opts: QueueOptions;
  private index = 0;
  private state: PlaybackState = 'idle';
  private cancelled = false;

  constructor(opts: QueueOptions) {
    this.opts = opts;
    this.index = Math.min(loadProgress(opts.slug), Math.max(opts.segments.length - 1, 0));
  }

  getState(): PlaybackState {
    return this.state;
  }

  getIndex(): number {
    return this.index;
  }

  setIndex(i: number): void {
    if (i < 0 || i >= this.opts.segments.length) return;
    this.index = i;
    saveProgress(this.opts.slug, i);
    if (this.state === 'playing') {
      this.stopSpeech();
      this.play();
    }
  }

  play(): void {
    if (this.opts.segments.length === 0) return;
    this.cancelled = false;
    if (this.state === 'paused') {
      window.speechSynthesis.resume();
      this.setState('playing');
      return;
    }
    if (this.index >= this.opts.segments.length) {
      this.index = 0;
    }
    this.setState('playing');
    this.speakCurrent();
  }

  pause(): void {
    if (this.state === 'playing') {
      window.speechSynthesis.pause();
      this.setState('paused');
    }
  }

  stop(): void {
    this.cancelled = true;
    this.stopSpeech();
    this.setState('idle');
  }

  setRate(rate: number): void {
    this.opts.rate = rate;
    if (this.state === 'playing') {
      this.stopSpeech();
      this.speakCurrent();
    }
  }

  setVoice(voice: SpeechSynthesisVoice | null): void {
    this.opts.voice = voice;
    if (this.state === 'playing') {
      this.stopSpeech();
      this.speakCurrent();
    }
  }

  private stopSpeech(): void {
    window.speechSynthesis.cancel();
  }

  private setState(next: PlaybackState): void {
    if (this.state === next) return;
    this.state = next;
    this.opts.onStateChange?.(next);
  }

  private speakCurrent(): void {
    const segment = this.opts.segments[this.index];
    if (!segment) {
      this.setState('ended');
      return;
    }
    this.opts.onSegmentChange?.(this.index, segment);
    saveProgress(this.opts.slug, this.index);
    const text = segment.prefix ? `${segment.prefix} ${segment.text}` : segment.text;
    const chunks = chunkForBrowser(text);
    this.speakChunks(chunks, () => {
      if (this.cancelled) return;
      if (this.index + 1 >= this.opts.segments.length) {
        this.setState('ended');
        return;
      }
      this.index += 1;
      this.speakCurrent();
    });
  }

  private speakChunks(chunks: string[], done: () => void): void {
    let i = 0;
    const step = () => {
      if (this.cancelled) return;
      if (i >= chunks.length) {
        done();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[i]);
      utterance.rate = this.opts.rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = this.opts.voice?.lang ?? 'ko-KR';
      if (this.opts.voice) utterance.voice = this.opts.voice;
      utterance.onend = () => {
        i += 1;
        step();
      };
      utterance.onerror = () => {
        i += 1;
        step();
      };
      window.speechSynthesis.speak(utterance);
    };
    step();
  }
}
