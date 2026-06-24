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

### 6. 빌드 파이프라인 검증 (prebuild)

```bash
bun run build  # 내부적으로 prebuild가 다음을 실행:
# 1. check-no-em-dash      (U+2014 검사)
# 2. download-pretendard   (폰트)
# 3. fetch-giscus-counts   (댓글 수)
# 4. fetch-url-previews    (URL 미리보기)
# 5. generate-search-tags  (검색 인덱스)
# 6. validate-content      (frontmatter/wikilink/assets)
```

빌드 단독 검증:
```bash
bun run lint:no-em-dash             # em-dash 검사
bun run validate:content             # WARN까지 표시
bun run validate:content --strict    # WARN도 실패
bun astro check                      # 타입 검증
```

## 검증 체크리스트 (모든 컨텐츠 공통)

작성 후 다음을 모두 확인:

- [ ] frontmatter 필수 필드 모두 작성 (collection별 [posts.md](posts.md) / [notes.md](notes.md) / [wiki.md](wiki.md) 참조)
- [ ] `date` 필드는 ISO 8601 또는 `YYYY-MM-DD` (parse 가능한 형식)
- [ ] em-dash (`&#x2014;`, U+2014) 사용 안 함 -> `bun run lint:no-em-dash`
- [ ] `references[].id` 모두 `src/content/sources/` 에 존재
- [ ] `cover` / `thumbnail` 경로의 실제 파일 존재
- [ ] `cover` 있으면 `coverAlt` 도 작성 (a11y/SEO)
- [ ] 위키링크 `[[...]]` 대상 페이지 모두 존재 (또는 의도된 broken link)
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
- 기존 운영자 가이드: [manual-docs/](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/) (animation-ai-prompt-guide, wiki-naming-guide 등)
