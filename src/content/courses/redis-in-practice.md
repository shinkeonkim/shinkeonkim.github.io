---
title: "Redis 실전: 자료구조부터 분산 락, 클러스터까지"
description: "Redis 를 왜 쓰는지부터 다섯 가지 핵심 자료구조, 캐시 패턴, 분산 락, 클러스터 구성까지. 프로덕션에서 실제로 필요한 순서로 배우는 학습 경로."
level: intermediate
duration: "약 5-6시간"
tags: [redis, cache, distributed-lock, cluster]
updated: 2026-07-04
chapters:
  - collection: wiki
    id: database-internals/redis
    note: "Redis 개요와 언제 쓰는가"
  - collection: wiki
    id: database-internals/redis-strings
    note: "Strings: 카운터, 세션, 캐시 값"
  - collection: wiki
    id: database-internals/redis-hashes
    note: "Hashes: 객체 필드 단위 관리"
  - collection: wiki
    id: database-internals/redis-lists
    note: "Lists: 큐 / 스택 / 최근 항목"
  - collection: wiki
    id: database-internals/redis-sorted-sets
    note: "Sorted Sets: 랭킹, 시계열, 우선순위"
  - collection: wiki
    id: database-internals/redis-cache-patterns
    note: "cache-aside / write-through / write-behind 패턴 비교"
  - collection: wiki
    id: database-internals/redis-distributed-lock
    note: "SET NX PX 와 Redlock 의 실전 함정"
  - collection: wiki
    id: database-internals/redis-cluster
    note: "16384 슬롯 기반 클러스터의 원리와 리샤딩"
---
