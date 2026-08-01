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

`aliases`는 wikilink가 이 페이지를 찾을 때 쓰는 대체 이름들. **잘못 걸면 다른 문서의 wikilink 를 조용히 훔쳐옴** → wikilink 해석 이상의 주범.

### 해석 규칙 (반드시 이해)

wikilink `[[X]]` 는 다음 우선순위로 매칭 (모두 NFC + lowercase 정규화 후):

1. **파일 경로** (`network/tcp`) → 해당 파일
2. **파일명** (`tcp`) → 같은 이름 파일 (여러 개면 first-come-first-served)
3. **Frontmatter `title`** (`TCP`)
4. **Frontmatter `aliases`** 배열의 각 항목

같은 key 가 여러 문서에서 등록되면 **파일 walk 순서상 첫 번째로 등록된 것이 승** ("first wins"). 나머지 문서는 조용히 실패.

**결과**: 문서 A 에 alias `Foo` 를 걸었는데, 이미 문서 B 가 alias `Foo` 를 갖고 있으면, 모든 `[[Foo]]` 는 B 로 감. A 는 절대 도달 불가.

### Alias 작성 규칙 (NON-NEGOTIABLE)

**금지 사항** (`validate:aliases` 로 검출됨, hard error):

1. **Cross-file 충돌**: 이미 다른 문서가 slug / filename / title / alias 로 소유한 이름을 alias 로 등록 X
2. **자체 파일 내 중복**: 대소문자 다르게 (`Parquet`, `parquet`) 등록해도 정규화 후 같은 것으로 취급되어 중복
3. **자기 파일의 title / filename / slug 와 동일한 alias 무의미**: 자동 매칭되므로 등록해도 이득 없음, 리팩터링 여지 생김

**소프트 금지** (soft warning, 신규 작성 시 안 나오게):

4. **너무 일반적인 단일 단어 금지**: `state`, `manager`, `store`, `config`, `session`, `user`, `event`, `api`, `service`, `access`, `network`, `security`, `auth`, `plan` 등 → 다른 문서와 필연 충돌 (blocklist 는 `scripts/validate-aliases.mjs` 의 `GENERIC_BLOCKLIST` 참조)
5. **10 개 초과**: `aliases` 는 3-8개가 관용. 너무 많으면 다른 문서와 충돌 확률 증가

### 좋은 예: `js-function.mdx`

```yaml
---
title: "[Javascript] function"
aliases:
  - "JS function"              # 서비스/언어 접두로 유일
  - "JavaScript function"      # 명시적 언어 명시
  - "function declaration"     # JS 특화 용어
  - "function expression"      # JS 특화 용어
  # 금지: "function" (다른 언어와 충돌), "함수" (너무 일반)
---
```

**패턴**:
- 언어/서비스 접두로 unique 하게 (`JS function`, `Spring @Async`, `SSM Parameter Store`)
- 도메인 특화 용어 (`function declaration`) 는 자연스러움
- 일반 한국어 (`함수`) 는 다른 언어 위키가 있으면 충돌 위험 → 명시적 언어 접두 (`자바스크립트 함수`) 권장

### 좋은 예: `redis.md`

```yaml
---
title: "Redis"
aliases:
  - "레디스"                   # 한국어 (다른 언어와 충돌 없는 특유 명칭)
---
```

**설명**: filename 이 `redis` 이므로 `[[redis]]` 는 자동으로 매칭. title `"Redis"` 도 자동. alias 로 굳이 `redis` 를 다시 등록하는 것은 self-redundant.

### 나쁜 예 (실제 검출된 것)

```yaml
# 나쁨: aws-secrets-manager.mdx 가 Parameter Store 을 alias 로 주장
# → 실제 dedicated wiki 인 aws-ssm-parameter-store.mdx 로 가는 링크가 조용히 여기로 감
aliases:
  - "AWS Secrets Manager"
  - "Secrets Manager"
  - "Parameter Store"          # ❌ 다른 dedicated wiki 소유
  - "SSM Parameter Store"      # ❌ 다른 dedicated wiki 소유
```

```yaml
# 나쁨: 같은 이름의 대소문자 다른 버전
aliases:
  - "Parquet"       # ✓
  - "parquet"       # ❌ 정규화 후 "Parquet" 와 동일 → 중복
```

```yaml
# 나쁨: 자기 title / filename 과 동일
# filename: etl.mdx / title: "ETL / ELT"
aliases:
  - "ETL"           # ❌ filename 이 이미 매칭됨, alias 무의미
  - "ELT"           # ✓ (title 에 있지만 slash 로 결합된 부분)
```

### 작성 후 반드시 실행

```bash
bun run validate:aliases
```

- Hard error (충돌, 자체 중복): **exit 1**
- Soft warning (self-redundant, excessive, generic, broken): 리포트만
- 신규 wiki 작성 시 → hard error 0 건 + soft warning 도 새로 생기지 않게

`bun run validate:aliases:strict` 는 soft warning 도 실패 처리.

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
