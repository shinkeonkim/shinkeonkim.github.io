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

레거시 Jekyll 콘텐츠는 `_posts/`, `_tabs/`, `assets/` 에 보존되어 있으며 빌드에는 포함되지 않습니다. 이후 점진적으로 `src/content/` 로 마이그레이션 합니다.

## 개발

패키지 매니저는 [bun](https://bun.sh) 을 사용합니다.

```bash
bun install
bun dev          # http://localhost:4321
bun run build    # ./dist/ 생성
bun preview      # 빌드 결과 미리보기
bun run lint     # ESLint 실행
bun astro check  # 타입 검증
```

## 콘텐츠 작성

VSCode 스니펫: `.vscode/snippets/markdown.json` — `post`, `note`, `wiki` prefix.

위키 링크는 모든 콘텐츠에서 `[[페이지명]]` 또는 `[[페이지명|보여줄 텍스트]]` 형식으로 사용 가능.

## Favicon 재생성

원본 아바타 (`src/avatar.png`) 가 바뀌었을 때만 다시 만들면 됩니다. JS 빌드와 분리된 일회성 유틸리티입니다.

```bash
./scripts/generate-favicons.py
```

[uv](https://docs.astral.sh/uv/) + [PEP 723](https://peps.python.org/pep-0723/) 인라인 메타데이터로 Pillow / Typer 를 임시 환경에 깔아 즉시 실행합니다. 별도 venv 나 `pip install` 이 필요 없습니다.

## 배포

`main` (또는 `master`) 브랜치로 push 하면 `.github/workflows/deploy.yml` 이 GitHub Pages 로 배포합니다. Custom domain 은 `public/CNAME` 으로 지정.
