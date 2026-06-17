const NUMERIC_KEYS = new Set([
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r',
  'x1', 'y1', 'x2', 'y2',
  'rotation', 'opacity', 'strokeWidth', 'cornerRadius',
  'fontSize', 'labelSize', 'subtitleSize', 'curvature',
]);
const COLOR_KEYS = new Set(['fill', 'stroke', 'color', 'labelColor']);
const TEXT_KEYS = new Set(['label', 'subtitle', 'content', 'src']);

export function isNumericKey(key: string): boolean {
  return NUMERIC_KEYS.has(key);
}
export function isColorKey(key: string): boolean {
  return COLOR_KEYS.has(key);
}
export function isTextKey(key: string): boolean {
  return TEXT_KEYS.has(key);
}
