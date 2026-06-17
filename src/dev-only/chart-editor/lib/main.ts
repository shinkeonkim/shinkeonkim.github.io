import { CHART_TEMPLATES } from './templates';

interface ChartInstance {
  destroy: () => void;
  update: () => void;
  data: unknown;
  options: unknown;
  config: { type: string };
}

declare global {
  interface Window {
    Chart: new (canvas: HTMLCanvasElement, config: object) => ChartInstance;
  }
}

const RADIAL = new Set(['pie', 'doughnut', 'radar', 'polarArea']);

interface ThemeColors {
  text: string;
  grid: string;
}

function readThemeColors(): ThemeColors {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    text: isDark ? '#e2e8f0' : '#1e293b',
    grid: isDark ? '#334155' : '#f1f5f9',
  };
}

function buildOptions(
  type: string,
  userOptions: Record<string, unknown> | null,
  colors: ThemeColors,
): Record<string, unknown> {
  const user = (userOptions ?? {}) as Record<string, unknown>;
  const userPlugins = (user.plugins ?? {}) as Record<string, unknown>;
  const userLegend = (userPlugins.legend ?? {}) as Record<string, unknown>;
  const userLegendLabels = (userLegend.labels ?? {}) as Record<string, unknown>;
  const userTooltip = (userPlugins.tooltip ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: false,
    ...user,
    plugins: {
      ...userPlugins,
      legend: {
        position: 'bottom',
        ...userLegend,
        labels: {
          usePointStyle: true,
          font: { size: 11 },
          ...userLegendLabels,
          color: colors.text,
        },
      },
      tooltip: { enabled: true, ...userTooltip },
    },
  };
  if (!RADIAL.has(type)) {
    const userScales = (user.scales ?? {}) as Record<string, Record<string, unknown>>;
    const userX = userScales.x ?? {};
    const userY = userScales.y ?? {};
    merged.scales = {
      ...userScales,
      x: {
        ...userX,
        grid: { ...((userX.grid as object) ?? {}), color: colors.grid },
        ticks: { ...((userX.ticks as object) ?? {}), color: colors.text },
      },
      y: {
        ...userY,
        grid: { ...((userY.grid as object) ?? {}), color: colors.grid },
        ticks: { ...((userY.ticks as object) ?? {}), color: colors.text },
      },
    };
  }
  return merged;
}

export function initChartEditor(): void {
  let chartInstance: ChartInstance | null = null;
  let renderTimer: ReturnType<typeof setTimeout> | null = null;

  const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  const typeSel = byId<HTMLSelectElement>('chart-type');
  const titleInput = byId<HTMLInputElement>('chart-title');
  const captionInput = byId<HTMLInputElement>('chart-caption');
  const heightInput = byId<HTMLInputElement>('chart-height');
  const dataInput = byId<HTMLTextAreaElement>('data-input');
  const optionsInput = byId<HTMLTextAreaElement>('options-input');
  const dataError = byId<HTMLElement>('data-error');
  const optionsError = byId<HTMLElement>('options-error');
  const canvas = byId<HTMLCanvasElement>('chart-canvas');
  const canvasContainer = canvas.parentElement as HTMLElement;
  const previewTitle = byId<HTMLElement>('chart-preview-title');
  const previewCaption = byId<HTMLElement>('chart-preview-caption');
  const snippetOutput = byId<HTMLElement>('snippet-output');

  function loadTemplate(name: string): void {
    const t = CHART_TEMPLATES[name];
    if (!t) return;
    typeSel.value = t.type;
    dataInput.value = JSON.stringify(t.data, null, 2);
    optionsInput.value = JSON.stringify(t.options, null, 2);
    renderChart();
  }

  function applyHeight(): void {
    const h = (heightInput.value || '280px').trim();
    canvasContainer.style.height = h;
  }

  function applyTitleCaption(): void {
    const t = titleInput.value.trim();
    const c = captionInput.value.trim();
    if (t) {
      previewTitle.textContent = t;
      previewTitle.hidden = false;
    } else {
      previewTitle.textContent = '';
      previewTitle.hidden = true;
    }
    if (c) {
      previewCaption.textContent = c;
      previewCaption.hidden = false;
    } else {
      previewCaption.textContent = '';
      previewCaption.hidden = true;
    }
  }

  function renderChart(): void {
    applyHeight();
    applyTitleCaption();

    const type = typeSel.value;
    const dataStr = dataInput.value;
    const optStr = optionsInput.value || '{}';

    dataError.textContent = '';
    optionsError.textContent = '';

    let data: unknown;
    let options: Record<string, unknown>;
    try {
      data = JSON.parse(dataStr);
    } catch (e) {
      dataError.textContent = 'JSON 파싱 에러: ' + (e as Error).message;
      return;
    }
    try {
      options = JSON.parse(optStr);
    } catch (e) {
      optionsError.textContent = 'JSON 파싱 에러: ' + (e as Error).message;
      return;
    }

    const colors = readThemeColors();
    const merged = buildOptions(type, options, colors);

    if (chartInstance && chartInstance.config.type === type) {
      chartInstance.data = data;
      chartInstance.options = merged;
      chartInstance.update();
    } else {
      chartInstance?.destroy();
      chartInstance = new window.Chart(canvas, { type, data, options: merged });
    }

    generateSnippet(type, data, options);
  }

  function scheduleRender(): void {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderChart, 200);
  }

  function generateSnippet(type: string, data: unknown, options: Record<string, unknown>): void {
    const title = titleInput.value.trim();
    const caption = captionInput.value.trim();
    const height = (heightInput.value || '280px').trim();
    const dataStr = JSON.stringify(data);
    const optStr =
      options && Object.keys(options).length ? `\n  options={${JSON.stringify(options)}}` : '';
    const titleStr = title ? `\n  title=${JSON.stringify(title)}` : '';
    const captionStr = caption ? `\n  caption=${JSON.stringify(caption)}` : '';
    const heightStr = height && height !== '280px' ? `\n  height="${height}"` : '';
    snippetOutput.textContent = `<ChartJs
  client:visible
  type="${type}"${titleStr}${captionStr}${heightStr}
  data={${dataStr}}${optStr}
/>`;
  }

  function copySnippet(btn: HTMLButtonElement): void {
    const text = snippetOutput.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent ?? '';
      btn.textContent = '✓ 복사됨!';
      setTimeout(() => {
        btn.textContent = orig;
      }, 1500);
    });
  }

  document.querySelectorAll<HTMLButtonElement>('.tpl-btn').forEach((btn) => {
    btn.addEventListener('click', () => loadTemplate(btn.dataset.template ?? ''));
  });
  typeSel.addEventListener('change', renderChart);
  for (const el of [titleInput, captionInput, heightInput, dataInput, optionsInput]) {
    el.addEventListener('input', scheduleRender);
  }
  byId<HTMLButtonElement>('btn-copy').addEventListener('click', (e) =>
    copySnippet(e.currentTarget as HTMLButtonElement),
  );

  const themeObserver = new MutationObserver(() => {
    if (chartInstance) renderChart();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  loadTemplate('Line (기본)');
}
