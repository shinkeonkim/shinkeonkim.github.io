# 애니메이션 상세 페이지 역방향 참조(Backlinks) 기능

## 목표

`/animations/<id>/` 상세 페이지에서, 해당 애니메이션을 사용(`` ```anim:<id> `` 코드 펜스로 삽입)하는 모든 콘텐츠(posts, wiki, notes)를 역방향 참조 목록으로 노출한다.

요구 조건:
- ✅ GitHub Pages 정적 배포에서 동작 (런타임 DB/서버 불가, 빌드 타임에 모든 데이터 확정)
- ✅ 로컬 개발 환경(`bun dev`)에서도 동일하게 동작
- ✅ 기존 디자인/패턴과 일관성 유지 (포스트의 `Backlinks.astro` UI)
- ✅ 기존 빌드 파이프라인(`bun astro check`, `bun run build`) 무결성 유지

## 현황 정리

### 애니메이션 시스템 구조
- **데이터 소스**: `public/animations/*.json` (66개). Astro content collection이 **아님**. `src/animations/loader.ts`가 fs로 읽음.
- **상세 페이지**: [src/pages/animations/\[id\].astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/pages/animations/%5Bid%5D.astro), `getStaticPaths`로 SSG. 현재 메타데이터만 노출, **백링크 섹션 없음**.
- **카탈로그 페이지**: [src/pages/animations/index.astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/pages/animations/index.astro), 카테고리별 그룹핑된 카드 그리드.

### 참조 메커니즘 (단일 패턴)
콘텐츠에서 애니메이션을 참조하는 방법은 **오직 코드 펜스 한 가지**:

````markdown
```anim:<animation-id>
{ /* optional JSON overrides */ }
```
````

- frontmatter 필드 없음
- MDX 컴포넌트 없음
- 일반 markdown 링크 없음 (`/animations/...`로 직접 링크하는 케이스는 거의 없음)
- 빌드 시 [src/plugins/remark-animation.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/remark-animation.mjs)가 `<div class="anim-placeholder" data-anim-id="…">`로 변환
- 정규식: `/^anim:([a-z0-9][a-z0-9_-]*)$/i`

실제 콘텐츠 내 참조 현황: **40건 발견** (posts/wiki 전반).

### 기존 백링크 인프라
- [src/lib/content-graph.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/lib/content-graph.ts), `getContentGraph()` 캐싱된 빌드 그래프. `[[wikilink]]`만 스캔. `backlinks: Map<canonicalId, ContentNode[]>` 제공.
- [src/components/Backlinks.astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/components/Backlinks.astro), `{slug, collection}` props로 위 맵을 조회해 "이 페이지를 참조하는 글" 섹션 렌더.
- 애니메이션은 그래프 노드/슬러그맵에 **포함되지 않음**.

### 빌드/배포
- [astro.config.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/astro.config.mjs), markdown.remarkPlugins에 `remarkAnimation` 등록됨.
- [.github/workflows/deploy.yml](file:///Users/koa/004-Projects/0001-Resume/100-github-io/.github/workflows/deploy.yml), `bun run build` → GitHub Pages.
- 모든 데이터는 빌드 타임 확정. 클라이언트 런타임은 `/animations/<id>.json` fetch만 함.

## 설계 결정

### 옵션 비교

| 접근 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. 그래프에 동봉 (선택)** | `content-graph.ts`에 `animationBacklinks: Map<animId, ContentNode[]>` 필드 추가. animations 자체는 그래프 노드로 등록하지 않음. | 변경 최소. 기존 캐싱·빌드 흐름 그대로. 위험 반경 작음. | LocalGraph에 animations 노드가 안 나타남(현 요구사항엔 불필요). |
| B. 애니메이션을 그래프 풀멤버로 | animations를 ContentNode로 등록, `Collection` 타입에 `'animations'` 추가, slugMap·LocalGraph·RelatedPosts·urlFor 모두 확장. | 그래프/관련글 자동 통합. | 변경 반경 큼. `getCollection`을 안 쓰는 것을 모든 경로에서 분기. 기존 컬렉션 가정 깨질 위험. |
| C. 독립 유틸리티 | `src/lib/animation-backlinks.ts` 신설. `content-graph`와 무관. | 격리도 높음. | 콘텐츠를 두 번 로드/스캔(낭비). 일관성 떨어짐. |

**선택: A.** 요구사항(상세 페이지 역방향 참조)만 충족하는 최소·일관 변경. 추후 B로 확장이 필요해지면 grow-into 가능.

### 데이터 모델

`ContentGraph` 인터페이스에 다음 필드 추가:

```ts
// key: animation id (lowercase, exactly as appearing after `anim:`)
animationBacklinks: Map<string, ContentNode[]>;
```

- key 정규화: 코드 펜스 lang 매칭 자체가 case-insensitive (`/i`)이지만, JSON 파일명·loader 검증식 `^[a-z0-9][a-z0-9_-]*$`은 lowercase만 허용. 안전하게 `id.toLowerCase()`로 key 정규화.
- 값은 기존 `ContentNode[]` 재사용 → `AnimationBacklinks.astro`가 `Backlinks.astro`와 동일한 시각 디자인 사용 가능.

### 스캔 패턴

원본 markdown/MDX body를 정규식으로 스캔. remark plugin의 lang 정규식과 의미가 동등하도록:

```ts
// multiline, case-insensitive
const ANIM_FENCE_RE = /^[ \t]{0,3}(`{3,}|~{3,})anim:([a-z0-9][a-z0-9_-]*)\s*$/gim;
```

- `^[ \t]{0,3}`, CommonMark 명세상 펜스는 최대 3 스페이스 들여쓰기까지 허용 (현 컨텐츠에선 다 column 0이지만 안전망).
- `` `{3,}|~{3,} ``, backtick 또는 tilde 펜스 (둘 다 CommonMark 허용).
- `\s*$`, lang 뒤 trailing whitespace 허용.
- 코드 블록 내부(다른 코드 블록 안에 예시로 들어있는 경우)는 무시되어야 하지만, 실용적으로 본 블로그에는 그런 케이스 거의 없음. 추후 false positive 발견 시 더 정교한 토크나이저 필요.

존재하지 않는 animation id 참조 시:
- `loadAllAnimations()` 결과로 만든 valid id set과 교차. set에 없으면 skip (백링크는 카탈로그에 등록된 애니메이션에 대해서만 의미 있음).
- 이로써 "유효 animation id에만 backlink 인덱스 누적".

### 컴포넌트

신규 [src/components/AnimationBacklinks.astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/components/AnimationBacklinks.astro):

```astro
---
import { getContentGraph } from '../lib/content-graph';

interface Props {
  animationId: string;
}
const { animationId } = Astro.props as Props;
const graph = await getContentGraph();
const matches = graph.animationBacklinks.get(animationId.toLowerCase()) ?? [];
---
{matches.length > 0 && (
  <section class="mt-12 border-t border-[color:var(--color-border)] pt-6">
    <h3 …>이 애니메이션을 사용하는 글 ({matches.length})</h3>
    <ul …>
      {matches.map((m) => (
        <li>
          <a href={m.url}>
            <span class="… badge">{m.collection}</span>
            {m.title}
          </a>
        </li>
      ))}
    </ul>
  </section>
)}
```

`Backlinks.astro`를 그대로 generalize 하는 대신 별도 컴포넌트를 만드는 이유:
- 헤더 카피("이 페이지를 참조하는 글" vs "이 애니메이션을 사용하는 글")가 다름
- 데이터 키 타입이 다름 (`canonicalId` vs animation id)
- `Backlinks.astro`는 35 LOC 짜리 단순 컴포넌트. 동일 패턴 미러링이 conditional prop union 보다 깔끔.

### 상세 페이지 통합

[src/pages/animations/\[id\].astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/pages/animations/%5Bid%5D.astro) line 81 ("본문에 삽입" 섹션) 뒤에 추가:

```astro
<AnimationBacklinks animationId={def.id} />
```

위치 선정: "메타데이터" → "본문에 삽입" → "역방향 참조"의 자연스러운 흐름. 사용 예시 다음에 실제 사용처를 보여줌.

## 작업 순서

### Step 1, `content-graph.ts` 확장
파일: [src/lib/content-graph.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/lib/content-graph.ts)

1. `loadAllAnimations` import 추가 (`from '../animations/loader'`).
2. `ContentGraph` 인터페이스에 `animationBacklinks: Map<string, ContentNode[]>` 필드 추가.
3. 모듈 상수 `ANIM_FENCE_RE` 추가 (위 정규식).
4. `build()` 안:
   - `loadAllAnimations()` 호출하여 `validAnimIds: Set<string>` 생성.
   - `animationBacklinks: Map<string, ContentNode[]>`, `animationBacklinkSeen: Map<string, Set<string>>` 초기화.
   - `scan(entry)`에 wikilink 스캔과 병렬로 애니메이션 펜스 스캔 추가. 매칭 시:
     - `id.toLowerCase()`로 정규화.
     - `validAnimIds.has(id)`가 아니면 skip.
     - dedupe (`animationBacklinkSeen[id]`에 sourceNode.id 추가 여부).
     - 통과 시 `animationBacklinks[id]`에 `sourceNode` push.
   - `return { …, animationBacklinks }` 추가.

### Step 2, `AnimationBacklinks.astro` 신설
파일: [src/components/AnimationBacklinks.astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/components/AnimationBacklinks.astro) (신규)

- `Backlinks.astro`의 스타일·구조를 그대로 미러링하되 헤더 카피만 "이 애니메이션을 사용하는 글" 로 교체.

### Step 3, `[id].astro` 통합
파일: [src/pages/animations/\[id\].astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/pages/animations/%5Bid%5D.astro)

- `AnimationBacklinks` import 추가.
- "본문에 삽입" 섹션 뒤 (`</section>` 뒤, 닫는 `</section class="mx-auto …">` 안) `<AnimationBacklinks animationId={def.id} />` 삽입.

### Step 4, 검증
1. `lsp_diagnostics`, 변경된 3개 파일 모두 클린.
2. `bun astro check`, 타입 에러 0.
3. `bun run build`, exit 0. 빌드 후:
   - `dist/animations/microtask-vs-macrotask/index.html`에 "이 애니메이션을 사용하는 글" 섹션이 포함되어야 함 (`grep` 으로 확인).
   - `dist/animations/event-loop-basic/index.html`에 `2026-06-14-js-async-timing` 포스트 링크가 포함되어야 함.
4. `bun dev` 가동 후 playwright/curl로 `/animations/microtask-vs-macrotask/` 페이지를 가져와 동일 섹션 존재 확인.

### Step 5, 단위 테스트(선택, 시간이 남으면)
- `tests/`에 vitest 단위 테스트 추가:
  - `ANIM_FENCE_RE`가 다음을 정확히 매치:
    - `` ```anim:foo `` (column 0)
    - 들여쓰기 0–3 spaces 허용
    - tilde fence (`~~~anim:foo`)
    - lang 뒤 trailing whitespace 허용
    - `anim:foo-bar_baz123` 같은 슬러그
  - 다음을 매치하지 않음:
    - `` ```anim: `` (빈 id)
    - `` ```animation:foo ``
    - 4 spaces 이상 들여쓰기 (해당 줄은 indent code block로 변환)

## 성공 기준

1. `/animations/microtask-vs-macrotask/` 페이지에 "이 애니메이션을 사용하는 글 (1)" 섹션이 표시되고, 항목으로 `posts` 배지 + "JS 비동기 타이밍" (실제 글 제목) 링크가 노출.
2. 미사용 애니메이션(예시: 만일 어떤 animation이 어느 콘텐츠에서도 참조 안 되는 경우)의 상세 페이지에는 섹션 자체가 렌더링되지 않음 (조건부 렌더링).
3. `bun run build` 결과물(`dist/animations/<id>/index.html`)에 백링크 섹션이 정적 HTML로 인라인되어 있음 (GitHub Pages 호환).
4. `bun dev`로 띄운 로컬 서버에서도 동일 섹션이 표시됨.
5. 기존 포스트/위키/노트의 `Backlinks.astro` 동작에 회귀 없음.

## 회귀 위험 및 완화

- **위험**: `getContentGraph()` 캐시가 빌드 한 번에 한 번만 생성됨. 변경 후 첫 빌드에서 캐시 미스 발생 시 다중 호출 직렬화 우려.
  - **완화**: `cache: Promise<ContentGraph> | null` 패턴이 이미 race-safe. 추가 변경 불필요.
- **위험**: `loadAllAnimations()` 가 fs IO. CI 빌드 시간 소폭 증가.
  - **완화**: 66개 JSON, 각 수 KB. 측정상 100ms 미만. graph build에 묶여 한 번만 실행.
- **위험**: 정규식이 코드 블록 내부의 예시 펜스(중첩 펜스)를 false positive로 잡을 가능성.
  - **완화**: 현 콘텐츠 grep 결과 그런 케이스 없음. 추후 발견 시 MDX AST 기반으로 업그레이드 가능 (이번 스코프 외).
- **위험**: 새 컴포넌트가 다크 모드/타이포그래피 토큰 누락.
  - **완화**: `Backlinks.astro`의 클래스를 그대로 복제. 디자인 토큰 (`var(--color-…)`) 동일하게 사용.

## 비고

- 본 작업은 frontmatter 스키마를 건드리지 않음. 기존 콘텐츠 무변경.
- `[[wikilink]]` 백링크 시스템과 독립. 향후 `[[animation:xxx]]` 형태의 명시적 wikilink 지원이 필요하면 슬러그맵 확장으로 별도 진행 가능.
- 카탈로그 페이지(`/animations/`)에 "사용 글 수" 같은 표시는 본 요구사항 외이므로 추가하지 않음. 필요 시 후속 작업.
