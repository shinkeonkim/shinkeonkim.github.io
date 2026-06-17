import type { StudioUi } from '../studio-ui';
import { getDef } from '../state';
import { hidePreview, showPreview } from '../canvas';

let playState: 'idle' | 'playing' = 'idle';

export function isPlaying(): boolean {
  return playState === 'playing';
}

export function togglePlay(ui: StudioUi): void {
  const def = getDef();
  if (!def) return;
  if (playState === 'playing') {
    stopPreview(ui);
  } else {
    showPreview(def);
    playState = 'playing';
    ui.playBtn.textContent = '⏹ Stop';
  }
}

export function stopPreview(ui: StudioUi): void {
  hidePreview();
  playState = 'idle';
  ui.playBtn.textContent = '▶ Play';
}
