/**
 * ChartJs — MDX에서 Chart.js 차트를 인라인으로 렌더링하는 React 컴포넌트.
 *
 * MDX 사용 예:
 *   <ChartJs client:visible type="bar" data={...} options={...} title="..." caption="..." />
 *
 * MDX 의 `data={{...}}` / `options={{...}}` 는 매 렌더마다 새 object reference
 * 가 되므로 JSON.stringify 로 dependency key 를 안정화하고, type 이 바뀌지
 * 않는 한 chart instance 를 유지한 채 `chart.update()` 로만 갱신한다.
 * (Chart.js 는 type 변경 시 instance 재생성을 요구한다.) 테마 토글도
 * destroy 하지 않고 색만 다시 입힌다.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { ChartData, ChartOptions, ChartType } from 'chart.js';
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

type SupportedType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'scatter' | 'bubble';

interface ChartJsProps {
  type: SupportedType;
  data: unknown;
  options?: unknown;
  height?: string;
  title?: string;
  caption?: string;
}

const RADIAL_TYPES: ReadonlySet<SupportedType> = new Set(['pie', 'doughnut', 'radar', 'polarArea']);

function readThemeColors(): { text: string; grid: string } {
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return {
    text: isDark ? '#e2e8f0' : '#1e293b',
    grid: isDark ? '#334155' : '#f1f5f9',
  };
}

function buildOptions(
  type: SupportedType,
  userOptions: Record<string, unknown> | undefined,
  colors: { text: string; grid: string },
): ChartOptions {
  const user = userOptions ?? {};
  const userPlugins = (user.plugins as Record<string, unknown> | undefined) ?? {};
  const userLegend = (userPlugins.legend as Record<string, unknown> | undefined) ?? {};
  const userLegendLabels = (userLegend.labels as Record<string, unknown> | undefined) ?? {};
  const userTooltip = (userPlugins.tooltip as Record<string, unknown> | undefined) ?? {};

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

  if (!RADIAL_TYPES.has(type)) {
    const userScales = (user.scales as Record<string, Record<string, unknown>> | undefined) ?? {};
    const userX = userScales.x ?? {};
    const userY = userScales.y ?? {};
    const userXGrid = (userX.grid as Record<string, unknown> | undefined) ?? {};
    const userXTicks = (userX.ticks as Record<string, unknown> | undefined) ?? {};
    const userYGrid = (userY.grid as Record<string, unknown> | undefined) ?? {};
    const userYTicks = (userY.ticks as Record<string, unknown> | undefined) ?? {};

    merged.scales = {
      ...userScales,
      x: {
        ...userX,
        grid: { ...userXGrid, color: colors.grid },
        ticks: { ...userXTicks, color: colors.text },
      },
      y: {
        ...userY,
        grid: { ...userYGrid, color: colors.grid },
        ticks: { ...userYTicks, color: colors.text },
      },
    };
  }

  return merged as ChartOptions;
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

  const dataKey = useMemo(() => JSON.stringify(data ?? null), [data]);
  const optionsKey = useMemo(() => JSON.stringify(options ?? null), [options]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const colors = readThemeColors();
    const parsedData = JSON.parse(dataKey) as ChartData;
    const parsedOptions = JSON.parse(optionsKey) as Record<string, unknown> | null;
    const builtOptions = buildOptions(type, parsedOptions ?? undefined, colors);

    chartRef.current = new Chart(canvasRef.current, {
      type: type as ChartType,
      data: parsedData,
      options: builtOptions,
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [type]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const colors = readThemeColors();
    const parsedData = JSON.parse(dataKey) as ChartData;
    const parsedOptions = JSON.parse(optionsKey) as Record<string, unknown> | null;
    const builtOptions = buildOptions(type, parsedOptions ?? undefined, colors);
    chart.data = parsedData;
    chart.options = builtOptions;
    chart.update();
  }, [dataKey, optionsKey, type]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const chart = chartRef.current;
      if (!chart) return;
      const colors = readThemeColors();
      const parsedOptions = JSON.parse(optionsKey) as Record<string, unknown> | null;
      chart.options = buildOptions(type, parsedOptions ?? undefined, colors);
      chart.update('none');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [type, optionsKey]);

  return (
    <div className="my-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      {title && <div className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">{title}</div>}
      <div style={{ height, position: 'relative', width: '100%' }}>
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
