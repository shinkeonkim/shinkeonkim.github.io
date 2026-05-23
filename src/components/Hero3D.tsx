import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  titles: string[];
  words?: string[];
  prompt?: string;
  height?: number;
}

const DEFAULT_WORDS = [
  '글', '기록', '생각', '노트', '위키', '연결', '그래프', '태그',
  '학습', '회고', '아이디어', '메모', '검색', '코드', 'TIL',
  'Astro', 'TypeScript', 'React', 'Three.js', 'Markdown',
];

const KEY_U = 0.21;
const KEY_GAP = 0.025;
const KEY_DEPTH = 0.2;
const ROW_DEPTH_GAP = 0.025;
const KEY_THICKNESS = 0.05;
const KEY_BASE_Y = 0.13;
const FUNCTION_ROW_Z_SCALE = 0.5;

interface KeyDef {
  width: number;
  shortRow?: boolean;
}

function row(widths: number[], shortRow = false): KeyDef[] {
  return widths.map((w) => ({ width: w, shortRow }));
}

const KEYBOARD_ROWS: KeyDef[][] = [
  row([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], true),
  row([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5]),
  row([1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
  row([1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75]),
  row([2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25]),
  row([1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1]),
];
const ROW_U = 14.5;

interface ThemeColors {
  scenebg: number | null;
  baseMetal: number;
  baseRough: number;
  baseColor: number;
  keyColor: number;
  rimColor: number;
  screenBg: string;
  screenChrome: string;
  screenFg: string;
  screenMuted: string;
  screenAccent: string;
  particleColor: number;
}

function readTheme(): ThemeColors {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark
    ? {
        scenebg: null,
        baseMetal: 0.75,
        baseRough: 0.35,
        baseColor: 0x18181d,
        keyColor: 0x2a2a30,
        rimColor: 0xa5b4fc,
        screenBg: '#0d1117',
        screenChrome: '#161b22',
        screenFg: '#c9d1d9',
        screenMuted: '#8b949e',
        screenAccent: '#a5b4fc',
        particleColor: 0xa5b4fc,
      }
    : {
        scenebg: null,
        baseMetal: 0.55,
        baseRough: 0.4,
        baseColor: 0xcfd0d6,
        keyColor: 0xe5e6ec,
        rimColor: 0x4f46e5,
        screenBg: '#fafafa',
        screenChrome: '#ececef',
        screenFg: '#24292f',
        screenMuted: '#6b7280',
        screenAccent: '#4f46e5',
        particleColor: 0x4f46e5,
      };
}

export default function Hero3D({ titles, words = DEFAULT_WORDS, prompt = '~/koa/log $', height = 460 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const initialWidth = container.clientWidth || 800;
    const camera = new THREE.PerspectiveCamera(42, initialWidth / height, 0.1, 100);
    camera.position.set(1.2, 2.6, 6.0);
    camera.lookAt(0, 1.2, -0.3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialWidth, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    let theme = readTheme();

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);
    const rim = new THREE.DirectionalLight(theme.rimColor, 0.55);
    rim.position.set(-5, 2, -3);
    scene.add(rim);

    const laptop = new THREE.Group();
    scene.add(laptop);

    const baseGeometry = new THREE.BoxGeometry(4, 0.18, 2.8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: theme.baseColor,
      metalness: theme.baseMetal,
      roughness: theme.baseRough,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    laptop.add(base);

    const keyMaterial = new THREE.MeshStandardMaterial({
      color: theme.keyColor,
      metalness: 0.2,
      roughness: 0.7,
    });
    const keys: THREE.Mesh[] = [];
    const keyGeometries: THREE.BufferGeometry[] = [];
    const keyOffsets: number[] = [];

    const rowDepths = KEYBOARD_ROWS.map((r) =>
      r[0]?.shortRow ? KEY_DEPTH * FUNCTION_ROW_Z_SCALE : KEY_DEPTH,
    );
    const rowOffsetX = -((ROW_U * KEY_U + (ROW_U - 1) * KEY_GAP) / 2);
    const keyboardBackZ = -0.85;
    let backEdge = keyboardBackZ;

    KEYBOARD_ROWS.forEach((rowDef, rowIndex) => {
      const depth = rowDepths[rowIndex];
      const rowCenterZ = backEdge + depth / 2;
      const rowUnits = rowDef.reduce((sum, k) => sum + k.width, 0);
      const padU = (ROW_U - rowUnits) / 2;
      let cursorX = rowOffsetX + padU * (KEY_U + KEY_GAP);
      rowDef.forEach((keyDef) => {
        const keyW = keyDef.width * KEY_U;
        const geo = new THREE.BoxGeometry(keyW * 0.92, KEY_THICKNESS, depth * 0.88);
        keyGeometries.push(geo);
        const key = new THREE.Mesh(geo, keyMaterial);
        key.position.set(cursorX + keyW / 2, KEY_BASE_Y, rowCenterZ);
        laptop.add(key);
        keys.push(key);
        keyOffsets.push(Math.random() * Math.PI * 2);
        cursorX += keyW + KEY_GAP;
      });
      backEdge += depth + ROW_DEPTH_GAP;
    });

    const trackpadDepth = 0.85;
    const trackpadGap = 0.16;
    const trackpadCenterZ = backEdge + trackpadGap + trackpadDepth / 2;
    const trackpad = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.005, trackpadDepth),
      new THREE.MeshStandardMaterial({
        color: theme.keyColor,
        metalness: 0.4,
        roughness: 0.5,
      }),
    );
    trackpad.position.set(0, 0.095, trackpadCenterZ);
    laptop.add(trackpad);

    const screenPivot = new THREE.Group();
    screenPivot.position.set(0, 0.09, -1.4);
    laptop.add(screenPivot);

    const screenShell = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2.5, 0.08),
      new THREE.MeshStandardMaterial({
        color: theme.baseColor,
        metalness: theme.baseMetal,
        roughness: theme.baseRough,
      }),
    );
    screenShell.position.set(0, 1.25, -0.04);
    screenPivot.add(screenShell);

    const canvasW = 1024;
    const canvasH = 640;
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = canvasW;
    screenCanvas.height = canvasH;
    const ctx = screenCanvas.getContext('2d')!;
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.minFilter = THREE.LinearFilter;
    screenTexture.magFilter = THREE.LinearFilter;
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    const screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.32),
      new THREE.MeshBasicMaterial({ map: screenTexture }),
    );
    screenFace.position.set(0, 1.25, 0.005);
    screenPivot.add(screenFace);

    const closedRotation = (95 * Math.PI) / 180;
    const openRotation = -(15 * Math.PI) / 180;
    screenPivot.rotation.x = closedRotation;

    const titleWords = titles.flatMap((t) =>
      t.split(/[\s,(){}[\]:;。、,.()]+/u).filter((w) => w.length > 0 && w.length <= 14),
    );
    const wordPool = Array.from(new Set([...titleWords, ...words])).slice(0, 80);
    const wordCount = prefersReduced ? 0 : Math.min(wordPool.length, 28);

    interface FloatingWord {
      sprite: THREE.Sprite;
      material: THREE.SpriteMaterial;
      canvas: HTMLCanvasElement;
      texture: THREE.CanvasTexture;
      speed: number;
      sway: number;
      phase: number;
      baseX: number;
    }
    const floatingWords: FloatingWord[] = [];

    function buildWordTexture(text: string, color: string): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; aspect: number } {
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

    function spawnWordTop(word: FloatingWord): void {
      word.sprite.position.y = 3.6 + Math.random() * 1.6;
      word.baseX = (Math.random() - 0.5) * 9;
      word.sprite.position.x = word.baseX;
      word.sprite.position.z = (Math.random() - 0.5) * 4;
      word.material.opacity = 0;
      word.speed = 0.18 + Math.random() * 0.22;
      word.sway = 0.1 + Math.random() * 0.25;
      word.phase = Math.random() * Math.PI * 2;
    }

    function buildFloatingWord(text: string): FloatingWord {
      const colorHex = '#' + theme.particleColor.toString(16).padStart(6, '0');
      const { canvas, texture, aspect } = buildWordTexture(text, colorHex);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false });
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

    for (let i = 0; i < wordCount; i++) {
      const text = wordPool[i % wordPool.length];
      const w = buildFloatingWord(text);
      w.sprite.position.y = -2 + (i / wordCount) * 7;
      w.material.opacity = w.sprite.position.y > 0.5 ? 0.7 : 0;
      scene.add(w.sprite);
      floatingWords.push(w);
    }

    const lineHeight = 38;
    const startY = 152;
    const lines = (titles.length > 0 ? titles : ['일단 기록을 하자.']).slice(0, 6);
    const displayLines: string[] = [];
    let currentLineIdx = 0;
    let currentChar = 0;
    let cursorBlink = 0;
    let scrollOffset = 0;
    const visibleLines = 5;

    function renderScreen() {
      ctx.fillStyle = theme.screenBg;
      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.fillStyle = theme.screenChrome;
      ctx.fillRect(0, 0, canvasW, 56);
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
      ctx.fillText('shinkeonkim.com', canvasW / 2, 34);
      ctx.textAlign = 'left';

      ctx.fillStyle = theme.screenMuted;
      ctx.font = '22px ui-monospace, "JetBrains Mono", monospace';
      ctx.fillText(prompt, 28, 108);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 130, canvasW, canvasH - 130);
      ctx.clip();

      ctx.font = '22px ui-monospace, "JetBrains Mono", monospace';
      const offsetY = -scrollOffset;
      displayLines.forEach((l, i) => {
        ctx.fillStyle = theme.screenFg;
        ctx.fillText('› ' + l, 28, startY + i * lineHeight + offsetY);
      });

      if (currentLineIdx < lines.length) {
        const target = lines[currentLineIdx];
        const visible = target.slice(0, currentChar);
        ctx.fillStyle = theme.screenAccent;
        const y = startY + displayLines.length * lineHeight + offsetY;
        ctx.fillText('› ' + visible, 28, y);
        cursorBlink = (cursorBlink + 1) % 60;
        if (cursorBlink < 30) {
          const cursorX = 28 + ctx.measureText('› ' + visible).width + 4;
          ctx.fillRect(cursorX, y - 22, 12, 26);
        }
      }
      ctx.restore();

      screenTexture.needsUpdate = true;
    }

    let frameId = 0;
    let elapsed = 0;
    let lastT = performance.now();
    let charTimer = 0;
    let lineWait = 0;
    const charPerSec = 30;
    const lineDelay = 0.45;
    const hingeOpenSec = prefersReduced ? 0 : 1.4;

    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    container.addEventListener('mousemove', onPointerMove);

    function tick(t: number) {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      elapsed += dt;

      if (prefersReduced) {
        screenPivot.rotation.x = openRotation;
      } else {
        const p = Math.min(1, elapsed / hingeOpenSec);
        const eased = 1 - Math.pow(1 - p, 3);
        screenPivot.rotation.x = closedRotation + eased * (openRotation - closedRotation);
      }

      if (!prefersReduced) {
        const orbitT = elapsed * 0.18;
        const targetX = 1.2 + Math.sin(orbitT) * 0.5 + pointerX * 0.6;
        const targetY = 2.6 + Math.sin(elapsed * 0.22) * 0.12 + pointerY * 0.25;
        camera.position.x += (targetX - camera.position.x) * Math.min(1, dt * 4);
        camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 4);
      }
      camera.lookAt(0, 1.2, -0.3);

      laptop.rotation.y = Math.sin(elapsed * 0.15) * 0.06 + pointerX * 0.04;

      if (elapsed > hingeOpenSec + 0.2 && currentLineIdx < lines.length) {
        if (lineWait > 0) {
          lineWait -= dt;
        } else {
          charTimer += dt * charPerSec;
          while (charTimer >= 1 && currentChar < lines[currentLineIdx].length) {
            currentChar++;
            charTimer--;
            const ki = (currentLineIdx * 7 + currentChar) % keys.length;
            keys[ki].position.y = 0.1;
          }
          if (currentChar >= lines[currentLineIdx].length) {
            displayLines.push(lines[currentLineIdx]);
            currentLineIdx++;
            currentChar = 0;
            charTimer = 0;
            lineWait = lineDelay;
            if (displayLines.length > visibleLines) {
              scrollOffset = (displayLines.length - visibleLines) * lineHeight;
            }
          }
        }
      }

      for (let i = 0; i < keys.length; i++) {
        const target = 0.13;
        keys[i].position.y += (target - keys[i].position.y) * Math.min(1, dt * 8);
        keys[i].position.y += Math.sin(elapsed * 2 + keyOffsets[i]) * 0.0008;
      }

      for (const w of floatingWords) {
        w.sprite.position.y -= w.speed * dt;
        w.sprite.position.x = w.baseX + Math.sin(elapsed * 0.6 + w.phase) * w.sway;
        const y = w.sprite.position.y;
        let opacity = 0;
        if (y > 3.2) opacity = ((4.8 - y) / 1.6) * 0.7;
        else if (y < 0.6) opacity = Math.max(0, ((y - 0.1) / 0.5)) * 0.7;
        else opacity = 0.7;
        w.material.opacity = Math.max(0, Math.min(0.7, opacity));
        if (y < 0.1) spawnWordTop(w);
      }

      renderScreen();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);

    const onResize = () => {
      const w = container.clientWidth;
      if (w === 0) return;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    function applyTheme() {
      theme = readTheme();
      baseMaterial.color.setHex(theme.baseColor);
      baseMaterial.metalness = theme.baseMetal;
      baseMaterial.roughness = theme.baseRough;
      keyMaterial.color.setHex(theme.keyColor);
      rim.color.setHex(theme.rimColor);
      const colorHex = '#' + theme.particleColor.toString(16).padStart(6, '0');
      for (const w of floatingWords) {
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
    const themeObs = new MutationObserver(() => applyTheme());
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      themeObs.disconnect();
      container.removeEventListener('mousemove', onPointerMove);
      renderer.dispose();
      baseGeometry.dispose();
      for (const g of keyGeometries) g.dispose();
      baseMaterial.dispose();
      keyMaterial.dispose();
      screenShell.geometry.dispose();
      (screenShell.material as THREE.Material).dispose();
      screenFace.geometry.dispose();
      (screenFace.material as THREE.Material).dispose();
      for (const w of floatingWords) {
        scene.remove(w.sprite);
        w.material.dispose();
        w.texture.dispose();
      }
      screenTexture.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [titles, words, prompt, height]);

  return <div ref={containerRef} className="hero3d-canvas" style={{ height, width: '100%' }} />;
}
