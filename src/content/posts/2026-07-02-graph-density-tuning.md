---
title: "지식 그래프가 너무 빽빽했다: D3 force simulation 재튜닝"
description: "/graph/ 페이지 노드가 서로 겹쳐 보이는 문제를, 파라미터 스케일링과 초기 zoom-to-fit, 라벨 가시성 게이팅으로 다시 잡은 과정."
date: 2026-07-02
tags: [d3, graph, visualization, force-simulation, astro, tuning]
references:
  - title: "d3-force README"
    url: "https://github.com/d3/d3-force"
    note: "forceLink / forceManyBody / forceCollide / forceX / forceY / forceCenter"
  - title: "Force-Directed Graph, Observable"
    url: "https://observablehq.com/@d3/force-directed-graph"
    author: "Mike Bostock"
---

`/graph/` 페이지를 열 때마다 신경이 쓰였다. 노드들이 화면 가운데에 몰려서 라벨이 서로 겹치고, 400개까지 잘라 보여주는데도 "이게 지식 그래프인지 별똥별인지" 같은 상태가 자주 나왔다. 그날 하루를 잡고 원인을 정리하면서 파라미터부터 초기 뷰까지 손봤다. 그 과정을 기록해 둔다.

## 어떤 상태였나

측정을 시작할 시점의 콘텐츠 규모.

| 컬렉션 | 개수 |
|:---|---:|
| wiki | 853 |
| posts | 79 |
| notes | 10 |
| tags (파생 노드) | 상당수 |

전체 노드는 940개를 넘고, 여기에 태그 노드가 붙는다. `/graph/` 페이지는 `MAX_GRAPH_NODES = 400` 로 잘라서 연결도 상위 400개만 표시한다. 그래도 400개가 560px 세로 캔버스 안에 힘 시뮬레이션으로 배치되니, 라벨이 나란히 뜨면 서로 물리는 게 당연했다.

밀도만 다시 계산해 봐도 답이 나온다.

- 캔버스 넓이 ~ 1024 × 560 = 573,440 px²
- 노드당 평균 면적 = 1,433 px²
- √ 값 ≈ 38 px

노드 하나가 차지할 정사각형이 대략 38 × 38 픽셀. 원 크기(반경 7 px)만 놓고 보면 여유가 있어 보이지만, 라벨 문자열은 짧게는 60 px, 길면 200 px 을 넘는다. **라벨을 고려하는 순간, 최적 배치라 해도 서로 밀 수밖에 없는 크기**다.

## 진단: 원래 파라미터 뽑아 보기

[[D3|d3-force]] 시뮬레이션의 기존 설정은 다음과 같았다.

```ts
d3.forceSimulation<SimNode>(simNodes)
  .alpha(0.6)
  .force('link',
    d3.forceLink<SimNode, SimLink>(simLinks)
      .id((d) => d.id)
      .distance(80)
      .strength(0.4),
  )
  .force('charge',
    d3.forceManyBody<SimNode>()
      .strength((d) => (d.kind === 'tag' ? -260 : -160))
      .distanceMax(400),
  )
  .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
  .force('collide',
    d3.forceCollide<SimNode>().radius((d) => (d.kind === 'tag' ? 10 : 28)),
  );

for (let i = 0; i < 30; i++) simulation.tick();
```

이 상태에서 밀도 문제가 나오는 요인을 하나씩 꼽아 봤다.

1. **`linkDistance = 80`** 이 400개 노드에 비해 짧다. 링크로 연결된 두 노드는 80 px에 안착하려 하고, 링크가 많을수록 서로를 끌어당긴다.
2. **`chargeStrength = -160`** 는 노드 수가 커질수록 상대적으로 약해진다. 반발력을 나눠 갖는 대상이 늘어나기 때문이다.
3. **`distanceMax = 400`** 이 반발 사거리를 제한한다. 400 px 밖의 노드는 서로 밀지 않으니, 큰 그래프에서는 국소 뭉치를 없애기 어렵다.
4. **`forceCenter(cx, cy).strength(0.05)`** 는 이름과 달리 "무게중심을 정확히 (cx, cy) 로 옮기는" 힘이다. `chargeStrength` 로 벌려 놓은 걸 매 tick 마다 다시 안쪽으로 눌러 담는다.
5. **`collideRadius = 28`** (문서 노드) 은 원 반경 7 px 대비 넉넉해 보이지만, 라벨 폭을 반영하지 못한다.
6. **`preTicks = 30`** 은 초기 정렬에 부족하다. 시뮬레이션이 자리를 못 잡은 상태로 첫 프레임이 나오면 사용자는 그 첫인상을 기억한다.

이 여섯 개 중, 사실상 **모두** 대형 그래프에서 밀도를 키우는 방향으로 걸려 있었다.

## 후보 해법 네 가지

머릿속에서 굴려본 접근이 몇 가지 있었다.

**A. 파라미터를 노드 수에 따라 스케일링한다.**
50개용과 400개용을 하나의 상수 세트로 맞추기는 어렵다. `n` 이 커지면 자동으로 `linkDistance`, `charge`, `collide` 를 키우는 함수를 두는 게 자연스럽다.

**B. 캔버스를 키운다.**
`height = 560` 을 700, 800 로 늘리면 여유는 생긴다. 하지만 그건 문제 자체를 옮길 뿐, 700 개 노드가 들어오면 다시 좁아진다.

**C. 노드를 더 잘라낸다.**
`MAX_GRAPH_NODES = 400` 을 250 정도로 낮추면 시야가 확 밝아지긴 한다. 대신 그래프의 원래 목적 (연결의 전체 지형을 보여주기)이 훼손된다. 최후 수단으로 남겨 둔다.

**D. 초기 뷰포트를 바깥으로 잡는다.**
시뮬레이션이 얼추 자리 잡으면, 그때 bounding box 를 잡아서 그 안이 화면에 들어오도록 zoom transform 을 걸어 준다. 사용자는 처음부터 "전체가 다 보이는" 상태로 시작한다.

A 와 D 를 조합하고, 라벨 가시성을 zoom 레벨에 걸어 두는 방향으로 진행했다. B 는 필요할 때 열어 두기로 하고, C 는 손대지 않았다.

## 파라미터를 함수로 바꾸기

먼저 노드 수에 따라 힘을 재조정할 함수를 추가했다.

```ts
function computeForceParams(n: number) {
  const sizeFactor = Math.max(1, Math.sqrt(n / 60));
  return {
    linkDistance:  Math.round(Math.max(80,  60 * sizeFactor)),
    docCharge:    -Math.round(Math.max(200, 220 * sizeFactor)),
    tagCharge:    -Math.round(Math.max(300, 330 * sizeFactor)),
    docCollide:    Math.round(Math.min(50, Math.max(28, 24 * sizeFactor))),
    centerStrength: Math.max(0.03, 0.08 / sizeFactor),
    preTicks:      Math.min(80, 30 + Math.floor(n / 10)),
  };
}
```

기준을 `n = 60` 근처로 잡은 이유는, 개인 위키 페이지 하나의 인접 그래프(LocalGraph)가 대략 그 규모이기 때문이다. 그 아래에서는 기존 값과 거의 같게, 그 이상에서는 `√(n / 60)` 로 완만하게 늘어난다.

몇 가지 노드 수에 대한 결과를 계산해 봤다.

| n | linkDistance | docCharge | docCollide | preTicks |
|---:|---:|---:|---:|---:|
| 50 | 80 | -220 | 28 | 35 |
| 100 | 80 | -284 | 31 | 40 |
| 200 | 110 | -402 | 44 | 50 |
| 400 | 155 | -568 | 50 | 70 |

`400` 노드 케이스에서 링크가 두 배 가까이 벌어지고 반발력이 3배 넘게 세진다. `preTicks` 도 두 배로 늘려서 첫 프레임의 안정성을 확보한다.

## forceCenter 대신 forceX / forceY

파라미터 다음으로 손댈 곳은 **어떻게 가운데로 모을 것인가** 다.

`forceCenter` 는 매 tick 마다 노드들의 무게중심을 정확히 (cx, cy) 로 옮기는 병진 힘이다. 개별 노드가 어디에 있는지와 상관없이 통째로 밀어서 위치를 맞춘다. 겉으로는 "중앙 정렬" 처럼 보이지만, 반발력으로 벌려 놓은 뭉치를 무게중심 기준으로 다시 원위치로 데려온다. 결과적으로 뭉침이 잘 안 풀린다.

`forceX(cx).strength(s)` + `forceY(cy).strength(s)` 는 성격이 다르다. 각 노드에 대해 "네 좌표를 (cx, cy) 방향으로 살짝 밀어라" 라고만 얘기한다. 강도가 낮을수록 자유롭게 벌어질 수 있고, 반발력과 정면 충돌하지 않는다.

```ts
.force('x', d3.forceX(width / 2).strength(params.centerStrength))
.force('y', d3.forceY(height / 2).strength(params.centerStrength))
```

`centerStrength` 도 `n` 이 커질수록 약해진다 (`0.08 / sizeFactor`). 큰 그래프일수록 중앙으로 덜 당기고, 자연스럽게 퍼지도록 놓아 준다.

## charge 사거리 제한을 풀기

`.distanceMax(400)` 은 반발력의 사거리를 제한한다. Barnes-Hut 근사가 이미 성능을 잡아 주고 있으니, 이 제한을 굳이 둘 필요가 없다. 제거하니 서로 반대편에 있는 뭉치도 아주 약하게나마 서로를 인식하고, 두 뭉치가 겹쳐 뜨는 현상이 줄었다.

`.theta(0.9)` 로 근사 강도만 명시해 뒀다. 기본값과 같지만 향후 튜닝 지점을 눈에 띄게 해 둔다.

`forceCollide` 는 `strength(0.9)` + `iterations(2)` 로 조금 세게 밀었다. 라벨을 완전히 겹치지 않게 만드는 건 어렵지만, 원 자체는 겹치지 않도록.

## 초기 layout 을 넓게 뿌리기

`seedInitialLayout` 은 원래 반지름 `0.4 × min(width, height)` 안에 골든 스파이럴로 노드를 뿌려 준다. 여기에 밀도 스케일을 추가했다.

```ts
const densityScale = Math.max(1, Math.sqrt(n / 80));
const maxRadius = Math.min(width, height) * 0.45 * densityScale;
```

`n = 400` 이면 `densityScale ≈ 2.24`, 즉 초기 뿌림 반지름이 두 배 이상 넓어진다. 노드가 처음부터 화면 바깥까지 나가는 게 오히려 좋다. 시뮬레이션이 안쪽으로 압축하기보다 바깥에서 안쪽으로 정리하는 방향으로 작동한다.

## Zoom-to-fit: 첫 프레임을 "다 보이는" 상태로

파라미터를 아무리 튜닝해도, 초기 뷰포트가 노드 구름의 일부만 잡고 있으면 사용자는 여전히 "복잡하다" 고 느낀다. 그래서 `preTicks` 로 안정화한 뒤 bounding box 를 잡아 초기 zoom transform 을 계산해서 넣어 줬다.

```ts
if (simNodes.length > 20) {
  // 노드 좌표의 min/max 로 bbox 계산
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of simNodes) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;
  if (bboxW > 0 && bboxH > 0) {
    const labelOverhang = 160;
    const padding = 32;
    const kx = (width - padding * 2) / (bboxW + labelOverhang);
    const ky = (height - padding * 2) / bboxH;
    const k = Math.max(0.25, Math.min(1, kx, ky));
    if (k < 1) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const tx = width / 2 - centerX * k;
      const ty = height / 2 - centerY * k;
      const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
      svg.call(zoom.transform, initialTransform);
    }
  }
}
```

- `labelOverhang = 160` 은 문서 노드 라벨이 노드 중심에서 오른쪽으로 얼마나 뻗는지를 반영한 값이다. 최대 라벨 길이를 재서 나온 실측 근사치.
- 최소 스케일을 `0.25` 로 잡아서 아주 큰 그래프에서도 완전히 짓눌리진 않게 했다. `scaleExtent` 하한도 `0.3 → 0.2` 로 살짝 넓혀 뒀다.
- `if (k < 1)` 로 감쌌기 때문에 작은 그래프 (LocalGraph 처럼 20 개 이하) 에서는 zoom 이 걸리지 않고 자연 크기로 뜬다.

## 라벨은 zoom 이 낮으면 숨긴다

zoom 이 낮은 상태에서 400개 라벨이 다 떠 있으면 여전히 어지럽다. 그래서 라벨 가시성을 스케일에 걸어 두었다.

```ts
const LABEL_ZOOM_THRESHOLD = 0.55;

const zoom = d3.zoom<SVGSVGElement, unknown>()
  .scaleExtent([0.2, 4])
  .on('zoom', (event) => {
    root.attr('transform', event.transform.toString());
    const showLabels = event.transform.k >= LABEL_ZOOM_THRESHOLD;
    root
      .selectAll<SVGTextElement, SimNode>('.graph-nodes text')
      .style('display', showLabels ? '' : 'none');
  });
```

`0.55` 미만이면 라벨을 감춰서 구조 (원, 색, 링크) 만 보이게 한다. 사용자가 궁금한 영역으로 zoom-in 하면 라벨이 자연스럽게 나타난다. **초기 zoom-to-fit 이 이 임계값 밑이라면 곧바로 라벨 없는 상태로 시작**하므로, 첫인상이 훨씬 깨끗해진다.

이 방식의 좋은 점은 코드 한 조각으로 두 가지를 동시에 잡는다는 것이다.

- 대형 그래프의 초기 뷰: 라벨 없이 지형만
- 사용자의 zoom-in: 관심 영역만 라벨 노출

전역 상태를 따로 두지 않고 zoom 이벤트 하나로 처리했다.

## 3D 뷰도 살짝

3D `Graph3D` 는 Fibonacci sphere 로 초기 위치를 잡는다. 반지름 스케일이 `Math.max(80, 14 × ∛n)` 이었는데, 400개면 반지름 103. 3D 인 만큼 부피 배분이 유리하지만 그래도 좁았다. 계수를 올려서 `Math.max(120, 22 × ∛n)` 로 바꿨고, 400개에서 반지름은 162 정도가 된다. 3D 는 원래 시각적으로 여유가 있어서 이 정도만으로 눈에 띄게 깔끔해졌다.

## 되돌아보기

이 튜닝은 전형적인 "d3 힘 시뮬레이션은 마법이 아니다" 이야기다. 잘 안 되면 원인은 대부분 몇 가지로 좁혀진다.

- 링크 거리와 반발력이 노드 수에 비해 작다.
- 중앙 정렬 힘이 반발력과 정면으로 싸운다.
- 초기 뷰포트가 노드 구름 대비 좁다.
- 라벨을 다 보여 주려고 하다가 시각 정보가 오히려 사라진다.

`n` 기반 스케일링 + `forceX`/`forceY` + zoom-to-fit + zoom 게이팅. 이 네 가지는 개인 지식 그래프 스케일에서는 거의 항상 통하는 조합이었다. 다음에 또 비슷한 문제를 만나면 아마 같은 순서로 열게 될 것 같다.

남은 아이디어는 두 가지.

1. **연결도 기반 라벨 필터**: 저 zoom 상태에서도 "허브 노드" 라벨은 남겨서 지형 파악을 돕는다.
2. **커뮤니티 감지 후 클러스터 색상**: 카테고리가 아니라 실제 연결 구조에 따라 뭉치별로 색을 부여.

둘 다 재미있지만 이번 문제의 표층은 대체로 해결됐으니, 그 두 개는 다음 반복으로 넘긴다.
