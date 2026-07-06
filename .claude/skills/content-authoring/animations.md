# Animation 작성 가이드

자체 구현된 SVG 애니메이션 엔진. `public/animations/{id}.json` 파일로 저장되며 본문에서 ` ```anim:id ` 코드 펜스로 삽입.

> **이 가이드는 요약본입니다.** 전체 스펙 + 모든 element 타입 + 모든 effects + 시각적 컨벤션 + 빠른 시작 템플릿은 [manual-docs/animation-ai-prompt-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/animation-ai-prompt-guide.md) (798줄, 완전 사양서) 를 반드시 참조하세요.

## 파일 위치 / 형식

- **저장 위치**: `public/animations/{id}.json` (단일 파일)
- **id 규칙**: `^[a-z0-9][a-z0-9_-]*$`, 파일명과 일치 필수
- **스키마**: Zod 검증 (`src/entities/animation/engine/schema/`)
- **버전**: 새 애니메이션은 `version: 4` 사용

## 최상위 구조

```jsonc
{
  "version": 4,
  "id": "kebab-case-id",
  "title": "사람이 읽는 제목 (한글 OK)",
  "description": "한 문장 요약",
  "category": "network",        // network | cache | algorithm | architecture | flow | protocol | general
  "tags": ["a", "b"],
  "duration": 5000,             // 전체 타임라인 길이 (ms)
  "canvas": {
    "width": 800,
    "height": 500,
    "background": "transparent"
  },
  "elements": [/* 도형 정의 */],
  "chapters": [/* 타임라인 마커 */],
  "effects": [/* 시각 효과 */],
  "settings": {
    "loop": true,
    "autoplay": true,
    "showCaption": false,
    "showChapterList": false
  }
}
```

## Element 타입 (10가지)

각 element 의 공통 필드:
- `id`: 영소문/숫자/-/_, 고유
- `rotation`: 도 (기본 0)
- `appearances`: 가시성 구간 배열
- `tracks`: 속성 키프레임 배열

### 빠른 레퍼런스

| 타입 | 핵심 속성 | 용도 |
|:---|:---|:---|
| `rect` | x, y, width, height, fill, stroke, cornerRadius, label, subtitle | 노드, 박스, 컨테이너 |
| `circle` | cx, cy, r, fill, label | 메시지, 데이터 패킷 |
| `line` | x1, y1, x2, y2 / fromId, toId, fromAnchor, toAnchor | 연결선 |
| `arrow` | (line 동일) + label, labelOffsetX/Y, curvature, headStart/End | 화살표 |
| `text` | x, y, content, fontSize, fontWeight, color, textAnchor | 라벨, 제목 |
| `image` | x, y, width, height, src | 서비스 아이콘 (simpleicons CDN 활용) |
| `path` | x, y, d (SVG path), fill, stroke | 임의 모양 |
| `polygon` | points ("x1,y1 x2,y2 ...") | 다각형 |
| `group` | x, y, childIds | 요소 묶음 |
| `code` | x, y, width, height, content, language, fontSize, title | 코드 블록 (JS 자동 신택스 하이라이팅) |

상세 props 와 예시는 [manual-docs/animation-ai-prompt-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/animation-ai-prompt-guide.md) 참조.

## Tracks (속성 키프레임)

```jsonc
{
  "property": "cx",
  "keyframes": [
    { "time": 0, "value": 240 },                              // 초기값 (반드시 명시!)
    { "time": 1200, "value": 560, "ease": "easeInOut" }
  ]
}
```

**규칙**:
- `time` 은 `0 ~ duration` 범위 (ms)
- `ease`: `linear` / `easeIn` / `easeOut` / `easeInOut` (기본 `easeInOut`)
- 키프레임은 시간 순으로 정렬

### ⚠️ 함정 #1: time=0 키프레임 반드시 추가

`trackValueAt` 는 `time ≤ kfs[0].time` 일 때 **첫 번째 keyframe 값**을 반환 (정적 prop 값 아님).

```jsonc
// ❌ 잘못된 패턴 - t=0 에서 label 이 "2" 로 표시됨!
{
  "type": "rect", "label": "5",
  "tracks": [
    { "property": "label", "keyframes": [
      { "time": 1500, "value": "2" }              // 단일 키프레임
    ]}
  ]
}

// ✅ 올바른 패턴 - 초기값 명시
{
  "type": "rect", "label": "5",
  "tracks": [
    { "property": "label", "keyframes": [
      { "time": 0, "value": "5" },                // 초기값 명시
      { "time": 1500, "value": "2" }
    ]}
  ]
}
```

**규칙**: element 의 어떤 속성에 `tracks` 추가 시, 첫 항목으로 `{ time: 0, value: <초기값> }` 반드시 포함. 색상, 위치, 텍스트, 너비/높이 모두 적용.

### ⚠️ 함정 #2: 텍스트는 50% 지점에서 갑자기 바뀜

`label`, `content`, `subtitle` 은 보간 없이 50% 지점에서 crossover.

```jsonc
"keyframes": [
  { "time": 1000, "value": "Hello" },
  { "time": 3000, "value": "World" }
]
// t=1000~2000: "Hello"
// t=2000~3000: "World"
```

## Appearances (가시성 구간)

```jsonc
{
  "start": 0,                          // 등장 시작
  "end": 3800,                         // 퇴장 완료
  "entryMode": "fade",                 // instant | fade | slide-up/down/left/right | zoom | pop
  "entryDuration": 300,
  "exitMode": "fade",
  "exitDuration": 300
}
```

- 하나의 element 에 여러 appearance 가능 (재등장)
- `entryMode`/`exitMode` 생략 시 `instant`

## Chapters (타임라인 마커)

```jsonc
"chapters": [
  { "id": "s1", "time": 0, "label": "요청 전송", "subtitle": "" },
  { "id": "s2", "time": 1200, "label": "서버 처리", "subtitle": "" }
]
```

## Effects (시각 효과)

```jsonc
// highlight: 색상 강조
{ "type": "highlight", "id": "eff-1", "elementId": "server", "time": 1200, "color": "#86efac", "duration": 600 }

// pulse: 크기 맥동
{ "type": "pulse", "id": "eff-2", "elementId": "server", "time": 1200, "scale": 1.08, "duration": 600 }

// flow: 입자 흐름 (arrow/line 위)
{ "type": "flow", "id": "eff-3", "elementId": "arrow1", "time": 0, "color": "#facc15", "particles": 3, "radius": 4, "duration": 800 }
```

## 시각적 컨벤션 (재사용 권장)

| 역할 | fill | stroke | label color |
|:---|:---|:---|:---|
| Client | `#dbeafe` | `#3b82f6` | `#1e3a8a` |
| App / Service | `#e0e7ff` | `#6366f1` | `#312e81` |
| DB (관계형) | `#dcfce7` | `#16a34a` | `#14532d` |
| Cache | `#fee2e2` | `#dc2626` | `#7f1d1d` |
| LB / Gateway / Auth | `#fed7aa` | `#ea580c` | `#7c2d12` |
| 요청 dot (forward) | `#facc15` | `#a16207` | - |
| 응답 dot (return) | `#34d399` | `#14532d` | - |
| 강조 highlight | `#facc15` | - | - |
| 성공 highlight | `#86efac` | - | - |
| 실패 highlight | `#f87171` | - | - |

**캔버스 사이즈** (용도별):
- 단순 좌→우 흐름 (2-3 노드): 800 × 360
- 표준 (3-4 노드 + 라벨): 800 × 460 ~ 900 × 460
- 상태머신 / 복잡 다이어그램: 800 × 500 ~ 900 × 500

## 본문에 임베드

`.md` 또는 `.mdx` 어디서나:

```markdown
```anim:my-flow
{}
```
```

빈 `{}` 는 향후 override 용 (현재는 사용 안 함, 그대로 두면 됨).

## 색상 규칙

- **HEX 형식 `#RRGGBB` 만 사용** (named color 'red', rgb() 형식은 보간 불가)
- 색상 보간은 RGB 채널별 선형 보간

## Studio 사용 (시각적 편집)

dev 모드에서 visual 편집:

1. `bun dev`
2. `http://localhost:4321/_studio/` 접속
3. 우상단 **＋ 새 애니메이션** → ID + 제목
4. Element 추가, 드래그로 배치
5. Step 추가, keyframe 만들기
6. 💾 저장 (`⌘S`)

자세한 사용법: [manual-docs/animation-studio-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/animation-studio-guide.md)

## 빠른 시작 템플릿

완전한 v4 템플릿: [manual-docs/animation-ai-prompt-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/animation-ai-prompt-guide.md#빠른-시작-템플릿-v4) 의 "빠른 시작 템플릿" 섹션.

## 자동 검증 (`validate:animations`)

`bun run validate:animations` 가 `prebuild` 에 걸려 있어 아래 항목 중 하나라도 실패하면 빌드 중단:

```bash
bun run validate:animations                           # 전체 검증
bun scripts/validate-animations.mjs --file <path>     # 단일 파일
bun scripts/validate-animations.mjs --json            # JSON 출력
```

**검사 항목** (스키마 파싱 + 시맨틱 체크):

1. JSON 파싱 및 [zod 스키마](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/entities/animation/engine/schema/index.ts) 통과. 스키마는 엔진 loader가 쓰는 것과 동일 소스.
2. `elements[].id`, `chapters[].id`, `effects[].id` 컬렉션 내 중복 없음.
3. 참조 무결성: `line/arrow.fromId`/`toId`, `group.childIds`, `effects[].elementId` 가 실제 element에 존재.
4. 시간 무결성: 모든 `time` / `start` / `end` 가 `0 <= t <= duration` 범위. `appearance.start < appearance.end`.
5. `tracks[].keyframes` 시간순 정렬.
6. 파일명 (`{id}.json`) 이 문서 `id` 와 일치.

### 실전에서 걸린 실수 사례

| 파일 | 실수 | 결과 |
|:---|:---|:---|
| `articulation.json` | 그래프 노드 id 를 `A`, `B`, ... 대문자로 | zod 스키마의 `^[a-z0-9][a-z0-9_-]*$` regex 실패. loader가 `null` 리턴, 페이지 렌더 안 됨. |
| `regions-trick.json` | duration=13000 인데 마지막 appearance.end=14000 | 시간 무결성 위반. 스키마는 통과하지만 runtime에서 unexpected 상태. |

두 파일 다 브라우저에서는 조용히 실패했음. `validate-animations` 가 없었으면 배포됨.

## 검증 체크리스트

- [ ] `id` 가 파일명(`{id}.json`)과 일치
- [ ] `version` 이 `3` 또는 `4` (신규는 `4`)
- [ ] `duration` 설정, 모든 time 값이 `0 ~ duration` 범위
- [ ] 모든 `elements[].id` 가 고유하며 `^[a-z0-9][a-z0-9_-]*$` (**대문자 금지**)
- [ ] `effects[].elementId`, `fromId`/`toId`, `group.childIds` 가 실제 element id
- [ ] 모든 `appearances` 의 `start` < `end`
- [ ] `tracks[].keyframes` 의 `time` 시간순 정렬
- [ ] **각 track 의 첫 keyframe 이 `time: 0` 으로 초기값 명시** (함정 #1)
- [ ] 색은 모두 `#RRGGBB` 형식
- [ ] 좌표가 `canvas.width/height` 범위 내
- [ ] loop 애니메이션은 마지막 keyframe 이 초기 상태로 복귀
- [ ] `bun run validate:animations` 통과

## 테스트

1. `public/animations/{id}.json` 으로 저장
2. `bun run validate:animations --file public/animations/{id}.json` 로 검증
3. `bun dev` 후 `http://localhost:4321/animations/{id}/` 방문
4. 또는 본문에 ` ```anim:{id} ` 코드 펜스로 삽입해 미리보기

## 실제 예시 파일

- `public/animations/redis-cache-hit.json` - 캐시 히트 흐름
- `public/animations/redis-cache-miss.json` - 캐시 미스 흐름
- `public/animations/tcp-handshake.json` - TCP 3-way handshake
- `public/animations/oauth-flow.json` - OAuth 2.0 흐름
- `public/animations/load-balancer.json` - 라운드 로빈
- `public/animations/trie.json` - Trie prefix search

**382개 애니메이션 보유** (v4 91%, v3 9%). `public/animations/` 디렉토리 참조.

## 참고 파일

- 전체 사양서: [manual-docs/animation-ai-prompt-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/animation-ai-prompt-guide.md)
- Studio 가이드: [manual-docs/animation-studio-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/animation-studio-guide.md)
- 스키마 소스: [src/entities/animation/engine/schema/](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/entities/animation/engine/schema/)
- 엔진: [src/entities/animation/engine/engine.tsx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/entities/animation/engine/engine.tsx)
- 플러그인: [src/plugins/remark-animation.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/remark-animation.mjs)
- 자동 검증: [scripts/validate-animations.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/validate-animations.mjs)
