export const DEFAULT_WORDS = [
  '글', '기록', '생각', '노트', '위키', '연결', '그래프', '태그',
  '학습', '회고', '아이디어', '메모', '검색', '코드', 'TIL',
  'Astro', 'TypeScript', 'React', 'Three.js', 'Markdown',
];

export const KEY_U = 0.21;
export const KEY_GAP = 0.025;
export const KEY_DEPTH = 0.2;
export const ROW_DEPTH_GAP = 0.025;
export const KEY_THICKNESS = 0.05;
export const KEY_BASE_Y = 0.13;
export const FUNCTION_ROW_Z_SCALE = 0.5;
export const ROW_U = 14.5;

export interface KeyDef {
  width: number;
  shortRow?: boolean;
}

function row(widths: number[], shortRow = false): KeyDef[] {
  return widths.map((w) => ({ width: w, shortRow }));
}

export const KEYBOARD_ROWS: KeyDef[][] = [
  row([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], true),
  row([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5]),
  row([1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
  row([1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75]),
  row([2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25]),
  row([1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1]),
];

export interface ThemeColors {
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

export function readTheme(): ThemeColors {
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
