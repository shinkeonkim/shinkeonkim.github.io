# Notes 작성 가이드

`src/content/notes/` 컨텐츠 컬렉션. **한줄 메모**, 일일 기록, 책 인용, 짧은 생각 스냅샷.

## 디렉토리 구조

```
src/content/notes/
├── 2026-06-23-leetcode.md
├── 2026-06-12-sql-levelup-interesting-quote.md
├── 2026-05-23-new-blog.md
├── ... (평탄한 구조, 서브디렉토리 없음)
```

**규칙**:
- 파일명: `YYYY-MM-DD-slug.md` (날짜 + 슬러그, 항상 `.md`)
- **`.mdx` 사용 안 함** (notes는 단순 마크다운만)
- **서브디렉토리 없음** (모든 노트가 루트에)
- URL: `/notes/{slug}/`

## Frontmatter 스키마

`src/content.config.ts`의 `notes` collection:

```yaml
---
# 필수
date: 2026-06-23T18:35:00+09:00          # date (시간까지 가능)

# 선택
tags: [tag1, tag2]                       # string[] (기본 [])
references:                              # ReferenceItem[] (기본 [])
  - id: "source-id"
    page: 100
  - title: "외부 자료"
    url: "https://..."
---
```

**Post/Wiki와 다른 점**:
- `title` 필드 **없음** (노트는 제목 없이 본문만)
- `description`, `category`, `series`, `cover`, `thumbnail` 모두 **없음**
- `date` 가 **필수** (시간 정보까지 포함 가능)

## 작성 컨셉

Notes는 **한줄 노트** 컨셉:
- 길이: 보통 100~500자 (장문이 필요하면 post로)
- 제목 없음 → frontmatter에 `title` 안 적음
- 카드 형식으로 목록에 표시되며, 120자 미리보기 자동 생성
- ID 기반으로 자동 색상 할당 (`noteColorClass`)

## 작성 패턴

### 패턴 A: 일일 기록 (이미지 포함)

```markdown
---
date: 2026-06-16T18:35:00+09:00
tags: [leetcode]
---

오늘은 leetcode easy 3문제를 풀었다.

![leetcode 풀이 스크린샷](/notes/2026-06-16-leetcode.png)

다음엔 medium 도전.
```

### 패턴 B: 책 인용

```markdown
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

### 패턴 C: 개발 일지

```markdown
---
date: 2026-06-13T22:30:00+09:00
tags: [blog, dev]
---

위키링크 매칭에서 NFC 정규화 빠뜨려서 macOS HFS+ 환경에서 한글 페이지 못 찾는 버그 있었음.

`String.normalize('NFC')` 한 줄로 해결.

[[remark-wikilink]] 참조.
```

### 패턴 D: 짧은 생각

```markdown
---
date: 2026-06-23T09:00:00+09:00
tags: [thought]
---

오늘 깨달은 것: 추상화의 비용은 항상 미래에 청구된다.

> [!NOTE]
> 처음에는 편하지만, 6개월 뒤 코드를 다시 볼 때 추상화 계층을 한 단계씩 벗겨야 한다.
```

### 패턴 E: 최소 노트 (태그조차 없음)

```markdown
---
date: 2026-06-23T11:00:00+09:00
tags: []
---

빌드 시간 30초 줄였다. 다음 목표는 20초.
```

## 날짜 형식

다음 모두 허용 (Zod `z.coerce.date()` 가 파싱):

```yaml
date: 2026-06-23                          # 날짜만 (00:00:00 KST)
date: 2026-06-23T18:35:00+09:00           # ISO 8601 with timezone
date: 2026-06-23T18:35:00Z                # UTC
date: "2026-06-23 18:35:00"               # 공백 구분 (parse 가능)
```

**권장**: `2026-06-23T18:35:00+09:00` (시간 + KST 명시)

## 본문 작성 규칙

- 마크다운 + 위키링크 + 콜아웃 + 코드블록 + 표 + 푸트노트 모두 가능
- 자세한 문법은 [markdown-syntax.md](markdown-syntax.md) 참조
- MDX 컴포넌트 (`<ChartJs />`, `<CodeWithOutput />` 등) **사용 불가** (`.md`만 허용)
- 임베드 (`<UrlPreview />`)는 remark 플러그인이 처리하므로 `.md`에서도 사용 가능 ([embeds.md](embeds.md))

## 실제 예시 파일

- 일일 기록: [src/content/notes/2026-06-16-leetcode.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/notes/2026-06-16-leetcode.md)
- 개발 일지: [src/content/notes/2026-06-13-note.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/notes/2026-06-13-note.md)
- 프로젝트 시작 메모: [src/content/notes/2026-05-23-new-blog.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/notes/2026-05-23-new-blog.md)
- 책 인용 (references 활용): [src/content/notes/2026-06-12-sql-levelup-interesting-quote.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/notes/2026-06-12-sql-levelup-interesting-quote.md)

## 검증 체크리스트 (Note 전용)

- [ ] `date` 필수 (timezone 포함 권장)
- [ ] 파일명이 `YYYY-MM-DD-slug.md` 형식
- [ ] 확장자가 `.md` (`.mdx` 아님)
- [ ] 서브디렉토리에 두지 않음 (루트만)
- [ ] `title` 필드 없음 (notes는 제목 없음)
- [ ] em-dash 사용 안 함
- [ ] [SKILL.md](SKILL.md) 의 공통 체크리스트 모두 통과
