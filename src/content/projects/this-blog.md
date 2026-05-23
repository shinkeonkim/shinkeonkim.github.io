---
title: "shinkeonkim.com — 개인 블로그"
summary: "Astro · MDX · 자체 wikilink + 그래프 뷰 · 자체 dev 에디터 · 1만 글 빌드 최적화."
description: "이 사이트 자체. 자체 wikilink/그래프/검색/dev-only 콘텐츠 에디터까지 모두 포함된 풀스택 정적 블로그."
start: 2026-05-23
teamSize: 1
role: "기획·디자인·구현·운영"
status: ongoing
featured: true
repos:
  - url: "https://github.com/shinkeonkim/shinkeonkim.github.io"
    label: "shinkeonkim/shinkeonkim.github.io"
    track: true
stack:
  - Astro
  - TypeScript
  - React
  - three.js
  - Tailwind CSS
  - Pagefind
  - D3.js
links:
  - url: "https://shinkeonkim.com"
    label: "사이트 열기"
tags: [blog, astro, personal]
---

## 무엇을 만들었나

Quartz 에서 벗어나 디자인 자유도와 콘텐츠 모델을 직접 관리하기 위해 Astro 위에 새로 짓는 개인 블로그.

## 고민

- **콘텐츠 모델 분리**: posts / notes / wiki / sources / projects 5개 컬렉션. 각 컬렉션은 schema 가 다르고 페이지·라우팅도 분리.
- **자체 wikilink + backlink**: BrainDB 의존성을 빼고 `src/plugins/remark-wikilink.mjs` 로 직접 처리. 1만 글 기준 O(N) 처리.
- **그래프 뷰**: D3 force (2D) + react-force-graph-3d (3D). 태그도 다른 도형 노드로 시각화.
- **검색**: Pagefind 정적 인덱스. 빌드 후 dist/pagefind/ 에 인덱스 자동 생성.
- **3D Hero**: 노트북 + 키보드 + 떨어지는 단어 sprite. raw three.js.
- **콘텐츠 에디터 (dev only)**: 트리 사이드바·자동저장·위키링크 자동완성·이미지 업로드·git commit/push 까지 통합.

## 담당

전체 단독 작업. 기획→디자인→구현→검증→운영까지.

## 구조

```
src/
├── content/       # posts, notes, wiki, sources, projects
├── components/    # 재사용 컴포넌트
├── layouts/       # PostLayout, ProjectLayout, BaseLayout
├── pages/         # 라우트
├── plugins/       # remark-wikilink, remark-mermaid
├── lib/           # 도메인 로직 (taxonomy, references, projects, content-graph)
├── dev-only/      # 콘텐츠 에디터 + 13개 모듈
└── data/          # 캐시 (url-previews.json, project-stats.json)
```

## 회고

블로그를 "도구" 로 다루기 시작하니 글쓰기 흐름도 바뀐다. 메모 → 위키 → 글 → 시리즈 의 단계를 콘텐츠 모델이 직접 표현.
