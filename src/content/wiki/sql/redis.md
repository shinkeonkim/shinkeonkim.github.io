---
title: "Redis"
aliases: ["레디스", "redis"]
tags: [database, in-memory, key-value, nosql, cache]
category: sql
updated: 2026-06-15
references:
  - id: redis-docs
    note: "Redis 공식 문서"
  - title: "Antirez (Salvatore Sanfilippo) 블로그"
    url: "http://antirez.com/"
  - title: "Redis in Action (Josiah Carlson)"
    url: "https://redislabs.com/ebook/redis-in-action/"
  - id: redis-docs
    note: "Redis 명령어 레퍼런스"
---

## 정의

**Redis** (REmote DIctionary Server)는 인메모리 키-값 저장소이다. Salvatore Sanfilippo가 2009년 만들었고, 현재는 Redis Ltd. 가 개발을 주도한다. BSD 라이선스 (7.4부터는 RSALv2/SSPLv1 듀얼).

메모리에 데이터를 올려 microsecond 단위 응답 속도를 제공한다. 캐시, 세션 저장소, 메시지 브로커, 리더보드 등에 쓰인다.

## 핵심 특성

- **Single-threaded event loop**: 명령 처리는 단일 스레드, I/O multiplexing (epoll/kqueue)으로 동시 처리
- **영속성 옵션**: RDB snapshot 또는 AOF (append-only file) 로 디스크 백업 가능
- **복제(Replication)**: master-replica 구조, 비동기 복제
- **Pub/Sub**: [[pubsub-bus]] 메시지 브로커 기능
- **트랜잭션**: MULTI/EXEC로 명령 묶기, ACID는 아님 (격리 수준 낮음)

## 데이터 타입

| 타입 | 설명 | 주요 사용처 |
|:---|:---|:---|
| **String** | 바이너리 안전 문자열, 최대 512MB | 캐시, counter (INCR/DECR) |
| **List** | 연결 리스트, 양끝 삽입/삭제 O(1) | 큐, 최근 항목 목록 |
| **Hash** | field-value 맵 | 객체 저장 (user:1 → {name, email}) |
| **Set** | 중복 없는 문자열 집합 | 태그, 멤버십, 집합 연산 |
| **Sorted Set** | 스코어로 정렬된 집합 | 리더보드, 타임라인 |
| **Stream** | append-only 로그, consumer group | 이벤트 소싱, 메시지 큐 |
| **HyperLogLog** | 확률적 카디널리티 추정 | unique visitor 카운팅 (메모리 절약) |
| **Geo** | 경도/위도 좌표, 반경 검색 | 위치 기반 서비스 |
| **Bitmap** | 비트 배열 (String 기반) | 출석 체크, feature flag |

## 영속성 (Persistence)

| 방식 | 동작 | 장점 | 단점 |
|:---|:---|:---|:---|
| **RDB** | 주기적 snapshot (SAVE/BGSAVE) | 파일 작음, 복구 빠름 | 마지막 snapshot 이후 데이터 손실 가능 |
| **AOF** | 모든 쓰기 명령 로그 | 손실 최소화 (fsync 정책 따라) | 파일 큼, 복구 느림 (REWRITE 필요) |

혼용 가능 (RDB + AOF). fsync 정책: `always` (느리지만 안전) / `everysec` (기본, 최대 1초 손실) / `no` (OS 관리).

## 복제·고가용성

- **Master-Replica**: 비동기 복제, replica는 읽기 전용
- **Sentinel**: 자동 failover, 모니터링, 알림
- **Cluster**: 수평 확장, 16384 슬롯 hash partitioning, 노드 장애 시 자동 failover

Cluster는 단일 명령이 여러 슬롯에 걸치면 실행 불가 (hash tag `{user:1}` 로 회피 가능).

## 캐싱 패턴

```anim:redis-cache-hit
{}
```

```anim:redis-cache-miss
{}
```

| 패턴 | 설명 | 장단점 |
|:---|:---|:---|
| **Cache-aside** (Look-aside) | 앱이 읽기 전 캐시 확인 → miss면 DB 읽고 캐시 갱신 | 가장 흔함, 캐시/DB 불일치 가능 |
| **Write-through** | 쓰기마다 캐시+DB 동시 갱신 | 일관성 높음, 쓰기 느림 |
| **Write-behind** (Write-back) | 캐시 먼저 쓰고 비동기로 DB 반영 | 쓰기 빠름, 장애 시 손실 위험 |

TTL (Time-To-Live) + Eviction policy (메모리 부족 시):

- `noeviction`: 쓰기 거부
- `allkeys-lru`, `allkeys-lfu`: 전체 키 중 LRU/LFU 제거
- `volatile-lru`, `volatile-lfu`: TTL 있는 키만 대상
- `allkeys-random`, `volatile-random`: 무작위 제거

## 주요 사용처

- **캐시**: DB 쿼리 결과, API 응답, 세션 데이터
- **Session Store**: 분산 환경에서 사용자 세션 공유
- **Rate Limiting**: INCR + EXPIRE로 요청 수 제한
- **Leaderboard**: Sorted Set으로 랭킹 실시간 갱신
- **Pub/Sub Bus**: 실시간 알림, 채팅 메시지 브로커
- **Queue**: List (LPUSH/RPOP) 또는 Stream + consumer group
- **분산 락**: SETNX + EXPIRE (Redlock 알고리즘)

## 약점·주의점

- **메모리 비용**: 모든 데이터가 RAM에, 큰 데이터셋은 비쌈
- **Single-thread 제약**: 무거운 연산 (KEYS *, SMEMBERS 큰 Set) 은 전체 차단
- **Key 단위 Atomicity**: 여러 키 걸친 트랜잭션은 롤백 불가 (MULTI/EXEC는 isolation 약함)
- **데이터 일관성**: 비동기 복제라 failover 시 일부 쓰기 손실 가능
- **네트워크 비용**: 클라이언트-서버 왕복, 파이프라이닝으로 완화
