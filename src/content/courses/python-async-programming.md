---
title: "Python 비동기 프로그래밍: asyncio 부터 GIL 까지"
description: "asyncio 코루틴에서 시작해 async generator, concurrent.futures, 컨텍스트 관리, 마지막으로 GIL 까지. Python 비동기 코드를 왜 그렇게 쓰는지 이해하는 학습 경로."
level: intermediate
duration: "약 3-4시간"
tags: [python, asyncio, concurrency, gil]
updated: 2026-07-04
chapters:
  - collection: wiki
    id: python/py-asyncio
    note: "asyncio 의 이벤트 루프와 코루틴"
  - collection: wiki
    id: python/py-async-generator
    note: "async for / yield 로 비동기 스트림 만들기"
  - collection: wiki
    id: python/py-concurrent-futures
    note: "ThreadPoolExecutor / ProcessPoolExecutor 로 병렬 처리"
  - collection: wiki
    id: python/py-context-manager
    note: "with 문의 리소스 관리와 async with"
  - collection: wiki
    id: python/py-contextvars
    note: "코루틴별로 컨텍스트를 분리하는 방법"
  - collection: wiki
    id: python/py-gil
    note: "GIL 이 진짜 무엇을 막고 무엇을 허용하는가"
---
