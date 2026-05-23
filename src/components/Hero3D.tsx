import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  titles: string[];
  prompt?: string;
  height?: number;
}

const KEY_COLS = 14;
const KEY_ROWS = 5;
const KEY_GEO = new THREE.BoxGeometry(0.18, 0.05, 0.18);

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

export default function Hero3D({ titles, prompt = '~/koa/log $', height = 460 }: Props) {
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

    const trackpad = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.005, 0.95),
      new THREE.MeshStandardMaterial({
        color: theme.keyColor,
        metalness: 0.35,
        roughness: 0.55,
      }),
    );
    trackpad.position.set(0, 0.095, 1.05);
    laptop.add(trackpad);

    const keyMaterial = new THREE.MeshStandardMaterial({
      color: theme.keyColor,
      metalness: 0.2,
      roughness: 0.7,
    });
    const keys: THREE.Mesh[] = [];
    const keyOffsets: number[] = [];
    const kbWidth = 3.4;
    const kbDepth = 1.8;
    const stepX = kbWidth / (KEY_COLS - 1);
    const stepZ = kbDepth / (KEY_ROWS - 1);
    for (let r = 0; r < KEY_ROWS; r++) {
      for (let c = 0; c < KEY_COLS; c++) {
        const key = new THREE.Mesh(KEY_GEO, keyMaterial);
        const baseY = 0.13;
        key.position.set(-kbWidth / 2 + c * stepX, baseY, -kbDepth / 2 + r * stepZ - 0.05);
        laptop.add(key);
        keys.push(key);
        keyOffsets.push(Math.random() * Math.PI * 2);
      }
    }

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

    const particleCount = prefersReduced ? 0 : 60;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 1] = Math.random() * 3.5 + 1.2;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.08;
      particleVelocities[i * 3 + 1] = -Math.random() * 0.05 - 0.02;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: theme.particleColor,
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    if (particleCount > 0) scene.add(particles);

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

      if (particleCount > 0) {
        const positions = particleGeometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = positions.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          arr[i * 3] += particleVelocities[i * 3];
          arr[i * 3 + 1] += particleVelocities[i * 3 + 1];
          arr[i * 3 + 2] += particleVelocities[i * 3 + 2];
          if (arr[i * 3 + 1] < 0.5) {
            arr[i * 3] = (Math.random() - 0.5) * 8;
            arr[i * 3 + 1] = 4;
            arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
          }
        }
        positions.needsUpdate = true;
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
      particleMaterial.color.setHex(theme.particleColor);
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
      KEY_GEO.dispose();
      baseMaterial.dispose();
      keyMaterial.dispose();
      screenShell.geometry.dispose();
      (screenShell.material as THREE.Material).dispose();
      screenFace.geometry.dispose();
      (screenFace.material as THREE.Material).dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      screenTexture.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [titles, prompt, height]);

  return <div ref={containerRef} className="hero3d-canvas" style={{ height, width: '100%' }} />;
}
