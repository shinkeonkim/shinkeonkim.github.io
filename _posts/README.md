# `_posts/` — Jekyll 레거시 보관소

이 디렉토리는 **빌드 산출물에 포함되지 않습니다.**

- `eslint.config.js` 의 `ignores` 에 등록되어 ESLint 검사 제외
- `astro.config.mjs` 의 content collection (`src/content/`) 외부에 있어 자동 인덱싱 제외
- `scripts/check-no-em-dash.mjs`, `validate-content.mjs` 도 `_posts/` 를 스캔하지 않음

## 현재 잔재

```
_posts/
├── 2019-10-06-acmicpc-2019.md      # ACM-ICPC 2019 후기 (my-life 회고에 흡수)
├── 2020-02-23-BOJ-prefix-array.md   # BOJ prefix array 풀이 묶음 (낱개)
└── algorithm/
    └── 2023-09-14-algorithm-0001.md
```

이 3개는 [`scripts/migrate-jekyll-posts.py`](../scripts/migrate-jekyll-posts.py) 의 화이트리스트(`css-battle`, `TIL`, `mentoring`, `boj`, 그리고 명시된 my-life 회고 파일들)에 포함되지 않아 마이그레이션 대상에서 의도적으로 제외된 항목입니다.

## 정책

- **새 글은 여기에 작성하지 않습니다.** 모든 신규 콘텐츠는 [src/content/posts/](../src/content/posts/), [src/content/wiki/](../src/content/wiki/), [src/content/notes/](../src/content/notes/) 셋 중 하나에 작성합니다.
- 이 디렉토리는 git 히스토리 보존 목적의 archive 입니다. 동등한 내용을 새 콘텐츠로 재작성한 뒤 이 파일을 지워도 됩니다.
- 마이그레이션을 결정한 경우 `uv run scripts/migrate-jekyll-posts.py --dry-run` 으로 결과를 먼저 확인하고, 필요하면 `migrate-jekyll-posts.py` 의 `plan()` 함수에 대상 파일을 추가하세요.

## 향후 정리 옵션

1. **유지** (현 상태): 빌드 영향 0, 히스토리만 보존.
2. **재작성 후 삭제**: 가치 있는 내용은 `src/content/posts/` 로 새로 작성하고 이 디렉토리를 통째로 `git rm -r _posts/`.
3. **별도 archive 브랜치 분리**: `git switch --orphan archive/jekyll && git mv -k _posts/* . && git commit && git push origin archive/jekyll` 후 main 에서 삭제.
