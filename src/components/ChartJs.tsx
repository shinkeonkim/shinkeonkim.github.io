/**
 * ChartJs — MDX에서 Chart.js 차트를 인라인으로 렌더링하는 React 컴포넌트
 *
 * 사용법 (MDX 내부):
 *   <ChartJs client:visible type="bar" data={...} options={...} />
 *
 * Props:
 *   type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'scatter' | 'bubble'
 *   data: Chart.js data object
 *   options: Chart.js options object (optional)
 *   height: CSS height string (default: '320px')
 *   title: chart title shown above (optional)
 *   caption: chart caption shown below (optional)
 */
import { useEffect, useRef } from 'react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  ScatterController,
  BubbleController,
  RadialLinearScale,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  ScatterController,
  BubbleController,
  RadialLinearScale,
);

interface ChartJsProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'scatter' | 'bubble';
  data: unknown;
  options?: unknown;
  height?: string;
  title?: string;
  caption?: string;
}

export default function ChartJs({
  type,
  data,
  options,
  height = '320px',
  title,
  caption,
}: ChartJsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Detect dark mode
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e2e8f0' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#f1f5f9';

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { color: textColor, usePointStyle: true, font: { size: 11 } },
        },
        tooltip: { enabled: true },
      },
      scales:
        type === 'pie' || type === 'doughnut' || type === 'radar' || type === 'polarArea'
          ? undefined
          : {
              x: { grid: { color: gridColor }, ticks: { color: textColor } },
              y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true },
            },
    };

    const merged = deepMerge(defaultOptions, (options as Record<string, unknown>) ?? {});

    chartRef.current = new Chart(canvasRef.current, {
      type,
      data: data as any,
      options: merged as any,
    });

    // Theme toggle 감지
    const observer = new MutationObserver(() => {
      if (chartRef.current) {
        chartRef.current.destroy();
        const nowDark = document.documentElement.classList.contains('dark');
        const tc = nowDark ? '#e2e8f0' : '#1e293b';
        const gc = nowDark ? '#334155' : '#f1f5f9';
        const opts = deepMerge(defaultOptions, (options as Record<string, unknown>) ?? {});
        if (opts.plugins?.legend?.labels) opts.plugins.legend.labels.color = tc;
        if (opts.scales?.x?.ticks) opts.scales.x.ticks.color = tc;
        if (opts.scales?.x?.grid) opts.scales.x.grid.color = gc;
        if (opts.scales?.y?.ticks) opts.scales.y.ticks.color = tc;
        if (opts.scales?.y?.grid) opts.scales.y.grid.color = gc;
        chartRef.current = new Chart(canvasRef.current!, {
          type,
          data: data as any,
          options: opts as any,
        });
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      chartRef.current?.destroy();
    };
  }, [type, data, options]);

  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      {title && <div className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">{title}</div>}
      <div style={{ height, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
      {caption && (
        <div className="mt-2 border-t border-gray-200 pt-2 text-xs italic text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {caption}
        </div>
      )}
    </div>
  );
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
