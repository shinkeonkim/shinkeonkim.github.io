import * as THREE from 'three';
import type { ThemeColors } from './theme';

export interface FloatingWord {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  speed: number;
  sway: number;
  phase: number;
  baseX: number;
}

function buildWordTexture(
  text: string,
  color: string,
): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const fontPx = 36;
  const padX = 14;
  const measureCtx = canvas.getContext('2d')!;
  measureCtx.font = `600 ${fontPx}px var(--font-sans), "Pretendard Variable", system-ui, sans-serif`;
  const textW = measureCtx.measureText(text).width;
  const w = Math.ceil(textW) + padX * 2;
  const h = fontPx + 12;
  canvas.width = Math.max(1, Math.ceil(w * dpr));
  canvas.height = Math.max(1, Math.ceil(h * dpr));
  const ctx2 = canvas.getContext('2d')!;
  ctx2.scale(dpr, dpr);
  ctx2.font = `600 ${fontPx}px var(--font-sans), "Pretendard Variable", system-ui, sans-serif`;
  ctx2.textBaseline = 'middle';
  ctx2.fillStyle = color;
  ctx2.fillText(text, padX, h / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, texture, aspect: w / h };
}

export function spawnWordTop(word: FloatingWord): void {
  word.sprite.position.y = 3.6 + Math.random() * 1.6;
  word.baseX = (Math.random() - 0.5) * 9;
  word.sprite.position.x = word.baseX;
  word.sprite.position.z = (Math.random() - 0.5) * 4;
  word.material.opacity = 0;
  word.speed = 0.18 + Math.random() * 0.22;
  word.sway = 0.1 + Math.random() * 0.25;
  word.phase = Math.random() * Math.PI * 2;
}

function buildFloatingWord(text: string, theme: ThemeColors): FloatingWord {
  const colorHex = '#' + theme.particleColor.toString(16).padStart(6, '0');
  const { canvas, texture, aspect } = buildWordTexture(text, colorHex);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.userData.text = text;
  const worldHeight = 0.36;
  sprite.scale.set(aspect * worldHeight, worldHeight, 1);
  const word: FloatingWord = {
    sprite,
    material,
    canvas,
    texture,
    speed: 0.18 + Math.random() * 0.22,
    sway: 0.1 + Math.random() * 0.25,
    phase: Math.random() * Math.PI * 2,
    baseX: 0,
  };
  spawnWordTop(word);
  return word;
}

export function buildWordPool(
  scene: THREE.Scene,
  theme: ThemeColors,
  wordCount: number,
  wordPool: string[],
): FloatingWord[] {
  const floatingWords: FloatingWord[] = [];
  for (let i = 0; i < wordCount; i++) {
    const text = wordPool[i % wordPool.length];
    const w = buildFloatingWord(text, theme);
    w.sprite.position.y = -2 + (i / wordCount) * 7;
    w.material.opacity = w.sprite.position.y > 0.5 ? 0.7 : 0;
    scene.add(w.sprite);
    floatingWords.push(w);
  }
  return floatingWords;
}

export function repaintFloatingWords(words: FloatingWord[], theme: ThemeColors): void {
  const colorHex = '#' + theme.particleColor.toString(16).padStart(6, '0');
  for (const w of words) {
    const ctx2 = w.canvas.getContext('2d');
    if (!ctx2) continue;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    ctx2.clearRect(0, 0, w.canvas.width, w.canvas.height);
    ctx2.scale(dpr, dpr);
    const fontPx = 36;
    ctx2.font = `600 ${fontPx}px var(--font-sans), "Pretendard Variable", system-ui, sans-serif`;
    ctx2.textBaseline = 'middle';
    ctx2.fillStyle = colorHex;
    const labelW = w.canvas.width / dpr;
    const labelH = w.canvas.height / dpr;
    const textW = labelW - 28;
    const text = (w.sprite.userData.text as string | undefined) ?? '';
    if (text) ctx2.fillText(text, 14, labelH / 2, textW);
    w.texture.needsUpdate = true;
  }
}
