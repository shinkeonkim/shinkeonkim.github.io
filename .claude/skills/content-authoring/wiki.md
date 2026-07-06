# Wiki 작성 가이드

`src/content/wiki/` 컨텐츠 컬렉션. 개념/기술 사전, 재사용 가능한 정의, 다른 글에서 자주 참조되는 페이지.

## 디렉토리 구조

```
src/content/wiki/
├── network/         # 네트워크 관련
│   ├── tcp.md, udp.md, quic.md, tls.md
│   ├── head-of-line-blocking.md
├── sql/             # 데이터베이스
│   ├── redis.md, postgresql.md
├── javascript/      # 자바스크립트
│   ├── js-function.mdx
│   ├── js-promise.mdx
│   ├── js-event-loop.mdx
├── python/, java/, go/, rs/, ...
├── algorithm/
├── concurrency/
├── frameworks/      # 도구 자체
│   ├── astro.md, django.mdx, rails.md
├── ml/, pandas/, ...
```

**규칙**:
- **카테고리 디렉토리 필수** (URL `/wiki/{category}/{slug}/`)
- 깊이 3까지 허용 (`{category}/{subcategory}/{slug}`), 깊이 4 금지
- 파일명: kebab-case (예: `head-of-line-blocking.md`)
- 날짜 prefix **없음** (post와 다름)
- `.md` 또는 `.mdx`

## 카테고리 자동 동기화

각 wiki 파일의 frontmatter `category` 필드는 디렉토리에서 자동 추출되어 빌드/탐색 UI 를 구동합니다.

### 동작

- 빌드 시점에 `category` 값이 frontmatter 에 없으면 `scripts/sync-wiki-category.mjs` 가 첫 디렉토리 segment를 자동 채움
- 깊이 3 (`spring/spring-batch/chunk.md`) 는 첫 segment (`spring`) 를 카테고리로
- 자동 채움은 한 줄 삽입만 함 (다른 YAML 포맷 보존)

### 명령

```bash
bun run sync:wiki-category                      # 실제 파일 수정 (--write)
bun run validate:wiki-category                  # --strict, prebuild 에서 실행
bun scripts/sync-wiki-category.mjs              # dry-run, would-be 변경 표시
bun scripts/sync-wiki-category.mjs --json       # 머신 가독 출력
```

`validate:wiki-category` (즉 `--strict`) 는 `prebuild` 에 걸려 있어 category 값이 폴더와 불일치하면 빌드 중단. `subcategory` 불일치는 warn 로만 리포트 (semantic 이슈일 수 있으니 즉시 fail 시키지 않음).

### 수동 override

특정 페이지의 카테고리를 디렉토리와 다르게 두고 싶으면 frontmatter 에 직접 작성. 스크립트는 기존 값을 절대 덮어쓰지 않고, 디렉토리와 불일치 시 MISMATCH 경고만 남김.

```yaml
# src/content/wiki/frameworks/django.md
category: django   # 디렉토리는 frameworks 이지만 django 카테고리로 분류
```

## 디렉토리 노출

빌드된 사이트는 카테고리 구조를 다음 위치에서 노출합니다:

| 위치 | URL | 역할 |
|:---|:---|:---|
| 메인 위키 | `/wiki/` (페이지 1) | 13+ 카테고리 그리드 + 최근 갱신 + 미완성 페이지 |
| 카테고리 인덱스 | `/wiki/categories/` | 전체 카테고리 카드 (각 카테고리별 최근 3개 미리보기) |
| 카테고리 페이지 | `/wiki/category/{cat}/` | 해당 카테고리 글 전체 (페이지네이션) |
| 개별 위키 | `/wiki/{slug}/` | breadcrumb: `홈 / 위키 / {category} / {title}` |

## 네이밍 컨벤션 (CRITICAL)

같은 단어가 여러 언어에서 다른 의미를 가지므로, **언어/도구 컨텍스트를 파일명과 제목에 명시**합니다.

### Prefix 규칙

| Prefix | 컨텍스트 | 예시 |
|:---|:---|:---|
| `js-` | JavaScript / TypeScript / Web API | `js-function.mdx`, `js-promise.mdx`, `js-event-loop.mdx` |
| `py-` | Python | `py-decorator.mdx`, `py-asyncio.mdx` |
| `rb-` | Ruby | `rb-block.mdx`, `rb-symbol.mdx` |
| `go-` | Go | `go-goroutine.mdx`, `go-channel.mdx` |
| `rs-` | Rust | `rs-lifetime.mdx`, `rs-trait.mdx` |
| `(없음)` | 언어 독립 CS 개념, 프레임워크/도구 자체 | `first-class-function.mdx`, `redis.md`, `tcp.md`, `astro.md` |

### 제목에 `[컨텍스트]` 표시

```yaml
title: "[Javascript] function"           # 언어 명시
title: "[Javascript] Arrow Function"     # 언어 명시
title: "일급 함수"                        # 언어 독립
title: "TCP"                             # 프로토콜 (그대로)
```

### prefix 안 붙이는 케이스

- 언어 독립적 CS 개념 (`first-class-function`, `callback`, `closure`) - 본문이 정말 언어 중립이어야 함
- 프레임워크 / 도구 자체 (`redis`, `astro`, `django`, `ruby-on-rails`)
- 표준 프로토콜 (`tcp`, `udp`, `tls`, `http3`, `quic`)
- 하드웨어 / OS 개념 (`hbm`, `simt`, `systolic-array`)

자세한 규칙: [manual-docs/wiki-naming-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/wiki-naming-guide.md)

## Frontmatter 스키마

`src/content.config.ts`의 `wiki` collection:

```yaml
---
# 필수
title: "페이지 제목"                              # string

# 선택
aliases: ["별칭1", "별칭2"]                       # string[] (위키링크 매칭 대상)
tags: [tag1, tag2]                              # string[]
category: "카테고리명"                            # string (디렉토리와 별개)
updated: 2026-06-23                              # date (마지막 수정일)
cover: "/path/to/cover.png"                      # string
coverAlt: "alt 텍스트"                           # cover 있으면 필수
thumbnail: "/path/to/thumb.png"                  # string
references:                                      # ReferenceItem[]
  - id: "source-id"
    page: 42
  - title: "RFC 9293"
    url: "https://datatracker.ietf.org/doc/html/rfc9293"
---
```

**Post/Note와 다른 점**:
- `title` **필수** (notes는 없음, posts와 동일)
- `date` **없음** (post는 필수)
- `updated` 만 있음 (마지막 수정일)
- `aliases` **있음** (위키링크 매칭에 핵심)
- `description`, `series`, `draft` 등 **없음**

## Aliases 작성 (위키링크 매칭의 핵심)

`aliases`는 wikilink가 이 페이지를 찾을 때 쓰는 대체 이름들.

### 예: `js-function.mdx`

```yaml
---
title: "[Javascript] function"
aliases:
  - "function"                # 영문 원형
  - "함수"                    # 한국어 일반
  - "JS function"             # 컨텍스트 명시
  - "JavaScript function"     # 표준 명
  - "function declaration"    # 변형
  - "function expression"     # 변형
---
```

이렇게 하면 모든 글에서 다음 모두 같은 페이지로 연결:
- `[[function]]`
- `[[함수]]`
- `[[JS function]]`
- `[[JavaScript function]]`
- `[[function declaration]]`

### 예: `redis.md`

```yaml
---
title: "Redis"
aliases:
  - "redis"                   # 소문자
  - "레디스"                  # 한국어
---
```

## 위키링크 문법 (모든 컨텐츠 공통)

```markdown
[[페이지명]]                          # 기본
[[페이지명|보여줄 텍스트]]            # 별칭
[[페이지명#앵커]]                     # 섹션 링크
[[페이지명#앵커|보여줄 텍스트]]       # 별칭 + 섹션
```

### 매칭 우선순위 (NFC + lowercase 정규화 후)

1. 파일 경로 (`network/tcp`) → `/wiki/network/tcp/`
2. 파일명 (`tcp`) → 같은 이름 파일
3. Frontmatter `title` (`TCP`)
4. Frontmatter `aliases` 배열의 각 항목

### 깨진 링크 처리

매칭 실패 → `<a class="wikilink broken" aria-disabled="true">` 로 렌더링. `validate:content`가 WARN.

## 작성 패턴

### 패턴 A: 프로토콜 (TCP)

```markdown
---
title: "TCP"
aliases: ["Transmission Control Protocol", "tcp"]
tags: [network, protocol, transport-layer]
category: "Transport Layer"
updated: 2026-06-23
references:
  - title: "RFC 9293, TCP"
    url: "https://datatracker.ietf.org/doc/html/rfc9293"
---

## 정의

**TCP** (Transmission Control Protocol)는 신뢰성 있는 연결 지향 전송 계층 프로토콜이다.

[[UDP]] 와 대비된다.

## 핵심 특성

- **연결 지향**: 3-way handshake
- **순서 보장**: sequence number
- **신뢰성**: ACK 미수신 시 재전송

## 3-way Handshake

```anim:tcp-handshake
{}
```

1 RTT 소요. [[TLS]] 추가하면 2-3 RTT.

## 한계

| 문제 | 해결 |
|:---|:---|
| [[Head-of-Line Blocking]] | [[QUIC]] |
| 연결 변경 시 끊김 | [[QUIC]] Connection Migration |

## 참고

- [[QUIC]] - UDP 기반 대안
- [[TLS]] - 암호화 프로토콜
```

### 패턴 B: 언어 키워드 (JavaScript function)

```markdown
---
title: "[Javascript] function"
aliases:
  - "function"
  - "함수"
  - "JS function"
  - "JavaScript function"
  - "function declaration"
  - "function expression"
tags: [javascript, language-feature]
updated: 2026-06-23
references:
  - id: "mdn-web-docs"
    anchor: "function"
---

## 정의

JavaScript의 함수는 [[first-class-function|일급 객체]]다.

## 선언 방식

### Function Declaration

```js
function add(a, b) { return a + b; }
```

호이스팅됨.

### Function Expression

```js
const add = function(a, b) { return a + b; };
```

호이스팅 안 됨.

### Arrow Function

[[js-arrow-function]] 참조.

## 관련 개념

- [[js-closure]] - 클로저
- [[js-this]] - this 바인딩
- [[first-class-function]] - 일급 함수 (언어 독립)
```

### 패턴 C: 도구/프레임워크 (Astro)

```markdown
---
title: "Astro"
aliases: ["astro"]
tags: [framework, ssg, web]
updated: 2026-06-23
references:
  - id: "astro-docs"
---

## 정의

**Astro** 는 컨텐츠 중심 사이트를 위한 정적 사이트 빌더.

## 특징

- Islands Architecture
- Multi-framework support (React, Vue, Svelte, ...)
- Zero JS by default

## 참고

- [[Astro Content Collections]]
- [[Pagefind]] - Astro와 자주 같이 쓰임
```

## Wiki vs Post vs Note 차이 (한눈에)

| 항목 | Wiki | Post | Note |
|:---|:---|:---|:---|
| **용도** | 개념/기술 사전 | 장문 글 | 한줄 메모 |
| **필수 필드** | `title` | `title`, `date` | `date` |
| **날짜** | `updated` (선택) | `date` (필수) | `date` (필수) |
| **Aliases** | ✅ | ❌ | ❌ |
| **Series** | ❌ | ✅ | ❌ |
| **Cover** | ✅ | ✅ | ❌ |
| **URL** | `/wiki/{category}/{slug}/` | `/posts/{slug}/` | `/notes/{slug}/` |
| **Backlink** | ✅ 자동 | ✅ 자동 | ✅ 자동 |
| **그래프 노드** | ✅ | ✅ | ✅ |

## Backlink 자동 생성

빌드 시점에 `content-graph.ts`가 모든 컨텐츠의 `[[...]]` 스캔 → 역참조 맵 구성 → 페이지 하단에 "이 페이지를 참조하는 글" 섹션 자동 표시.

각 wiki 페이지에 backlinks 컴포넌트가 자동 삽입됨. 작성자가 별도로 해야 할 일 없음.

## 실제 예시 파일

- TCP: [src/content/wiki/network/tcp.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/wiki/network/tcp.md)
- Redis: [src/content/wiki/sql/redis.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/wiki/sql/redis.md)
- QUIC (aliases 4개): [src/content/wiki/network/quic.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/wiki/network/quic.md)
- 네이밍 가이드: [manual-docs/wiki-naming-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/wiki-naming-guide.md)

## 실제 관용 (269개 wiki 분석)

새 위키를 쓸 때 아래 관용을 그대로 따르면 다른 페이지들과 자연스럽게 정렬됩니다.

### Frontmatter

| 필드 | 실사용률 | 관용 |
|:---|:---|:---|
| `title` | 100% | 65% `[Framework] Topic` 형식 (`[AWS]`, `[Spring]`, `[Python]`, `[Redis]` 등 대문자), 35% plain (`Bubble Sort`, `PostgreSQL` 같은 알고리즘/도구 자체) |
| `aliases` | 100% | 3-8개. 영/한 혼합. 8개 이상이면 YAML list 문법 (`-` prefix) 선호 |
| `tags` | 100% | 4-6개, 전부 lowercase + hyphenated |
| `category` | 100% | 폴더 첫 segment 와 일치 (`sync-wiki-category --strict` 로 강제) |
| `subcategory` | 15% | 폴더 2번째 segment 있을 때만 (`algorithm/string/parsing.mdx` → `subcategory: string`) |
| `updated` | 100% | ISO date (`2026-06-25`) - 사실상 필수처럼 관용화 |
| `references` | 100% | 3-6개. id-based 60%, inline 40%. 공식 docs (Spring/Django/Rails/Python) 는 id-based, 외부 링크는 inline |
| `prerequisites` / `leadsTo` | 1.4% | 거의 미사용 (Django 5개 파일만). 필요할 때만 |
| `description` | 0% | 실사용 없음. Optional 이니 굳이 채울 필요 없음 |

### 본문 섹션 관용

- **`## 정의`**: 100% (269/269). 첫 섹션은 항상 정의부터.
- **`## 관련 위키`**: 100% (269/269). 마지막 섹션에 wikilink 3-8개.
- 중간에 자주 등장: `## 기본` / `## 기초` (45%), `## 예제` (35%), `## 함정` (20%), `## 복잡도` (알고리즘, 15%)

### Callout 관용

- `> [!IMPORTANT]` - 12.6% (강조 사항, 흔한 오해 방지)
- `> [!WARNING]` - 12.6% (실수 위험, 함정 섹션과 잘 어울림)
- `> [!CAUTION]` - 4.5% (프로덕션 위험)
- `> [!TIP]` - 1.1% (팁), `> [!NOTE]` - 0% (미사용)

`## 함정` 섹션에는 `[!WARNING]` 또는 `[!CAUTION]` 을 붙이는 게 일반적.

### 스타일

- **italic emphasis** `*keyword*` 로 중요 개념 강조. 50+ 파일에서 관찰.
- **코드블록 언어 필수**: java/python/sql/yaml/ruby/js/ts/bash 등 실제 언어. pseudocode 는 `text`.
- **위키링크 밀도**: 평균 6-8개/파일. 알고리즘/개요 페이지는 45개까지.
- **Mermaid**: 181/269 파일에서 사용. `flowchart` 45%, `sequenceDiagram` 25%. 라벨 quote 규칙은 [SKILL.md](SKILL.md#6-mermaid-label에-특수문자-있으면-반드시-quote) 참조.

## 검증 체크리스트 (Wiki 전용)

- [ ] `title` 필수. Framework/도메인 있으면 `[Framework] Topic` (대문자 시작), 순수 CS/알고리즘은 plain
- [ ] 파일명에 적절한 prefix (`js-`, `py-`, ...) 또는 prefix 없음 결정 (아래 네이밍 컨벤션 참조)
- [ ] `aliases` 에 원형 이름, 한국어 이름, 변형 모두 추가 (3-8개)
- [ ] `tags` 4-6개, lowercase + hyphenated
- [ ] `updated` ISO 날짜
- [ ] 폴더 = `category` (자동, `bun run validate:wiki-category` 로 강제)
- [ ] `## 정의` 로 시작, `## 관련 위키` 로 끝나기 (관용)
- [ ] `## 함정` 섹션에는 `[!WARNING]` 또는 `[!CAUTION]` callout
- [ ] Mermaid 라벨 특수문자 quote → `bun run validate:mermaid`
- [ ] `references[].id` 모두 `sources/` 에 존재
- [ ] em-dash 사용 안 함
- [ ] [SKILL.md](SKILL.md) 의 공통 체크리스트 모두 통과

## 기존 Wiki Rename 절차

1. **이름 변경**: `git mv src/content/wiki/X.mdx src/content/wiki/js-X.mdx`
2. **frontmatter 업데이트**:
   - `title` 을 `[Javascript] X` 형식으로
   - `aliases` 에 원형 + 한국어 + 변형 모두 추가
3. **본문 그대로 유지** (내용은 변경 불필요)
4. **빌드 검증**: `bun astro check && bun run build`
