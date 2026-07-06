---
name: content-authoring
description: shinkeonkim.com 블로그(Astro + MDX)의 컨텐츠 작성 종합 가이드. posts, notes, wiki, animation, chart, embed, reference 등 모든 컨텐츠 타입의 frontmatter 스키마와 작성 패턴을 정의. 새 글/위키/노트/애니메이션/차트/임베드를 작성하거나 기존 컨텐츠를 수정할 때 사용.
---

# Content Authoring Skill

shinkeonkim.com 블로그(Astro 6 + MDX + GitHub Pages)의 모든 컨텐츠 작성 규칙을 정의합니다. 이 skill은 다음 상황에서 활용됩니다.

- 새 `post` / `note` / `wiki` / `source` 파일 작성
- 새 `animation` JSON 파일 작성 (`public/animations/`)
- post/wiki/note에 `chart`, `embed`, `reference` 삽입
- frontmatter 스키마 / 위키링크 / 임베드 컴포넌트 확인
- 빌드 직전 검증 (`validate-content`, `lint:no-em-dash`)

## 컨텐츠 타입 한눈에 보기

| 타입 | 위치 | 확장자 | 자세히 |
|:---|:---|:---|:---|
| **Post** | `src/content/posts/` | `.md` / `.mdx` | [posts.md](posts.md) |
| **Note** | `src/content/notes/` | `.md` | [notes.md](notes.md) |
| **Wiki** | `src/content/wiki/` | `.md` / `.mdx` | [wiki.md](wiki.md) |
| **Source** | `src/content/sources/` | `.md` | [references.md](references.md) |
| **Animation** | `public/animations/` | `.json` | [animations.md](animations.md) |
| **Chart** | post/wiki/note 내부 인라인 (`<ChartJs />`) | - | [charts.md](charts.md) |
| **Embed** | post/wiki/note 내부 인라인 (`<UrlPreview />`, `<YouTube />` 등) | - | [embeds.md](embeds.md) |
| **공통 마크다운 문법** | 전 컬렉션 공통 | - | [markdown-syntax.md](markdown-syntax.md) |

## 작업 순서 (NEW 컨텐츠 작성 시)

1. **타입 결정** - post / note / wiki / source / animation 중 무엇인지 확정
2. **해당 파일 읽기** - 위 표의 "자세히" 컬럼 가이드 참조
3. **frontmatter 작성** - 스키마 그대로 따름
4. **본문 작성** - [markdown-syntax.md](markdown-syntax.md)의 공통 문법 활용
5. **검증** - 아래 "검증 체크리스트" 모두 통과
6. **빌드 확인** - `bun run build` 통과해야 배포 가능

## 핵심 규칙 (모든 컨텐츠 공통, NON-NEGOTIABLE)

### 1. em-dash (`&#x2014;`, U+2014) 절대 사용 금지

영문 활자 컨벤션이라 한국어 본문/코드/문서에 어울리지 않습니다. `bun run lint:no-em-dash`가 전 저장소 스캔, 1건이라도 발견되면 빌드 실패.

**대체 기호** (문맥에 맞게):
- 부제목/라벨/부연: `,` 또는 `:`
- 경로/대안 표기: `/`
- 표의 빈 칸: `-`
- 가로 구분선 아이콘: `─` (U+2500, box drawing)

### 2. 경로 별칭

- 슬라이스 간 import: 반드시 `@/*` (= `src/*`) 사용
- 같은 슬라이스 내 import: 상대 경로 사용

### 3. References ID는 sources 컬렉션과 일치해야 함

`references: [{ id: "ddia" }]` 의 `id`가 `src/content/sources/ddia.md`에 존재해야 함. 없으면 `validate-content`가 ERROR. 자세히는 [references.md](references.md).

### 4. 위키링크는 모든 컨텐츠에서 동일 문법

```markdown
[[페이지명]]
[[페이지명|보여줄 텍스트]]
[[페이지명#앵커]]
[[페이지명#앵커|보여줄 텍스트]]
```

매칭 우선순위: slug > filename > frontmatter `title` > frontmatter `aliases` (모두 NFC + lowercase 정규화).

깨진 링크는 `<a class="wikilink broken" aria-disabled="true">`로 렌더링됨, 빌드는 통과하지만 `validate:content`가 WARN. 자세히는 [wiki.md](wiki.md), [markdown-syntax.md](markdown-syntax.md).

### 5. MDX에서만 가능한 것 vs .md에서도 가능한 것

| 기능 | .md | .mdx |
|:---|:---:|:---:|
| 기본 마크다운, 콜아웃, 코드블록, 표, 푸트노트 | ✅ | ✅ |
| 위키링크 `[[...]]` | ✅ | ✅ |
| 수식 `$...$`, `$$...$$` (KaTeX) | ✅ | ✅ |
| Mermaid ` ```mermaid ` | ✅ | ✅ |
| Animation ` ```anim:id ` | ✅ | ✅ |
| URL preview `<UrlPreview url=".../>` | ✅ | ✅ |
| Chart.js `<ChartJs ... />` | ❌ | ✅ |
| Code+Output `<CodeWithOutput ... />` | ❌ | ✅ |
| 임의 JSX 컴포넌트 (`<YouTube />` 등) | ❌ | ✅ |

`<ChartJs>`와 `<CodeWithOutput>`은 `astro.config.mjs`의 `astro-auto-import`로 모든 MDX에서 import 없이 사용 가능.

### 6. Mermaid label에 특수문자 있으면 반드시 `"..."` quote

브라우저 렌더 시점 (CDN mermaid) 에서 조용히 실패하고 인라인 error 박스로 fallback 하므로, 작성 시점에 잡아야 합니다. `bun run validate:mermaid` 가 `prebuild` 에 걸려 있어 실패 시 빌드 차단.

quote가 필요한 경우:

```mermaid
%% 잘못
flowchart LR
    A[미리 fetch (병렬)]                  %% 괄호 unquoted → 파싱 실패
    B[SLI 측정<br/>"5xx = 0.02%"]         %% 큰따옴표 unquoted → STR 에러
    Q -->|Yes (모든 state Redis)| S       %% 엣지 라벨 unquoted → 파싱 실패
    S[label with {curly}]                 %% 중괄호 unquoted → DIAMOND_START 에러

%% 올바름
flowchart LR
    A["미리 fetch (병렬)"]
    B["SLI 측정<br/>#quot;5xx = 0.02%#quot;"]   %% 내부 " 는 #quot; 로 이스케이프
    Q -->|"Yes (모든 state Redis)"| S
    S["label with {curly}"]
```

quote 예외 (그대로 두어도 됨):
- `[(text)]` 실린더 DB 노드 (mermaid 문법 자체)
- 이미 `"..."` 로 감싸진 라벨
- `.` `,` `/` 등 안전한 문장부호만 있는 라벨

**자동 수정**: 대량 실패 시 `bun scripts/fix-mermaid-labels.mjs --dry` 로 diff 확인 후 dry 없이 실행하면 안전하게 quote 처리. sequenceDiagram / quadrantChart 같은 semantic 오류는 수동 수정 필요 (참고: [scripts/fix-mermaid-labels.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/fix-mermaid-labels.mjs) 상단 주석).

sequenceDiagram 은 `Node[label]` 문법이 없습니다 (그건 flowchart). Participant에 설명이 필요하면 `participant X as 설명` 을 쓰거나 flowchart로 전환.

자세히: [markdown-syntax.md](markdown-syntax.md#mermaid-검증-validatemermaid), [embeds.md](embeds.md#3-mermaid-다이어그램).

### 7. 빌드 파이프라인 검증 (prebuild)

`bun run build` 실행 시 `prebuild` 가 자동으로 다음 검증을 순차 실행. 하나라도 실패하면 빌드 중단.

```bash
# 1. check-no-em-dash         em-dash (U+2014) 검사
# 2. validate-mermaid          mermaid.parse() 로 전체 다이어그램 파싱
# 3. validate-animations       animation JSON zod 스키마 + 참조/시간 무결성
# 4. sync-wiki-category --strict   폴더 vs frontmatter category 정합성
# 5. download-pretendard       폰트
# 6. fetch-giscus-counts       댓글 수
# 7. fetch-url-previews        URL 미리보기
# 8. generate-search-tags      검색 인덱스
# 9. generate-changelog        변경 이력
# 10. validate-content         frontmatter / wikilink / references / assets
```

빌드 단독 검증:
```bash
bun run lint:no-em-dash              # em-dash 검사
bun run validate:mermaid              # mermaid 다이어그램 파싱 검증
bun run validate:animations           # animation JSON 검증
bun run validate:wiki-category        # wiki 폴더 vs category 정합성
bun run validate:content              # WARN까지 표시
bun run validate:content:strict       # WARN도 실패
bun run audit:alt                     # 이미지 alt 감사 (prebuild 미포함, 수동 실행)
bun astro check                       # 타입 검증
```

`audit:alt` 는 prebuild 에 포함 안 됨 (현재 24건 attention 필요, 정리 후 승격 예정). 이미지 추가/변경 시 수동 실행 권장.

## 검증 체크리스트 (모든 컨텐츠 공통)

작성 후 다음을 모두 확인:

- [ ] frontmatter 필수 필드 모두 작성 (collection별 [posts.md](posts.md) / [notes.md](notes.md) / [wiki.md](wiki.md) 참조)
- [ ] `date` 필드는 ISO 8601 또는 `YYYY-MM-DD` (parse 가능한 형식)
- [ ] em-dash (`&#x2014;`, U+2014) 사용 안 함 → `bun run lint:no-em-dash`
- [ ] `references[].id` 모두 `src/content/sources/` 에 존재
- [ ] `cover` / `thumbnail` 경로의 실제 파일 존재
- [ ] `cover` 있으면 `coverAlt` 도 작성 (a11y/SEO)
- [ ] 위키링크 `[[...]]` 대상 페이지 모두 존재 (또는 의도된 broken link)
- [ ] Mermaid 다이어그램의 특수문자 label 모두 `"..."` quote → `bun run validate:mermaid`
- [ ] Wiki 파일은 폴더와 `category` frontmatter 일치 → `bun run validate:wiki-category`
- [ ] Animation JSON 은 스키마 + 참조 무결성 통과 → `bun run validate:animations`
- [ ] `bun run validate:content` 통과
- [ ] `bun astro check` 통과

## VSCode 스니펫

`.vscode/snippets/markdown.json`에 prefix 등록되어 있음:
- `post` → posts frontmatter 템플릿
- `note` → notes frontmatter 템플릿
- `wiki` → wiki frontmatter 템플릿

`Ctrl+Space` 후 prefix 입력으로 사용.

## 참고 파일

- 스키마 정의: [src/content.config.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content.config.ts)
- Astro 설정: [astro.config.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/astro.config.mjs)
- VSCode 스니펫: [.vscode/snippets/markdown.json](file:///Users/koa/004-Projects/0001-Resume/100-github-io/.vscode/snippets/markdown.json)
- 검증 스크립트: [scripts/validate-content.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/validate-content.mjs)
- em-dash 검사: [scripts/check-no-em-dash.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/check-no-em-dash.mjs)
- mermaid 검증: [scripts/validate-mermaid.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/validate-mermaid.mjs) / [자동 수정 codemod](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/fix-mermaid-labels.mjs)
- animation 검증: [scripts/validate-animations.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/validate-animations.mjs)
- wiki 카테고리 검증/자동채움: [scripts/sync-wiki-category.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/sync-wiki-category.mjs)
- alt-text 감사: [scripts/audit-alt-text.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/audit-alt-text.mjs)
- 기존 운영자 가이드: [manual-docs/](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/) (animation-ai-prompt-guide, wiki-naming-guide 등)
