import { addElement, getDef, uniqueElementId } from './state';

export type SetStatus = (text: string, kind?: 'ok' | 'warn' | 'error') => void;

export interface ImageUploadHost {
  app: HTMLElement;
  setStatus: SetStatus;
}

function loadImageSize(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function uploadAndInsertImage(file: File, host: ImageUploadHost): Promise<void> {
  const def = getDef();
  if (!def) {
    host.setStatus('먼저 애니메이션을 열거나 만드세요', 'warn');
    return;
  }
  try {
    host.setStatus('이미지 업로드 중…');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/_editor/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { path: string };
    const cx = def.canvas.width / 2;
    const cy = def.canvas.height / 2;
    const tempImg = await loadImageSize(data.path);
    const maxDim = Math.min(def.canvas.width, def.canvas.height) * 0.5;
    let w = tempImg?.w ?? 200;
    let h = tempImg?.h ?? 200;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const id = uniqueElementId('img');
    addElement({
      type: 'image', id, rotation: 0, appearances: [], tracks: [],
      x: Math.round(cx - w / 2), y: Math.round(cy - h / 2),
      width: w, height: h, src: data.path,
      preserveAspectRatio: 'xMidYMid meet', opacity: 1,
    });
    host.setStatus(`업로드 완료: ${data.path}`, 'ok');
  } catch (err) {
    host.setStatus('업로드 실패: ' + (err instanceof Error ? err.message : String(err)), 'error');
  }
}

export function setupImageDropAndPaste(host: ImageUploadHost): void {
  const canvasWrap = host.app.querySelector<HTMLElement>('.studio-canvas-wrap');
  if (canvasWrap) {
    canvasWrap.addEventListener('dragover', (e) => {
      if (!e.dataTransfer) return;
      const hasFiles = Array.from(e.dataTransfer.items ?? []).some((it) => it.kind === 'file');
      if (hasFiles) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        canvasWrap.classList.add('is-drop-target');
      }
    });
    canvasWrap.addEventListener('dragleave', () => canvasWrap.classList.remove('is-drop-target'));
    canvasWrap.addEventListener('drop', (e) => {
      canvasWrap.classList.remove('is-drop-target');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        e.preventDefault();
        void uploadAndInsertImage(file, host);
      }
    });
  }
  document.addEventListener('paste', (e) => {
    if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
      return;
    }
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void uploadAndInsertImage(file, host);
          return;
        }
      }
    }
  });
}
