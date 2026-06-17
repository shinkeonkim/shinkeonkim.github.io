function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportSvg(svg: SVGSVGElement): void {
  const xml = new XMLSerializer().serializeToString(svg);
  downloadBlob(
    `mermaid-${Date.now()}.svg`,
    new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', xml], { type: 'image/svg+xml' }),
  );
}

export function exportPng(svg: SVGSVGElement): void {
  const xml = new XMLSerializer().serializeToString(svg);
  const bbox = svg.getBBox ? svg.getBBox() : { width: 1024, height: 768 };
  const w = Math.max(320, Math.ceil(bbox.width)) * 2;
  const h = Math.max(240, Math.ceil(bbox.height)) * 2;
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#0b0b0f' : '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((b) => {
      if (b) downloadBlob(`mermaid-${Date.now()}.png`, b);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}
