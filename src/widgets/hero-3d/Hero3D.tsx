import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DEFAULT_WORDS, readTheme } from './theme';
import { buildKeyboard } from './keyboard';
import { buildWordPool, repaintFloatingWords, spawnWordTop } from './words';
import { createScreen, drawScreen, LINE_HEIGHT, VISIBLE_LINES, type ScreenState } from './screen';

interface Props {
  titles: string[];
  words?: string[];
  prompt?: string;
  height?: number;
}

export default function Hero3D({
  titles,
  words = DEFAULT_WORDS,
  prompt = '~/koa/log $',
  height = 460,
}: Props) {
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
    const { keys, keyGeometries, keyOffsets, backEdge } = buildKeyboard(laptop, keyMaterial);

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

    const { canvas: screenCanvas, ctx: screenCtx, texture: screenTexture } = createScreen();
    void screenCanvas;
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
    const floatingWords = buildWordPool(scene, theme, wordCount, wordPool);

    const screenState: ScreenState = {
      lines: (titles.length > 0 ? titles : ['일단 기록을 하자.']).slice(0, 6),
      displayLines: [],
      currentLineIdx: 0,
      currentChar: 0,
      cursorBlink: 0,
      scrollOffset: 0,
    };

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

      if (elapsed > hingeOpenSec + 0.2 && screenState.currentLineIdx < screenState.lines.length) {
        if (lineWait > 0) {
          lineWait -= dt;
        } else {
          charTimer += dt * charPerSec;
          while (
            charTimer >= 1 &&
            screenState.currentChar < screenState.lines[screenState.currentLineIdx].length
          ) {
            screenState.currentChar++;
            charTimer--;
            const ki = (screenState.currentLineIdx * 7 + screenState.currentChar) % keys.length;
            keys[ki].position.y = 0.1;
          }
          if (screenState.currentChar >= screenState.lines[screenState.currentLineIdx].length) {
            screenState.displayLines.push(screenState.lines[screenState.currentLineIdx]);
            screenState.currentLineIdx++;
            screenState.currentChar = 0;
            charTimer = 0;
            lineWait = lineDelay;
            if (screenState.displayLines.length > VISIBLE_LINES) {
              screenState.scrollOffset =
                (screenState.displayLines.length - VISIBLE_LINES) * LINE_HEIGHT;
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
        let opacity: number;
        if (y > 3.2) opacity = ((4.8 - y) / 1.6) * 0.7;
        else if (y < 0.6) opacity = Math.max(0, (y - 0.1) / 0.5) * 0.7;
        else opacity = 0.7;
        w.material.opacity = Math.max(0, Math.min(0.7, opacity));
        if (y < 0.1) spawnWordTop(w);
      }

      drawScreen(screenCtx, theme, screenState, prompt);
      screenTexture.needsUpdate = true;
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
      repaintFloatingWords(floatingWords, theme);
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
