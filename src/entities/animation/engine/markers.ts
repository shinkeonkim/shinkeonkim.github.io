export const ENGINE_MARKER_DEFS = `
  <marker id="anim-h-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-triangle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-triangle-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-triangle-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-triangle-open-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
    <circle cx="5" cy="5" r="4" fill="currentColor" />
  </marker>
  <marker id="anim-h-circle-open" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7">
    <circle cx="5" cy="5" r="4" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-diamond" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-diamond-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="currentColor" />
  </marker>
  <marker id="anim-h-diamond-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-diamond-open-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="white" stroke="currentColor" stroke-width="1.5" />
  </marker>
  <marker id="anim-h-bar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="10" orient="auto">
    <rect x="4" y="0" width="2" height="10" fill="currentColor" />
  </marker>
`;

export function engineMarkerUrl(head: string | undefined, end: 'start' | 'end'): string | undefined {
  if (!head || head === 'none') return undefined;
  if (head === 'circle' || head === 'circle-open') return `url(#anim-h-${head})`;
  const idBase = `anim-h-${head}`;
  return end === 'start' ? `url(#${idBase}-start)` : `url(#${idBase})`;
}
