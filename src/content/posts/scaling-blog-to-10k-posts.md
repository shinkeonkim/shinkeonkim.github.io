---
title: "1만 개의 글에서도 빠르게: 블로그 빌드 성능 최적화 회고"
description: "Astro 블로그가 1만 개 문서를 안전하게 다루기 위해 O(N²) 빌드 병목을 잡고 그래프/검색을 손본 과정과 교훈."
date: 2026-05-23
updated: 2026-05-23
tags: [perf, build, astro, optimization, retrospective]
references:
  - id: astro-docs
    note: "Content Collections, Pagefind, View Transitions 가이드"
  - title: "Pagefind 공식 문서"
    url: "https://pagefind.app"
    note: "정적 사이트 검색"
---

새 블로그를 막 띄운 다음, 곧바로 한 가지가 신경 쓰였다.

> 지금은 글이 몇 개뿐이지만, 1만 개로 늘어나면 빌드와 검색이 버틸까?

오래 운영할 블로그라면 답은 "버텨야 한다" 다. 마침 더미 글을 잔뜩 만들어 빌드를 돌려본 김에, 어떤 함정에 빠졌고 어떻게 빠져나왔는지 기록해 둔다.

## 어쩌다 1만 개를 측정하게 되었나

새 [[Astro]] 블로그에 다음 기능을 차례대로 붙였다.

- 마크다운 + 위키링크 + 백링크
- D3 기반 [[D3|지식 그래프]]
- 다크/라이트 모드
- [[Pagefind]] 통합 검색
- `paginate()` 로 글/노트/위키 페이지네이션
- `react-force-graph-3d` 로 3D 그래프 뷰

여기까지는 글이 두세 개뿐이라 모든 게 즉시 끝났다. 그래도 1만 개 시나리오에서 어떻게 되는지 보기 위해 10,000 개의 더미 마크다운을 생성하고 `pnpm build` 를 돌렸다.

> [!WARNING]
> 빌드가 **돌아오지 않았다**. 몇 분이 지나도 끝날 기미가 안 보였다. 강제로 종료.

여기서 "그래도 1만 개면 좀 오래 걸리겠지" 하고 그냥 기다리는 건 위험하다. 정상적으로 끝날 수 없는 코드일 가능성이 더 크기 때문이다.

## 진단: 무엇이 폭주했는가

빌드 단계별 로그를 보니 각 글 페이지를 그릴 때마다 몇십 ms씩 추가로 시간이 늘어났다. 진짜 범인은 `Backlinks.astro` 였다.

```astro
---
import { getCollection } from 'astro:content';

const { slug, collection } = Astro.props;
const candidates = [slug, slug.toLowerCase()];

for (const col of ['posts', 'notes', 'wiki'] as const) {
  const entries = await getCollection(col);
  for (const entry of entries) {
    const body = entry.body ?? '';
    const re = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      const target = m[1].trim();
      if (candidates.includes(target) || candidates.includes(target.toLowerCase())) {
        matches.push({ ... });
      }
    }
  }
}
---
```

이 컴포넌트는 **글 페이지 한 장을 그릴 때마다** 모든 컬렉션의 모든 본문을 정규식으로 스캔한다.

- 한 페이지당 비용: O(N × 평균 본문 길이)
- 페이지 수: N
- 전체 비용: **O(N²)**

1만 글, 평균 본문 500자라면 어림 잡아 *50억 회의 정규식 매칭*. JS 정규식이 초당 1억 문자를 처리한다고 가정하면 50초가 아니라, 매 페이지가 그 비용을 통째로 다시 치르므로 누적되어 **수십 분에서 시간 단위**까지 늘어난다.

> [!IMPORTANT]
> 빌드 타임에 O(N²) 가 들어와 있으면 N 이 두 자리 수일 때까지는 **눈에 보이지 않는다**. 100 → 1만으로 N 이 100배 커지면 작업은 1만 배가 된다. 처음부터 빌드 시점 비용은 페이지당이 아니라 *프로젝트당* 으로 가져가는 편이 안전하다.

## 설계: 콘텐츠 그래프를 한 번만 만든다

해결 방향은 단순했다.

1. 전체 컬렉션을 **딱 한 번** 순회하면서 `{nodes, links, backlinks, slugMap}` 인덱스를 만든다.
2. 그 인덱스를 모듈 레벨 `Promise` 에 캐시한다, 모든 페이지 렌더가 같은 인덱스를 본다.
3. 백링크는 Map 조회 한 번으로 끝낸다.

```ts
// src/lib/content-graph.ts (요약)
let cache: Promise<ContentGraph> | null = null;

export function getContentGraph(): Promise<ContentGraph> {
  if (!cache) cache = build();
  return cache;
}

async function build(): Promise<ContentGraph> {
  const [posts, notes, wiki] = await Promise.all([
    getCollection('posts', ({ data }) => !data.draft),
    getCollection('notes'),
    getCollection('wiki'),
  ]);

  const slugMap = new Map<string, ContentNode>();
  const backlinks = new Map<string, ContentNode[]>();

  for (const entry of [...posts, ...wiki, ...notes]) {
    /* 모든 별칭/제목/슬러그 → 노드 매핑 추가 */
  }

  for (const entry of [...posts, ...wiki, ...notes]) {
    /* body 한 번 스캔, 위키링크 → backlinks 에 누적 */
  }

  return { nodes, links, backlinks, slugMap };
}
```

그리고 백링크 컴포넌트는 이렇게 단순해진다.

```astro
---
import { getContentGraph, canonicalId } from '../lib/content-graph';

const { slug, collection } = Astro.props;
const graph = await getContentGraph();
const matches = graph.backlinks.get(canonicalId(collection, slug)) ?? [];
---
```

복잡도가 **O(N²)** 에서 **O(N) + O(1) 조회 × N 페이지 = O(N)** 으로 떨어졌다.

> [!TIP]
> Astro 의 페이지 컴포넌트는 모듈처럼 평가된다. `Astro:content` 의 `getCollection` 호출 결과도 동일 빌드 내에서는 캐시되지만, **거기서 파생된 계산은 따로 캐시되지 않는다**. 위처럼 직접 만든 인덱스를 모듈 변수에 담아두면 자연스러운 메모이제이션이 된다.

## 그래프 페이지에도 같은 함정이 있다

`src/pages/graph.astro` 도 비슷한 스캔을 하지만 그쪽은 *한 번만* 렌더링되는 페이지라 O(N) 으로 끝났다. 다만 *클라이언트에서* 1만 노드를 D3 force simulation 으로 돌리면 브라우저가 사실상 멈춘다. 빌드는 살아도 사용자 경험이 죽는다.

`MAX_GRAPH_NODES = 400` 상한을 두고, 초과 시 연결도(degree) 상위 N 개만 그리며 안내한다.

```ts
const degree = new Map<string, number>();
for (const link of graph.links) {
  degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
  degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
}

const truncated = graph.nodes.length > MAX_GRAPH_NODES;
const sortedNodes = truncated
  ? [...graph.nodes]
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, MAX_GRAPH_NODES)
  : graph.nodes;
```

연결이 많은 허브 노드부터 보여주는 편이 첫 인상에서 더 의미 있다. 작은 위성 노드들은 그래프에서 어차피 정보량이 적다.

## 측정: 10,531 페이지 / 34.57 초

수정 후 같은 시나리오로 다시 빌드.

| 지표 | 값 |
|------|---:|
| 빌드된 페이지 수 | 10,531 |
| 전체 빌드 시간 | **34.57s** |
| 정적 페이지 생성 단계 | 14.31s |
| Pagefind 인덱싱 | ~10s |
| `dist/` 총 크기 | 189 MB |
| Pagefind 인덱스 크기 | 42 MB (페이지당 ~4.2 KB) |
| Pagefind 검색 (일반 쿼리) | < 100 ms |
| Pagefind 검색 (10K 매치 쿼리) | ~1.2 s |
| 그래프 페이지 SSR | < 50 ms (400 노드 상한) |
| 페이지네이션 페이지 응답 | < 10 ms |

"무한정 → 35 초" 변화의 거의 전부가 **백링크 인덱스를 모듈 캐시로 옮긴 것** 에서 왔다.

> [!NOTE]
> 검색 응답이 가끔 1 초가 넘는 케이스는 *"성능"* 처럼 더미 글 1만 개에 거의 모두 들어 있는 단어를 검색했을 때다. 1만 개 결과를 점수 매기느라 시간이 든다. 실제 운영에서는 한 쿼리가 1만 개 결과를 반환하는 일이 거의 없으므로 무시 가능한 코너 케이스.

## 같이 손본 자잘한 것들

- **Pagefind 메타데이터**: 본문에만 인덱스가 잡히도록 `data-pagefind-body` 를 글/위키/노트 컨테이너에만 붙이고, 헤더·푸터·페이지네이션·홈·소개·그래프 페이지에는 `data-pagefind-ignore="all"` 을 달았다. 검색이 더 정확해지고 인덱스 크기도 줄었다.
- **Section 필터**: `data-pagefind-filter="section:posts/notes/wiki"` 로 검색 UI에서 컬렉션별 필터를 쉽게 제공.
- **3D 그래프 lazy import**: `react-force-graph-3d` 와 `three` 는 무겁다. 2D 가 기본이고, 3D 토글을 누른 순간에만 `React.lazy()` 로 코드를 가져온다.
- **GitHub 스타일 콜아웃**: `> [!NOTE]` `> [!TIP]` `> [!IMPORTANT]` `> [!WARNING]` `> [!CAUTION]` 5종, 지금 이 글에 시연되어 있다.
- **Shiki dual-theme**: 같은 코드 블록이 `github-light` 와 `github-dark` 모두로 토큰화되고, CSS 변수로 테마를 갈아끼우니 다크 모드 토글이 코드 색까지 자연스럽게 따라온다.

## 얻은 교훈

### 1. 빌드 시점 비용은 *프로젝트 단위* 로 묶는다

페이지 컴포넌트 안에서 "전체 콘텐츠를 한 번 훑는" 코드가 보이면, 그건 거의 항상 잘못 둔 자리다. 그 페이지가 K 개 렌더되면 K 번 훑게 된다. 같은 일이라면 **빌드당 한 번만** 끝내고 결과를 공유해야 한다.

### 2. 모듈 레벨 `Promise` 는 단순하지만 강력하다

복잡한 빌드 캐시 인프라 없이도 됐다. ESM 모듈은 한 빌드 안에서 한 번만 평가되므로, 다음 한 줄이면 메모이제이션이 끝난다.

```ts
let cache: Promise<X> | null = null;
export function get() {
  if (!cache) cache = build();
  return cache;
}
```

추상화 단계가 적을수록 디버깅이 쉽다. [[BrainDB]] 같은 외부 도구를 쓸 수 없었던 게 오히려 단순한 해법으로 이끌었다.

### 3. 작은 N 으로 측정하면 **함정을 못 본다**

글 5 개일 때는 백링크 컴포넌트가 25 회 스캔을 했다. 눈에 띄지도 않는다. 안전하게 가려면 *의도적으로 큰 N* 을 만들어 한 번쯤 돌려봐야 한다. 더미 글 생성 스크립트는 30 줄 정도면 충분하다.

```js
// scripts/generate-dummy-posts.mjs (요약)
for (let i = 0; i < COUNT; i++) {
  const rand = rng(i + 1);
  fs.writeFileSync(
    path.join(OUT_DIR, `stress-${String(i + 1).padStart(5, '0')}.md`),
    `---\ntitle: "${title}"\ndate: ${date}\n---\n\n${body}\n`,
  );
}
```

이 한 번의 부하 테스트가 운영 단계에서의 미래의 한 시간짜리 장애를 사전에 막아 준다.

### 4. 빌드를 살려도, 런타임이 살아야 한다

이번에는 그래프 페이지가 좋은 예시였다. 빌드 자체는 1만 노드를 무리 없이 직렬화하지만, 그 데이터를 받은 브라우저는 D3 force tick 첫 번째 프레임에서 죽는다. **빌드 결과를 소비하는 쪽** 의 한계도 같이 봐야 한다.

### 5. 검색은 Pagefind 가 "그냥 동작" 한다

Pagefind 는 빌드된 HTML 을 후처리로 인덱싱한다. 1만 페이지에 대해서도 인덱스가 42 MB, 클라이언트는 청크 단위로만 받아오므로 초기 로드도 가볍다. 한국어 토크나이징도 별도 설정 없이 `<html lang="ko">` 만으로 잘 동작했다.

> [!CAUTION]
> Pagefind 인덱스는 빌드된 HTML 을 읽기 때문에 *HTML 에 보이지 않는 내용은 검색되지 않는다*. 백링크 같은 동적 영역이 SSR 단계에서 잘 렌더되어 있는지 확인하는 게 중요하다. 클라이언트 hydration 으로 채워지는 영역은 검색에 빠진다.

## 마무리

이번 라운드의 변화는 결국 한 가지 룰로 요약된다.

> **빌드 시점에 전체를 훑는 일은, 빌드당 한 번만 한다.**

이 규칙 하나가 1만 페이지 빌드를 *못 끝남* 에서 *35 초 안에 끝남* 으로 바꿨다. 같은 규칙이 위키링크 인덱스([`remark-wikilink.mjs`](https://github.com/shinkeonkim/shinkeonkim.github.io/blob/main/src/plugins/remark-wikilink.mjs))에도, 그래프 데이터([`content-graph.ts`](https://github.com/shinkeonkim/shinkeonkim.github.io/blob/main/src/lib/content-graph.ts))에도, 태그 인덱스에도 적용된다.

앞으로 콘텐츠가 늘어나면서 새로운 병목이 또 보이겠지만, 이번 회고로 일단 만 단위까지는 안심하고 글을 쌓을 수 있게 됐다. 늘 그렇듯, **일단 기록을 하자**.
