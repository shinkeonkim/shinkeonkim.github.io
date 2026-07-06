import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportPng, exportSvg } from './mermaid-export';

function makeSvg(withBbox = true): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  if (withBbox) {
    (svg as unknown as { getBBox: () => { width: number; height: number } }).getBBox = () => ({
      width: 400,
      height: 300,
    });
  } else {
    (svg as unknown as { getBBox?: () => unknown }).getBBox = undefined;
  }
  return svg;
}

describe('exportSvg', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });
    clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy as unknown as () => void);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('serializes the SVG and triggers a download', () => {
    exportSvg(makeSvg());
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('names the file with mermaid- prefix and svg suffix', () => {
    exportSvg(makeSvg());
    const blobArg = createObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
  });
});

describe('exportPng', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates an object URL for the source SVG', () => {
    exportPng(makeSvg());
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('handles svg without getBBox by falling back to default dimensions', () => {
    expect(() => exportPng(makeSvg(false))).not.toThrow();
  });

  it('renders canvas and triggers download on image load', () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    const toBlob = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: '',
        fillRect,
        drawImage,
      }),
      toBlob,
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement;
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
    });
    const captured: { onload?: () => void } = {};
    class FakeImage {
      set onload(fn: () => void) {
        captured.onload = fn;
      }
      set src(_v: string) {
        void _v;
      }
      set onerror(_v: () => void) {
        void _v;
      }
    }
    vi.stubGlobal('Image', FakeImage);
    exportPng(makeSvg());
    captured.onload?.();
    expect(fillRect).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalled();
    expect(toBlob).toHaveBeenCalled();
  });

  it('respects dark mode fill style when documentElement has dark class', () => {
    document.documentElement.classList.add('dark');
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    let capturedFillStyle = '';
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => {
        const ctx = {
          fillRect,
          drawImage,
          set fillStyle(v: string) {
            capturedFillStyle = v;
          },
        };
        return ctx;
      },
      toBlob: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement;
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
    });
    const captured: { onload?: () => void } = {};
    class FakeImage {
      set onload(fn: () => void) {
        captured.onload = fn;
      }
      set src(_v: string) {
        void _v;
      }
      set onerror(_v: () => void) {
        void _v;
      }
    }
    vi.stubGlobal('Image', FakeImage);
    exportPng(makeSvg());
    captured.onload?.();
    expect(capturedFillStyle).toBe('#0b0b0f');
    document.documentElement.classList.remove('dark');
  });

  it('bails out gracefully when canvas 2d context is unavailable', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => null,
      toBlob: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement;
      return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
    });
    const captured: { onload?: () => void } = {};
    class FakeImage {
      set onload(fn: () => void) {
        captured.onload = fn;
      }
      set src(_v: string) {
        void _v;
      }
      set onerror(_v: () => void) {
        void _v;
      }
    }
    vi.stubGlobal('Image', FakeImage);
    exportPng(makeSvg());
    captured.onload?.();
    expect(canvas.toBlob).not.toHaveBeenCalled();
  });

  it('revokes URL when image loading errors', () => {
    const captured: { onerror?: () => void } = {};
    class FakeImage {
      set onload(_v: () => void) {
        void _v;
      }
      set onerror(fn: () => void) {
        captured.onerror = fn;
      }
      set src(_v: string) {
        void _v;
      }
    }
    vi.stubGlobal('Image', FakeImage);
    exportPng(makeSvg());
    captured.onerror?.();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
