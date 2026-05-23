const COPIED_PROPS = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
] as const;

export interface CaretCoords {
  top: number;
  left: number;
  height: number;
}

const isFirefox = typeof window !== 'undefined' && 'mozInnerScreenX' in window;

export function getCaretCoordinates(
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number,
): CaretCoords {
  const div = document.createElement('div');
  div.id = '__caret-mirror';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);
  const isInput = element.nodeName === 'INPUT';

  style.whiteSpace = 'pre-wrap';
  if (!isInput) style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';

  for (const prop of COPIED_PROPS) {
    if (isInput && prop === 'lineHeight') {
      if (computed.boxSizing === 'border-box') {
        const height = parseInt(computed.height, 10);
        const outerHeight =
          parseInt(computed.paddingTop, 10) +
          parseInt(computed.paddingBottom, 10) +
          parseInt(computed.borderTopWidth, 10) +
          parseInt(computed.borderBottomWidth, 10);
        const targetHeight = outerHeight + parseInt(computed.lineHeight, 10);
        if (height > targetHeight) style.lineHeight = height - outerHeight + 'px';
        else if (height === targetHeight) style.lineHeight = computed.lineHeight;
        else style.lineHeight = '0';
      } else {
        style.lineHeight = computed.height;
      }
    } else {
      // @ts-expect-error - dynamic CSS property copy
      style[prop] = computed[prop];
    }
  }

  if (isFirefox) {
    if (element.scrollHeight > parseInt(computed.height, 10)) style.overflowY = 'scroll';
  } else {
    style.overflow = 'hidden';
  }

  div.textContent = element.value.substring(0, position);
  if (isInput) div.textContent = (div.textContent ?? '').replace(/\s/g, '\u00a0');

  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coords: CaretCoords = {
    top: span.offsetTop + parseInt(computed.borderTopWidth, 10),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth, 10),
    height: parseInt(computed.lineHeight, 10),
  };

  document.body.removeChild(div);
  return coords;
}
