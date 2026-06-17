import * as THREE from 'three';
import type { ThemeColors } from './theme';

export const SCREEN_W = 1024;
export const SCREEN_H = 640;

export interface ScreenResources {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}

export function createScreen(): ScreenResources {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, texture };
}

export interface ScreenState {
  lines: string[];
  displayLines: string[];
  currentLineIdx: number;
  currentChar: number;
  cursorBlink: number;
  scrollOffset: number;
}

export const LINE_HEIGHT = 38;
export const START_Y = 152;
export const VISIBLE_LINES = 5;

export function drawScreen(
  ctx: CanvasRenderingContext2D,
  theme: ThemeColors,
  state: ScreenState,
  prompt: string,
): void {
  ctx.fillStyle = theme.screenBg;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  ctx.fillStyle = theme.screenChrome;
  ctx.fillRect(0, 0, SCREEN_W, 56);
  ctx.fillStyle = '#ff5f57';
  ctx.beginPath();
  ctx.arc(34, 28, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#febc2e';
  ctx.beginPath();
  ctx.arc(64, 28, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#28c840';
  ctx.beginPath();
  ctx.arc(94, 28, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.screenMuted;
  ctx.font = '18px ui-monospace, "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('shinkeonkim.com', SCREEN_W / 2, 34);
  ctx.textAlign = 'left';

  ctx.fillStyle = theme.screenMuted;
  ctx.font = '22px ui-monospace, "JetBrains Mono", monospace';
  ctx.fillText(prompt, 28, 108);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 130, SCREEN_W, SCREEN_H - 130);
  ctx.clip();

  ctx.font = '22px ui-monospace, "JetBrains Mono", monospace';
  const offsetY = -state.scrollOffset;
  state.displayLines.forEach((l, i) => {
    ctx.fillStyle = theme.screenFg;
    ctx.fillText('› ' + l, 28, START_Y + i * LINE_HEIGHT + offsetY);
  });

  if (state.currentLineIdx < state.lines.length) {
    const target = state.lines[state.currentLineIdx];
    const visible = target.slice(0, state.currentChar);
    ctx.fillStyle = theme.screenAccent;
    const y = START_Y + state.displayLines.length * LINE_HEIGHT + offsetY;
    ctx.fillText('› ' + visible, 28, y);
    state.cursorBlink = (state.cursorBlink + 1) % 60;
    if (state.cursorBlink < 30) {
      const cursorX = 28 + ctx.measureText('› ' + visible).width + 4;
      ctx.fillRect(cursorX, y - 22, 12, 26);
    }
  }
  ctx.restore();
}
