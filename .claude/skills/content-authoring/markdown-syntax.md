# 공통 마크다운 문법 및 플러그인 가이드

모든 컨텐츠 컬렉션 (posts, notes, wiki) 에서 사용 가능한 마크다운 문법과 활성화된 remark/rehype 플러그인 정리.

## 등록된 플러그인 (실행 순서)

`astro.config.mjs`의 markdown 설정:

### Remark (마크다운 → AST)

| 순서 | 플러그인 | 종류 | 활성화 문법 |
|:---:|:---|:---|:---|
| 1 | `remarkAnimation` | 자체 | ` ```anim:id ` 코드 펜스 |
| 2 | `remarkMermaid` | 자체 | ` ```mermaid ` 코드 펜스 |
| 3 | `remarkAlert` | 외부 (`remark-github-blockquote-alert`) | `> [!NOTE]` 등 콜아웃 |
| 4 | `remarkWikilink` | 자체 | `[[페이지명]]` 위키링크 |
| 5 | `remarkMathLenient` | 자체 | `$ ... $` 공백 정규화 |
| 6 | `remarkMath` | 외부 | KaTeX 수학 |
| 7 | `remarkUrlPreview` | 자체 | `<UrlPreview url=".../>` |

### Rehype (HTML 변환)

| 순서 | 플러그인 | 효과 |
|:---:|:---|:---|
| 1 | `rehypeSlug` | 헤딩에 ID 자동 추가 |
| 2 | `rehypeAutolinkHeadings` | 헤딩에 앵커 링크 (CSS `::after` 로 # 표시) |
| 3 | `rehypeExternalLinks` | 외부 링크에 `target="_blank" rel="noopener noreferrer"` |
| 4 | `rehypeKatex` | `$ ... $` → KaTeX HTML |
| 5 | `rehypeLazyImages` | 이미지에 `loading="lazy" decoding="async"` |

### Shiki (코드 하이라이팅)

```javascript
shikiConfig: {
  themes: {
    light: 'github-light',
    dark: 'one-dark-pro',
  },
  wrap: true,                    // 긴 줄 자동 줄바꿈
}
```

## 1. 기본 텍스트

```markdown
**굵게** · *기울임* · ***굵게+기울임*** · ~~취소선~~
`인라인 코드` · <u>밑줄 (HTML)</u>

자동 링크: [https://astro.build](https://astro.build)
일반 링크: [Astro 공식 문서](https://docs.astro.build)
```

외부 링크는 `rehypeExternalLinks` 가 자동으로 `target="_blank"` 추가.

## 2. 헤딩

```markdown
## 2단계 헤딩
### 3단계 헤딩
#### 4단계 헤딩
##### 5단계 헤딩
###### 6단계 헤딩
```

**규칙**:
- `#` (h1) 은 글 제목용. 본문에서는 사용 안 함 (frontmatter의 `title` 이 h1)
- `##` 부터 시작
- 각 헤딩에 자동 ID 부여 (`rehypeSlug`)
- 위키링크 `[[페이지명#섹션]]` 의 앵커는 이 ID 와 매칭

## 3. 위키링크 (`[[...]]`)

```markdown
[[페이지명]]                          # 기본
[[페이지명|보여줄 텍스트]]            # 별칭
[[페이지명#섹션]]                     # 앵커 링크
[[페이지명#섹션|보여줄 텍스트]]       # 별칭 + 앵커
```

### 매칭 우선순위 (NFC + lowercase 정규화 후)

1. 파일 경로 (`network/tcp`)
2. 파일명 (`tcp`)
3. Frontmatter `title`
4. Frontmatter `aliases` 배열

### 깨진 링크

매칭 실패 → `<a class="wikilink broken" aria-disabled="true">페이지명 (페이지 없음)</a>`. `validate:content` 가 WARN.

자세히: [wiki.md](wiki.md)

## 4. 콜아웃 (GitHub 스타일)

```markdown
> [!NOTE]
> 정보성 메시지

> [!TIP]
> 팁과 조언

> [!IMPORTANT]
> 중요 정보 (목표 달성에 필요)

> [!WARNING]
> 경고 (문제 회피)

> [!CAUTION]
> 주의 (위험/부정적 결과)
```

각각 `<div class="remark-alert remark-alert-{type}">` 로 렌더링.

## 5. 리스트

```markdown
- 순서 없는 항목
  - 중첩
    - 더 깊은 중첩

1. 순서 있는 항목
2. 두 번째

- [x] 완료된 체크박스 (GFM)
- [ ] 미완료
```

## 6. 코드 블록

````markdown
```typescript
interface User {
  id: string;
  name: string;
}
```

```python
def hello():
    print("world")
```

```bash
#!/usr/bin/env bash
set -euo pipefail
```

```json
{ "name": "demo" }
```

```diff
- old line
+ new line
```

```
언어 명시 안 함 (하이라이팅 없음)
```
````

**Shiki 지원 언어** (100+):
- 웹: `html`, `css`, `scss`, `js`, `ts`, `tsx`, `jsx`, `json`, `yaml`, `toml`
- 백엔드: `python`, `go`, `rust`, `java`, `kotlin`, `c`, `cpp`, `csharp`, `ruby`, `php`
- 데이터: `sql`, `bash`, `sh`, `diff`, `regex`, `graphql`
- 마크업: `markdown`, `xml`, `dockerfile`, `makefile`

## 7. 표

```markdown
| 왼쪽 정렬 | 가운데 정렬 | 오른쪽 정렬 |
|:----------|:-----------:|------------:|
| left      | center      | right       |
| 짧은      | 중간 길이    | 더 긴 텍스트 |
```

`:` 위치로 정렬 지정 (`:---` 왼쪽, `:---:` 가운데, `---:` 오른쪽).

## 8. 이미지

```markdown
![alt text](/path/to/image.png)              # public/ 절대 경로
![remote](https://example.com/image.png)     # 원격
```

**자동 처리** (`rehypeLazyImages`):
```html
<img src="..." loading="lazy" decoding="async" fetchpriority="low" />
```

**Eager loading** (필요 시 HTML 직접 작성):
```html
<img src="/critical.png" data-eager />
<img src="/critical.png" data-priority />
```

**Cover 이미지** (frontmatter):
```yaml
cover: "/covers/my-cover.png"
coverAlt: "alt 텍스트"            # 필수 (a11y/SEO, 없으면 WARN)
```

자세히: [manual-docs/image-optimization-guide.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/manual-docs/image-optimization-guide.md)

## 9. 푸트노트

```markdown
본문[^note1] 어떤 내용[^note2].

[^note1]: 푸트노트 1 내용
[^note2]: 푸트노트 2 내용
```

## 10. 구분선 / 줄바꿈

```markdown
---

위는 구분선.

줄 끝에 공백 2개  
강제 줄바꿈.
```

## 11. HTML 직접 삽입

마크다운 안에서 필요시:

```markdown
<details>
<summary>접기 영역</summary>

이 안에 마크다운 동작 안 함 (raw HTML). 텍스트와 일반 HTML만.

</details>

<kbd>⌘</kbd> + <kbd>K</kbd> 같은 단축키.
```

## 12. 수학 (`$...$`, `$$...$$`)

### 인라인

```markdown
복잡도는 $O(n \log n)$ 입니다.
```

### 디스플레이 (블록)

```markdown
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

### 공백 허용 (`remarkMathLenient`)

다음 모두 동작:
```markdown
$ a + b = c $              # 양쪽 공백 OK
$$ x^2 $$                  # 디스플레이 공백 OK
$x^2$                      # 공백 없음
```

내부적으로 공백 제거 후 KaTeX 처리.

## 13. Mermaid 다이어그램

````markdown
```mermaid
flowchart LR
    A --> B
```
````

자세히: [embeds.md](embeds.md#3-mermaid-다이어그램)

## 14. 애니메이션

````markdown
```anim:animation-id
{}
```
````

자세히: [animations.md](animations.md)

## 15. URL 미리보기 카드

```markdown
<UrlPreview url="https://example.com" />
```

remark 플러그인이라 `.md` 에서도 사용 가능. 자세히: [embeds.md](embeds.md#1-url-preview-card)

## 16. JSX 컴포넌트 (MDX 전용)

`.mdx` 에서만:

```mdx
<ChartJs client:visible type="bar" data={{...}} />
<CodeWithOutput language="python" code={`...`} output={`...`} />
<YouTube id="..." />
<Tweet id="..." />
<!-- 등등 -->
```

자세히: [embeds.md](embeds.md), [charts.md](charts.md)

## Lint 및 검증

### em-dash (`&#x2014;`, U+2014) 금지

```bash
bun run lint:no-em-dash             # 검사
bun run lint:no-em-dash --quiet     # 종료 코드만
bun run lint:no-em-dash --json      # JSON 출력
```

**스캔 범위**: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.astro`, `.md`, `.mdx`, `.json`, `.css`, `.html`, `.yml`, `.py`

**제외**: `node_modules`, `.git`, `dist`, `.astro`, `.cache`, `_posts`, `_tabs`, `assets`, `manual-docs`

**대체 기호**:
- 부제목/라벨/부연: `,` 또는 `:`
- 경로/대안 표기: `/`
- 표의 빈 칸: `-`
- 가로 구분선 아이콘: `─` (U+2500)

빌드 파이프라인 (`prebuild`) 에 포함, 1건이라도 발견되면 빌드 실패.

### Content 검증

```bash
bun run validate:content              # WARN 까지 표시
bun run validate:content --strict     # WARN 도 실패 처리
bun run validate:content --json       # JSON 출력
```

검사 항목:

| 항목 | 심각도 |
|:---|:---:|
| Frontmatter 파싱 실패 | ERROR |
| 중복 slug (같은 컬렉션 내) | ERROR |
| `cover` 파일 없음 | ERROR |
| `cover` 있는데 `coverAlt` 없음 | WARN |
| `thumbnail` 파일 없음 | ERROR |
| `description` 50자 미만 또는 200자 초과 (posts/wiki) | WARN |
| `references[].id` 가 sources 에 없음 | ERROR |
| 깨진 위키링크 (`[[...]]`) | WARN |

빌드 파이프라인 (`prebuild`) 에 포함.

### 기타 명령

```bash
bun run check:links                   # 내부/외부 링크 검증
bun run check:links:internal          # 내부 링크만
bun run audit:alt                     # 이미지 alt 텍스트 감사
bun astro check                       # 타입 검증
```

## Prebuild 파이프라인

`bun run build` 실행 시 자동으로 prebuild:

```bash
bun scripts/check-no-em-dash.mjs         # em-dash 검사
bun scripts/download-pretendard.mjs      # 폰트 다운로드
bun scripts/fetch-giscus-counts.mjs      # 댓글 수 갱신
bun scripts/fetch-url-previews.mjs       # URL 미리보기 갱신
bun scripts/generate-search-tags.mjs     # 검색 인덱스
bun scripts/validate-content.mjs         # 콘텐츠 검증
```

`bun dev` 실행 시 predev:

```bash
bun scripts/download-pretendard.mjs
bun scripts/fetch-url-previews.mjs --quiet
bun scripts/generate-search-tags.mjs
```

## 자주 묻는 질문

**Q: 위키링크가 작동하지 않습니다.**
A: 대상 페이지의 `title` 또는 `aliases` 확인. NFC + lowercase 정규화 후 매칭.

**Q: 이미지가 로드되지 않습니다.**
A: `validate:content` 로 `cover` / `thumbnail` 경로 확인.

**Q: 수학 표현식이 렌더링되지 않습니다.**
A: `remarkMathLenient` 가 공백 정규화하므로 `$ ... $` 도 동작. 그래도 안 되면 `remarkMath` + `rehypeKatex` 처리 단계 확인.

**Q: Mermaid가 다크 모드에서 안 보입니다.**
A: 자동 재렌더링됨. 페이지 새로고침 후 재시도.

**Q: MDX 에서 컴포넌트를 import 해야 하나요?**
A: `<ChartJs />`, `<CodeWithOutput />` 은 `astro-auto-import` 로 자동 import. 나머지는 `astro.config.mjs` 의 `AutoImport.imports` 배열 확인.

**Q: em-dash 대신 뭘 써야 하나요?**
A: 문맥에 따라 `,` (부연), `:` (라벨), `/` (경로/대안), `-` (대안) 사용.

**Q: `_posts/` 에 글을 써도 되나요?**
A: 안 됨. `_posts/` 는 Jekyll 레거시 archive, 빌드에서 제외. 모든 신규 컨텐츠는 `src/content/posts/`, `src/content/wiki/`, `src/content/notes/` 에.

## 참고 파일

- Astro 설정: [astro.config.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/astro.config.mjs)
- 위키링크 플러그인: [src/plugins/remark-wikilink.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/remark-wikilink.mjs)
- 애니메이션 플러그인: [src/plugins/remark-animation.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/remark-animation.mjs)
- Mermaid 플러그인: [src/plugins/remark-mermaid.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/remark-mermaid.mjs)
- 수학 정규화: [src/plugins/remark-math-lenient.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/remark-math-lenient.mjs)
- URL preview: [src/plugins/remark-url-preview.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/remark-url-preview.mjs)
- Lazy images: [src/plugins/rehype-lazy-images.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/plugins/rehype-lazy-images.mjs)
- em-dash 검사: [scripts/check-no-em-dash.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/check-no-em-dash.mjs)
- Content 검증: [scripts/validate-content.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/validate-content.mjs)
- 마크다운 종합 데모: [src/content/posts/markdown-kitchen-sink.mdx](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/content/posts/markdown-kitchen-sink.mdx)
