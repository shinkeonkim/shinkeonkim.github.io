# References & Sources 가이드

참고문헌/인용 관리 시스템. **Source** (재사용 가능한 자료 정의)와 **Reference** (실제 인용)를 구분합니다.

## 개념

- **Source** (`src/content/sources/`): 자료의 메타데이터 정의. 한 번 등록 후 여러 글에서 ID로 참조.
- **Reference** (`frontmatter.references[]`): 글 안에서 사용하는 실제 인용. Source ID를 가리키거나 인라인 데이터.

같은 책을 여러 글에서 인용한다면 → Source 등록 후 ID로 참조.
일회성 외부 링크라면 → Inline 형식으로 직접 작성.

## Source 작성 (`src/content/sources/`)

### 디렉토리 / 파일명

```
src/content/sources/
├── ddia.md                          # ASCII 영문 ID 권장
├── astro-docs.md
├── python-docs.md
├── sql-레벨업.md                    # 한글 ID도 가능
└── 멀티패러다임-프로그래밍.md
```

- 파일명 = source ID (확장자 제외)
- 파일명에 한글 가능하지만 ASCII 권장 (URL 안전성)
- 항상 `.md`

### Frontmatter 스키마

`src/content.config.ts`의 `sources` collection:

```yaml
---
# 필수
title: "자료 제목"

# 선택
type: book                              # book | article | paper | website | video | talk | other (기본 'other')
author: "저자명"
publisher: "출판사"
year: 2017                              # number
isbn: "978-1449373320"                  # 책
doi: "10.1145/..."                      # 논문
url: "https://..."                      # 웹 자료
aliases: ["DDIA", "데이터 중심..."]      # string[]
tags: ["systems", "database"]           # string[]
---

선택적 본문 (자료에 대한 설명).
```

### Type 선택 가이드

| type | 용도 |
|:---|:---|
| `book` | 책 (ISBN 권장) |
| `article` | 블로그 글, 기사 |
| `paper` | 논문 (DOI 권장) |
| `website` | 공식 문서, 웹사이트 |
| `video` | YouTube 등 영상 |
| `talk` | 컨퍼런스 강연 |
| `other` | 위에 안 맞음 |

### 예시 1: 책

```yaml
---
title: "Designing Data-Intensive Applications"
type: book
author: "Martin Kleppmann"
publisher: "O'Reilly"
year: 2017
isbn: "978-1449373320"
url: "https://dataintensive.net"
aliases: ["DDIA", "데이터 중심 애플리케이션 설계"]
tags: ["systems", "database", "distributed"]
---

분산 시스템과 데이터 인프라의 정수를 정리한 책. 복제·파티셔닝·트랜잭션·일관성 모델의 트레이드오프를 깊이 다룬다. 블로그에서 시스템·DB 글을 쓸 때 자주 참조한다.
```

### 예시 2: 공식 문서

```yaml
---
title: "Astro 공식 문서"
type: website
publisher: "Astro"
url: "https://docs.astro.build"
aliases: ["Astro Docs"]
tags: ["astro", "framework"]
---
```

### 예시 3: 논문

```yaml
---
title: "Dynamo: Amazon's Highly Available Key-value Store"
type: paper
author: "Giuseppe DeCandia et al."
publisher: "ACM"
year: 2007
doi: "10.1145/1294261.1294281"
url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf"
tags: ["distributed-systems", "kv-store"]
---
```

## Reference 작성 (post/wiki/note frontmatter)

`references` 필드는 `posts`, `notes`, `wiki` 컬렉션 모두 지원. 두 가지 형식이 union 으로 허용됨.

### 형식 1: ID 참조 (Source 기반)

```yaml
references:
  - id: "ddia"                        # 필수: sources/ddia.md 의 파일명
    page: 89                          # 선택: 페이지
    anchor: "section-slug"            # 선택: 섹션 앵커
    note: "캐시 패턴 분류"             # 선택: 인용 설명
```

### 형식 2: Inline (직접 입력)

```yaml
references:
  - title: "RFC 9293, TCP"            # 필수
    url: "https://datatracker.ietf.org/doc/html/rfc9293"   # 선택
    author: "IETF"                    # 선택
    note: "공식 TCP 명세"              # 선택
```

### 혼합 사용

```yaml
references:
  - id: "ddia"
    page: 89
    note: "캐시 패턴 분류"
  - id: "개발자를-위한-레디스"
    note: "캐싱 모범 사례"
  - title: "Cache-Aside Pattern (Microsoft)"
    url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside"
```

## 렌더링

자동으로 `<ReferencesBlock references={frontmatter.references} />` 컴포넌트가 글 하단에 번호 매겨진 리스트로 표시.

- ID 참조: `Author · Title · Year · p.42 · [↗ external link]`
- Inline: `Title · Author · [note]`

작성자는 별도로 컴포넌트 호출할 필요 없음.

## 검증 규칙 (CRITICAL)

`scripts/validate-content.mjs` 가 다음을 검사:

```javascript
// references[].id 가 sources 컬렉션에 존재하지 않으면 ERROR
if (!sourceIds.has(ref.id.normalize('NFC'))) {
  ERROR: `references unknown source id: ${ref.id}`
}
```

- 빌드 시 `prebuild` 에서 `bun run validate:content` 자동 실행
- ID 잘못되면 빌드 실패

**해결책**:
1. Source 파일이 존재하는지 `ls src/content/sources/` 로 확인
2. 파일명 (.md 제외) 과 정확히 일치하는지 확인 (NFC 정규화 후)
3. 없으면 새 Source 파일 생성

## 작성 패턴

### 패턴 A: 책 정리 글 (여러 페이지 참조)

```yaml
---
title: "DDIA Chapter 5 정리, Replication"
date: 2026-06-23
tags: [book, distributed-systems]
references:
  - id: "ddia"
    page: 151
    note: "리더리스 복제 정의"
  - id: "ddia"
    page: 178
    note: "쿼럼 조건 (w + r > n)"
  - id: "ddia"
    page: 184
    note: "충돌 해결 전략"
---
```

### 패턴 B: 기술 글 (혼합)

```yaml
---
title: "Redis 캐싱 패턴"
date: 2026-06-23
tags: [redis, cache]
references:
  - id: "ddia"
    page: 89
  - id: "개발자를-위한-레디스"
    note: "공식 가이드"
  - title: "Cache-Aside Pattern"
    url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside"
  - title: "Read-through 와 Write-through"
    url: "https://example.com/article"
    author: "John Doe"
---
```

### 패턴 C: 인용 노트 (note)

```yaml
---
date: 2026-06-12T16:17:00+09:00
tags: [book, sql]
references:
  - id: "sql-레벨업"
    page: 42
---

> 인덱스가 있어도 옵티마이저가 풀 스캔을 선택하는 경우가 있다.

WHERE 절의 함수 사용, 형변환, 부정형 조건이 대표적.
```

### 패턴 D: 외부 자료만 (Source 없이)

```yaml
---
title: "QUIC 프로토콜 정리"
date: 2026-06-23
tags: [network, quic]
references:
  - title: "RFC 9000, QUIC"
    url: "https://datatracker.ietf.org/doc/html/rfc9000"
    author: "IETF"
  - title: "RFC 9001, Using TLS to Secure QUIC"
    url: "https://datatracker.ietf.org/doc/html/rfc9001"
    author: "IETF"
  - title: "RFC 9002, QUIC Loss Detection and Congestion Control"
    url: "https://datatracker.ietf.org/doc/html/rfc9002"
    author: "IETF"
---
```

## 현재 등록된 Sources (참고)

`src/content/sources/`:
- `astro-docs.md` - Astro 공식 문서
- `ddia.md` - Designing Data-Intensive Applications
- `django-docs.md` - Django 공식 문서
- `drf-docs.md` - Django REST Framework 문서
- `mdn-web-docs.md` - MDN Web Docs
- `mysql-docs.md` - MySQL 공식 문서
- `pandas-docs.md` - pandas 공식 문서
- `postgresql-docs.md` - PostgreSQL 공식 문서
- `python-clean-code-2nd-edition.md` - Clean Code in Python 2nd Edition
- `python-docs.md` - Python 공식 문서
- `python-peps.md` - Python PEPs
- `rails-api.md` - Rails API 가이드
- `rails-guides.md` - Rails 공식 가이드
- `spring-docs.md` - Spring 공식 문서
- `sql-레벨업.md` - SQL 레벨업
- `개발자를-위한-레디스.md` - 개발자를 위한 레디스
- `멀티패러다임-프로그래밍.md` - 멀티패러다임 프로그래밍

새 책/자료를 자주 인용한다면 → 먼저 `src/content/sources/` 에 등록.

## 결정 트리

**언제 Source 등록할 것인가?**

```
이 자료를 2번 이상 인용할 가능성이 있는가?
├── YES → Source 등록
│   └── ID로 참조 (page 필드 활용)
└── NO → Inline 형식
    └── title + url + (author, note 선택)
```

**Source 파일은 어떻게 만드나?**

1. `src/content/sources/{kebab-case-id}.md` 생성
2. Frontmatter 작성 (`title`, `type` 필수, 나머지는 자료에 맞게)
3. 본문에 자료에 대한 짧은 설명 (선택)
4. 글에서 `references: [{ id: "kebab-case-id" }]` 로 참조

## 실제 예시 파일

- Source (책): [src/content/sources/ddia.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/sources/ddia.md)
- Source (공식 문서): [src/content/sources/astro-docs.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/sources/astro-docs.md)
- Source (한글 ID): [src/content/sources/sql-레벨업.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/sources/sql-레벨업.md)
- Reference 활용 노트: [src/content/notes/2026-06-12-sql-levelup-interesting-quote.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/notes/2026-06-12-sql-levelup-interesting-quote.md)
- Reference 활용 wiki: [src/content/wiki/network/tcp.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/wiki/network/tcp.md)

## 검증 체크리스트

- [ ] `references[].id` 모두 `src/content/sources/` 에 파일 존재
- [ ] Source 파일은 `title` 필수, `type` 적절히 선택
- [ ] 책이면 `isbn`, 논문이면 `doi`, 웹이면 `url`
- [ ] Inline reference는 `title` 필수
- [ ] `bun run validate:content` 통과

## 참고 파일

- 스키마: [src/content.config.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content.config.ts)
- 렌더링 컴포넌트: [src/entities/source/ui/ReferencesBlock.astro](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/entities/source/ui/ReferencesBlock.astro)
- 검증 로직: [scripts/validate-content.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/validate-content.mjs#L165-L175)
- Reference 시스템: [src/shared/lib/references/references.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/shared/lib/references/references.ts)
