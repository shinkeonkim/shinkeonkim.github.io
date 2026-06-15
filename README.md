# 김신건의 로그

<https://shinkeonkim.com>

Astro + MDX + GitHub Actions + GitHub Pages 기반의 개인 블로그. `[[wikilink]]`, backlink, 그래프 뷰는 자체 구현 (`src/plugins/remark-wikilink.mjs`).

## 구조

```
src/
├── content/
│   ├── posts/   # 일반 글 (.md / .mdx)
│   ├── notes/   # 한줄 노트
│   └── wiki/    # 위키 페이지
├── components/
├── layouts/
├── pages/
├── plugins/    # remark-wikilink 등
└── styles/
scripts/        # 일회성 유틸 (uv/Python, Node)
```

레거시 Jekyll 콘텐츠는 `_posts/`, `_tabs/`, `assets/` 에 보존되어 있으며 빌드에는 포함되지 않습니다. 현재 남은 3개 파일은 [`scripts/migrate-jekyll-posts.py`](scripts/migrate-jekyll-posts.py) 화이트리스트에서 의도적으로 제외된 잔재입니다 ([_posts/README.md](_posts/README.md) 참고).

## 개발

패키지 매니저는 [bun](https://bun.sh) 을 사용합니다.

```bash
bun install
bun dev               # http://localhost:4321
bun run build         # ./dist/ 생성
bun preview           # 빌드 결과 미리보기
bun run lint          # ESLint 실행
bun run lint:no-em-dash  # em-dash (U+2014) 사용 금지 검사
bun astro check       # 타입 검증
```

## 콘텐츠 작성

VSCode 스니펫: `.vscode/snippets/markdown.json`, `post`, `note`, `wiki` prefix.

위키 링크는 모든 콘텐츠에서 `[[페이지명]]` 또는 `[[페이지명|보여줄 텍스트]]` 형식으로 사용 가능.

### 표기 규칙

**em-dash (`&#x2014;`, U+2014) 는 사용하지 않습니다.** 영문 활자 컨벤션이라 한국어 본문·코드·문서 어디에도 어울리지 않습니다. 맥락에 따라 다음 본연의 기호로 치환합니다.

- 부제목/라벨/부연: `,` 또는 `:`
- 경로/대안 표기: `/`
- 표의 빈 칸: `-`
- 가로 구분선 아이콘: `─` (U+2500, box drawing)

`bun run lint:no-em-dash` 가 전 저장소를 스캔해서 한 건이라도 발견되면 종료 코드 1 을 돌려줍니다. `prebuild` 와 GitHub Actions 두 곳 모두에 묶여 있으니 em-dash 가 들어간 채로는 빌드도 배포도 되지 않습니다.

## Favicon 재생성

원본 아바타 (`src/avatar.png`) 가 바뀌었을 때만 다시 만들면 됩니다. JS 빌드와 분리된 일회성 유틸리티입니다.

```bash
./scripts/generate-favicons.py
```

[uv](https://docs.astral.sh/uv/) + [PEP 723](https://peps.python.org/pep-0723/) 인라인 메타데이터로 Pillow / Typer 를 임시 환경에 깔아 즉시 실행합니다. 별도 venv 나 `pip install` 이 필요 없습니다.

## 배포

`main` (또는 `master`) 브랜치로 push 하면 `.github/workflows/deploy.yml` 이 GitHub Pages 로 배포합니다. Custom domain 은 `public/CNAME` 으로 지정.
