---
title: "분산 시스템 실전 패턴: 동기/비동기와 안정성"
description: "동기 vs 비동기, 블로킹 vs 논블로킹의 기본 개념부터 백프레셔, 서킷 브레이커, 레이트 리미팅, 지수 백오프 재시도까지. 분산 시스템에서 반드시 필요한 안정성 패턴을 순차적으로 학습."
level: intermediate
duration: "약 4시간"
tags: [distributed-systems, concurrency, patterns, resilience]
updated: 2026-07-04
chapters:
  - collection: wiki
    id: concurrency/synchronous
    note: "동기 처리의 의미와 언제 쓰는가"
  - collection: wiki
    id: concurrency/asynchronous
    note: "비동기 처리와 콜백 / 이벤트 기반"
  - collection: wiki
    id: concurrency/blocking
    note: "블로킹 I/O 의 실체와 스레드 낭비"
  - collection: wiki
    id: concurrency/non-blocking
    note: "논블로킹 I/O 와 이벤트 루프 기반 서버"
  - collection: wiki
    id: concurrency/backpressure
    note: "생산자가 소비자보다 빠를 때: 백프레셔 전략"
  - collection: wiki
    id: concurrency/circuit-breaker
    note: "장애 전파 차단: 서킷 브레이커 상태 머신"
  - collection: wiki
    id: concurrency/rate-limiting
    note: "요청량 제한: 토큰 버킷 vs 리키 버킷"
  - collection: wiki
    id: concurrency/retry-with-backoff
    note: "재시도 시 반드시 필요한 지수 백오프와 지터"
---
