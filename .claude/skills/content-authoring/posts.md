# Posts 작성 가이드

`src/content/posts/` 컨텐츠 컬렉션. 완성된 글, 깊이 있는 설명, 튜토리얼, 회고 등 장문 컨텐츠.

## 디렉토리 구조

```
src/content/posts/
├── 2026-06-23-title.md          # 루트에 직접 (단일 글)
├── books/                        # 책 정리
│   └── multi-paradigm-programming/
├── my-life/                      # 회고
├── problem-solving/              # 알고리즘 (계층 구조)
│   ├── boj/
│   ├── leetcode/
│   │   ├── algorithm/
│   │   ├── database/
│   │   └── shell/
│   └── atcoder/
├── TIL/                          # Today I Learned
├── css-battle/, mentoring/, ...
```

**규칙**:
- 파일명: `YYYY-MM-DD-slug.{md,mdx}` (날짜 + 슬러그)
- 카테고리 디렉토리는 선택 (단순 글은 루트, 시리즈는 디렉토리화)
- URL: `/posts/{slug}/` (날짜 prefix 포함 안 함)

## Frontmatter 스키마

`src/content.config.ts`의 `posts` collection 정의:

```yaml
---
# 필수
title: "글 제목"                                 # string
date: 2026-06-23                                 # date (ISO 8601 or YYYY-MM-DD)

# 선택
description: "SEO 설명 (60~160자 권장)"          # string
updated: 2026-06-23                              # date
tags: [tag1, tag2, tag3]                         # string[]
category: "카테고리명"                            # string
series: "시리즈명"                                # string
seriesOrder: 1                                   # number (시리즈 내 순서)
draft: false                                     # boolean (기본 false)
cover: "/path/to/cover.png"                      # string (public/ 기준)
coverAlt: "커버 이미지 alt 텍스트"                # string (cover 있으면 필수)
coverCredit: "사진 출처"                          # string
thumbnail: "/path/to/thumb.png"                  # string (목록 표시용)
references:                                      # ReferenceItem[]
  - id: "source-id"                              # sources/ 에 존재해야 함
    page: 42                                     # number (선택)
    anchor: "section-slug"                       # string (선택)
    note: "참조 설명"                             # string (선택)
  - title: "외부 자료 제목"                       # 인라인 형식
    url: "https://example.com"
    author: "저자명"                              # 선택
    note: "참조 설명"                             # 선택
---
```

## .md vs .mdx 선택 기준

| 상황 | 사용 |
|:---|:---|
| 일반 글, 회고, 짧은 기록 | `.md` |
| 알고리즘 풀이 (코드만) | `.md` |
| 책 정리 (텍스트 위주) | `.md` |
| 기술 글에 차트/그래프 필요 | `.mdx` (`<ChartJs />`) |
| 코드 + 출력 패널 필요 | `.mdx` (`<CodeWithOutput />`) |
| 멀티 언어 코드 비교 | `.mdx` (`<CodeWithOutput variants={...} />`) |
| 임의 JSX 컴포넌트 사용 | `.mdx` |

애니메이션 (` ```anim:id `), Mermaid (` ```mermaid `), URL preview (`<UrlPreview />`), 위키링크는 둘 다 가능.

## 작성 패턴

### 패턴 A: 단순 글 (.md)

```markdown
---
title: "제목"
description: "한 문장 설명"
date: 2026-06-23
tags: [tag1, tag2]
---

## 도입

본문 내용...

## 본문

[[관련 위키페이지]] 참조.

> [!NOTE]
> 정보성 콜아웃

```python
def hello():
    print("world")
```
```

### 패턴 B: 알고리즘 풀이 (.md)

```markdown
---
title: "[백준 1234] 문제 제목"
date: 2026-06-23
tags: [boj, algorithm, dp]
category: "Algorithm"
---

## 문제

[BOJ 1234 - 문제 제목](https://www.acmicpc.net/problem/1234)

## 풀이

핵심 아이디어: ...

## 코드

```python
n = int(input())
print(n * 2)
```

## 시간 복잡도

$O(n \log n)$
```

### 패턴 C: 시리즈 글 (.md)

```markdown
---
title: "Astro 블로그 만들기 (3) 검색 추가"
date: 2026-06-23
tags: [astro, blog, search]
series: "Astro 블로그 만들기"
seriesOrder: 3
---

이전 글: [[Astro 블로그 만들기 (2) 댓글 추가]]

## 본문

...
```

### 패턴 D: 인터랙티브 글 (.mdx)

```mdx
---
title: "프로세서 종류별 메모리 대역폭"
description: "CPU vs GPU vs TPU vs NPU 성능 비교"
date: 2026-06-23
tags: [hardware, performance]
---

## 비교

<ChartJs
  client:visible
  type="bar"
  title="메모리 대역폭 (GB/s)"
  caption="DDR5 대비 HBM3e가 ~90배"
  data={{
    labels: ['DDR5', 'HBM3', 'HBM3e'],
    datasets: [{
      label: 'GB/s',
      data: [89, 3350, 8000],
      backgroundColor: ['#3b82f6', '#16a34a', '#dc2626']
    }]
  }}
  options={{
    scales: { y: { type: 'logarithmic' } }
  }}
/>

## 코드 예시

<CodeWithOutput
  language="python"
  code={`import torch
torch.cuda.is_available()`}
  output={`True`}
/>

## 시각화

```anim:cpu-gpu-memory
{}
```
```

## 자주 쓰이는 frontmatter 조합

### 최소 (드래프트)

```yaml
---
title: "초안 제목"
date: 2026-06-23
draft: true
---
```

### 시리즈

```yaml
---
title: "시리즈 글 (3) 부제"
date: 2026-06-23
tags: [...]
series: "시리즈 메인 제목"
seriesOrder: 3
---
```

### 참고 자료 풍부한 기술 글

```yaml
---
title: "Redis 캐싱 패턴"
description: "Cache-aside, Write-through, Write-behind 비교"
date: 2026-06-23
tags: [redis, cache, database]
category: "Database"
cover: "/covers/redis-patterns.png"
coverAlt: "Redis 캐싱 패턴 3종 다이어그램"
references:
  - id: "ddia"                                # sources/ddia.md
    page: 89
    note: "캐시 패턴 분류"
  - id: "개발자를-위한-레디스"
    note: "Redis 캐시 모범 사례"
  - title: "Cache-Aside Pattern (Microsoft)"
    url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside"
---
```

## 실제 예시 파일

- 단순 글: [src/content/posts/scaling-blog-to-10k-posts.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/scaling-blog-to-10k-posts.md)
- 마크다운 종합 데모: [src/content/posts/markdown-kitchen-sink.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/markdown-kitchen-sink.mdx)
- 차트 활용: [src/content/posts/2026-06-16-cpu-gpu-tpu-npu.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/2026-06-16-cpu-gpu-tpu-npu.mdx)
- 애니메이션 활용: [src/content/posts/2026-06-15-js-async-timing.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/2026-06-15-js-async-timing.mdx)
- 클로저 글: [src/content/posts/2026-06-13-lexical-environment-closure.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/2026-06-13-lexical-environment-closure.mdx)
- 코드 + 출력 데모: [src/content/posts/code-with-output-showcase.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/code-with-output-showcase.mdx)

## 검증 체크리스트 (Post 전용)

- [ ] `title`, `date` 필수
- [ ] `description` 작성 시 60~160자 (벗어나면 WARN)
- [ ] `cover` 있으면 `coverAlt` 필수
- [ ] `series` 있으면 `seriesOrder` 도 명시 권장
- [ ] `references[].id` 모두 `sources/` 에 존재
- [ ] 파일명이 `YYYY-MM-DD-slug.{md,mdx}` 형식
- [ ] em-dash 사용 안 함
- [ ] [SKILL.md](SKILL.md) 의 공통 체크리스트 모두 통과

## 마이그레이션 주의

- 새 글은 절대 `_posts/`(레거시 Jekyll archive)에 작성하지 않음. 모든 신규 컨텐츠는 `src/content/posts/`, `src/content/wiki/`, `src/content/notes/` 셋 중 하나.
- 레거시 Jekyll 글을 옮기려면 `uv run scripts/migrate-jekyll-posts.py --dry-run` 으로 먼저 확인.
