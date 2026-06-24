# Chart 작성 가이드

Chart.js 4 기반 차트 컴포넌트. `.mdx` 파일에 인라인으로 작성. 별도 데이터 파일 없음.

## 컴포넌트: `<ChartJs />`

### 기본 사용

```mdx
<ChartJs
  client:visible
  type="bar"
  data={{
    labels: ['A', 'B', 'C'],
    datasets: [{
      label: '데이터',
      data: [10, 20, 15],
      backgroundColor: '#3b82f6'
    }]
  }}
/>
```

**필수 속성**:
- `client:visible` - Astro 클라이언트 hydration directive (반드시 포함)
- `type` - 차트 타입
- `data` - Chart.js data 객체

**선택 속성**:
- `options` - Chart.js options (Record<string, unknown>)
- `title` - 차트 위 제목 (string)
- `caption` - 차트 아래 설명 (string, 이탤릭)
- `height` - 차트 높이 (string, 기본 `'320px'`)

### Auto-import

`astro.config.mjs` 의 `astro-auto-import` 가 모든 MDX 파일에 자동 import. **별도 `import` 문 불필요**.

## 지원 차트 타입

| 타입 | 설명 | 축 (scales) 사용 |
|:---|:---|:---:|
| `bar` | 막대 차트 (수직/수평) | ✅ |
| `line` | 선 차트 | ✅ |
| `scatter` | 산점도 | ✅ |
| `bubble` | 버블 차트 | ✅ |
| `pie` | 원형 차트 | ❌ |
| `doughnut` | 도넛 차트 | ❌ |
| `radar` | 레이더 차트 | ❌ |
| `polarArea` | 극좌표 영역 차트 | ❌ |

**중요**: pie/doughnut/radar/polarArea (radial 타입)는 `options.scales` 를 사용하지 않음.

## Data 객체 스키마

### 공통 구조

```typescript
data = {
  labels: string[],                  // X축 레이블 또는 카테고리
  datasets: Array<{
    label: string,                   // 범례 표시명
    data: number[] | {x, y}[] | {x, y, r}[],
    backgroundColor: string | string[],
    borderColor: string | string[],
    borderWidth: number,
    // 타입별 추가 속성 (아래 참조)
  }>
}
```

### Bar / Line dataset

```jsx
{
  label: '시리즈명',
  data: [10, 20, 15],
  backgroundColor: '#3b82f6',     // 막대/영역 색
  borderColor: '#3b82f6',         // 테두리 색
  borderWidth: 2,                 // 테두리 두께
  borderRadius: 6,                // bar 만: 모서리 둥글기
  tension: 0.3,                   // line 만: 곡선 부드러움 (0~1)
  pointRadius: 4,                 // line 만: 점 크기
  fill: true                      // line 만: 영역 채우기
}
```

### Pie / Doughnut dataset

```jsx
{
  data: [30, 70],                              // 값만 (labels 사용)
  backgroundColor: ['#3b82f6', '#ef4444'],
  borderColor: '#fff',
  borderWidth: 2
}
```

### Scatter / Bubble dataset

```jsx
{
  label: '데이터',
  data: [
    { x: 10, y: 20 },              // scatter
    { x: 15, y: 25, r: 10 }        // bubble (r = 반지름)
  ],
  backgroundColor: '#3b82f6',
  pointRadius: 5
}
```

## Options 객체 (Chart.js 표준)

### 자동 적용되는 기본값

프로젝트가 다음을 자동 병합 (사용자 옵션이 덮어쓸 수 있음):

```jsx
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        font: { size: 11 },
        color: isDark ? '#e2e8f0' : '#1e293b'      // 테마 자동
      }
    },
    tooltip: { enabled: true }
  },
  // bar/line/scatter/bubble 만 (radial 제외)
  scales: {
    x: { grid: { color: ... }, ticks: { color: ... } },
    y: { grid: { color: ... }, ticks: { color: ... } }
  }
}
```

### 자주 사용하는 옵션

```jsx
options={{
  // 수평 막대 (bar 만)
  indexAxis: 'y',
  
  // 축 설정
  scales: {
    x: {
      type: 'linear' | 'logarithmic' | 'category',
      beginAtZero: true,
      title: { display: true, text: 'X축 이름' }
    },
    y: {
      type: 'linear' | 'logarithmic',
      beginAtZero: true,
      title: { display: true, text: 'Y축 이름' }
    }
  },
  
  // 플러그인
  plugins: {
    legend: {
      display: false,                         // 범례 숨김
      position: 'top' | 'bottom' | 'left' | 'right'
    },
    title: { display: true, text: '차트 제목' }
  }
}}
```

## 다크모드 자동 지원

`<html class="dark">` 토글을 MutationObserver 로 감지 → 차트 텍스트/그리드 색상 자동 업데이트. 사용자 옵션의 color 는 강제로 테마 색상으로 덮어씌워짐.

## 작성 패턴

### 패턴 A: 단순 막대 차트

```mdx
<ChartJs
  client:visible
  type="bar"
  title="월별 방문자"
  data={{
    labels: ['1월', '2월', '3월', '4월'],
    datasets: [{
      label: '방문자 수',
      data: [1200, 1500, 1800, 2100],
      backgroundColor: '#3b82f6',
      borderRadius: 6
    }]
  }}
/>
```

### 패턴 B: 수평 막대 + 로그 스케일

```mdx
<ChartJs
  client:visible
  type="bar"
  title="프로세서 종류별 메모리 대역폭 (GB/s, log scale)"
  caption="DDR5 한 채널 대비 HBM3e 8 stack은 약 90배"
  height="280px"
  data={{
    labels: ['DDR5', 'LPDDR5X', 'Apple M4 Max', 'NVIDIA H100', 'TPU v6', 'NVIDIA B200'],
    datasets: [{
      label: 'GB/s',
      data: [89, 100, 546, 3350, 1640, 8000],
      backgroundColor: ['#3b82f6', '#9333ea', '#6366f1', '#16a34a', '#d97706', '#dc2626'],
      borderRadius: 6
    }]
  }}
  options={{
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: {
        type: 'logarithmic',
        title: { display: true, text: 'GB/s (log)' }
      }
    }
  }}
/>
```

### 패턴 C: 다중 시리즈 선 차트

```mdx
<ChartJs
  client:visible
  type="line"
  title="응답 시간 비교"
  data={{
    labels: ['v1.0', 'v1.1', 'v1.2', 'v1.3', 'v1.4'],
    datasets: [
      {
        label: 'p50',
        data: [120, 110, 100, 95, 90],
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4
      },
      {
        label: 'p99',
        data: [350, 320, 280, 250, 220],
        borderColor: '#dc2626',
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: 4
      }
    ]
  }}
  options={{
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'ms' }
      }
    }
  }}
/>
```

### 패턴 D: Doughnut (구성 비율)

```mdx
<ChartJs
  client:visible
  type="doughnut"
  title="기술 스택 비율"
  height="280px"
  data={{
    labels: ['TypeScript', 'CSS', 'Astro', '기타'],
    datasets: [{
      data: [55, 20, 15, 10],
      backgroundColor: ['#3178c6', '#2965f1', '#ff5d01', '#94a3b8'],
      borderColor: '#fff',
      borderWidth: 2
    }]
  }}
/>
```

## Chart Editor (시각적 편집)

dev 모드에서 시각적으로 차트 생성:

1. `bun dev`
2. `http://localhost:4321/_chart-editor` 접속 (또는 dev 네비 바의 "📊 차트")
3. 차트 타입 선택, 데이터 JSON 입력
4. 실시간 미리보기
5. **"📋 MDX 복사"** 버튼으로 클립보드 복사
6. MDX 파일에 붙여넣기

5개 내장 템플릿: Line / Bar / Line (Log Scale) / Horizontal Bar / Pie.

## 작성 시 주의사항

### 1. `client:visible` 반드시 포함

빠뜨리면 차트가 SSR 시점에 렌더되어 차트 라이브러리 클라이언트 코드 실행 안 됨.

### 2. JSON 데이터는 인라인

별도 파일로 분리하지 않음 (간단한 차트는 인라인이 효율적).

### 3. Radial 차트에 `scales` 사용 금지

pie / doughnut / radar / polarArea 는 축 없음. `options.scales` 추가하면 Chart.js 에러.

### 4. 색상은 hex 또는 rgba

테마 자동 대응이 색상을 강제 덮어쓰므로, 색상 지정은 자유롭게 사용 가능.

### 5. 높이는 명시적으로

`height="280px"` 같이 명시. 기본값 320px 이지만 차트 종류/데이터에 따라 조정.

## 실제 예시 파일

- CPU/GPU/TPU/NPU 비교 (수평 막대 + 로그 스케일): [src/content/posts/2026-06-16-cpu-gpu-tpu-npu.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/2026-06-16-cpu-gpu-tpu-npu.mdx)
- SQL 벤치마크 (다중 시리즈 선 차트): [src/content/posts/2026-06-13-sparse-column-benchmark-01.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/2026-06-13-sparse-column-benchmark-01.mdx)
- 브라우저 통신 (수평 막대): [src/content/posts/2026-06-16-browser-communication.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/2026-06-16-browser-communication.mdx)

## 검증 체크리스트

- [ ] `client:visible` 포함
- [ ] `type` 명시
- [ ] `data.labels` 와 `data.datasets` 둘 다 작성
- [ ] Radial 차트면 `options.scales` 사용 안 함
- [ ] 색상이 hex `#RRGGBB` 또는 rgba (테마 대응 정상)
- [ ] em-dash 사용 안 함
- [ ] MDX 파일에서 사용 (`.md` 불가)

## 참고 파일

- 컴포넌트: [src/widgets/chart-js/ChartJs.tsx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/widgets/chart-js/ChartJs.tsx)
- Editor UI: [src/dev-only/chart-editor/chart-editor.astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/dev-only/chart-editor/chart-editor.astro)
- Editor 로직: [src/dev-only/chart-editor/lib/main.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/dev-only/chart-editor/lib/main.ts)
- 내장 템플릿: [src/dev-only/chart-editor/lib/templates.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/dev-only/chart-editor/lib/templates.ts)
- Chart.js 공식 문서: https://www.chartjs.org/docs/4.5.1/
