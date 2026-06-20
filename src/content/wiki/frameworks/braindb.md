---
title: "BrainDB"
aliases: ["braindb", "@braindb/astro"]
tags: [tool, web, knowledge]
updated: 2026-05-23
---

## 개요

[BrainDB](https://github.com/stereobooster/braindb) 는 마크다운 콘텐츠를 데이터베이스처럼 다룰 수 있게 해주는 [[Astro]] 통합 라이브러리다.

## 제공하는 것

- 위키링크 자동 처리 (`@braindb/remark-wiki-link`)
- backlink 추출
- 콘텐츠 그래프 데이터 (이 블로그의 [그래프](/graph/) 페이지 기반)
- 깨진 링크 감지

## 이 블로그에서의 사용

원래 BrainDB 를 `astro.config.mjs` 의 integrations 에 추가해서 쓰려고 했으나, 의존 패키지인 `better-sqlite3` 가 Node.js 26 과 호환되지 않아 빌드가 깨졌다. 그래서 결국 작은 커스텀 remark 플러그인(`src/plugins/remark-wikilink.mjs`)으로 위키링크 처리, backlink, 그래프 데이터를 직접 구현했다.

BrainDB 가 제공하던 핵심 기능만 추려 보면 그 양이 많지 않아서, 직접 작성하는 편이 의존성도 가볍고 디버깅도 쉬웠다.
