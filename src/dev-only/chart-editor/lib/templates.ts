export interface ChartTemplate {
  type: string;
  data: unknown;
  options: unknown;
}

export const CHART_TEMPLATES: Record<string, ChartTemplate> = {
  'Line (기본)': {
    type: 'line',
    data: {
      labels: ['A', 'B', 'C', 'D', 'E'],
      datasets: [
        {
          label: '시리즈1',
          data: [10, 20, 15, 30, 25],
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
        },
      ],
    },
    options: { scales: { y: { beginAtZero: true } } },
  },
  'Bar (비교)': {
    type: 'bar',
    data: {
      labels: ['PostgreSQL', 'MySQL'],
      datasets: [
        {
          label: '실행 시간 (ms)',
          data: [0.07, 148],
          backgroundColor: ['#3b82f6', '#ef4444'],
          borderRadius: 6,
        },
      ],
    },
    options: { plugins: { legend: { display: false } } },
  },
  'Line (Log Scale)': {
    type: 'line',
    data: {
      labels: ['n=1', 'n=3', 'n=5', 'n=10', 'n=20', 'n=50'],
      datasets: [
        {
          label: 'UNION ALL',
          data: [0.002, 0.006, 0.013, 0.028, 0.055, 0.158],
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: 'OR',
          data: [0.002, 40.35, 44.55, 56.15, 80.5, 147.0],
          borderColor: '#22c55e',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      scales: { y: { type: 'logarithmic', title: { display: true, text: 'ms (log)' } } },
    },
  },
  'Horizontal Bar': {
    type: 'bar',
    data: {
      labels: ['MySQL 5.7', 'MySQL 8.0', 'MySQL 8.4'],
      datasets: [
        {
          label: 'ms',
          data: [619, 52, 56],
          backgroundColor: ['#fca5a5', '#fb923c', '#f59e0b'],
          borderRadius: 6,
        },
      ],
    },
    options: { indexAxis: 'y', plugins: { legend: { display: false } } },
  },
  Pie: {
    type: 'pie',
    data: {
      labels: ['Index Scan', 'Full Scan'],
      datasets: [{ data: [3, 97], backgroundColor: ['#3b82f6', '#ef4444'] }],
    },
    options: {},
  },
};
