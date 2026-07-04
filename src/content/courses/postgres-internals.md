---
title: "PostgreSQL 내부 원리: 인덱스, MVCC, WAL"
description: "PostgreSQL 이 왜 그렇게 동작하는지, B-Tree 인덱스부터 MVCC 스냅샷과 WAL 까지 내부 자료구조 관점에서 파고드는 학습 경로."
level: advanced
duration: "약 4-5시간"
tags: [postgresql, database, mvcc, wal, index]
updated: 2026-07-04
chapters:
  - collection: wiki
    id: database-internals/postgresql
    note: "출발점: PostgreSQL 아키텍처 전체 조감"
  - collection: wiki
    id: database-internals/b-tree-internals
    note: "B-Tree 자체의 내부 구조"
  - collection: wiki
    id: database-internals/btree-indexing
    note: "B-Tree 를 인덱스로 활용할 때의 실전 규칙"
  - collection: wiki
    id: database-internals/mvcc
    note: "MVCC 스냅샷 격리의 핵심 아이디어"
  - collection: wiki
    id: database-internals/transaction-isolation-levels
    note: "격리 수준별로 무엇이 다른가"
  - collection: wiki
    id: database-internals/wal-write-ahead-log
    note: "WAL 이 지속성과 복구를 어떻게 보장하나"
---
