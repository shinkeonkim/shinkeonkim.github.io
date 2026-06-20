---
title: "Sticky Session"
aliases: ["sticky session", "session affinity", "session persistence", "스티키 세션", "세션 어피니티"]
tags: [network, load-balancing, architecture]
updated: 2026-06-13
---

## 정의

**Sticky Session** (= Session Affinity)은 로드밸런서가 **같은 클라이언트의 요청을 항상 같은 백엔드 서버로 라우팅**하도록 하는 동작이다.

[[Stateful]] 서버, 즉 세션 상태를 메모리에 들고 있는 WebSocket 서버, 인메모리 세션 store 를 쓰는 HTTP 서버 등, 가 수평 확장될 때 필수적이다.

## 왜 필요한가

[[Stateless]] 서버는 어느 서버가 처리해도 결과가 같으므로 round-robin 으로 분산하면 끝. 하지만 [[Stateful]] 서버는 다르다.

```
Client X 가 Server A 에 로그인 → A의 메모리에 세션 저장
Client X 의 다음 요청 → Server B 로 라우팅 → B는 세션 모름 → 인증 실패
```

이를 막으려면 X 의 모든 요청을 A 로 보내야 한다 = sticky session.

## 구현 방법

### 1. Cookie 기반

로드밸런서가 응답에 쿠키를 심고, 다음 요청의 쿠키 값으로 라우팅 결정.

```
Server A 가 응답 → LB가 Set-Cookie: LB_ROUTE=server-a 추가
Client 다음 요청 → Cookie: LB_ROUTE=server-a → LB가 A로 라우팅
```

AWS ALB의 stickiness 옵션, Nginx의 `sticky cookie` 등이 이 방식.

### 2. IP Hash 기반

`hash(client_ip) % N` 으로 서버 선택. 같은 IP 는 같은 서버로.

- **장점**: 쿠키 불필요
- **단점**: 모바일 환경에서 IP 가 자주 바뀜, 회사 NAT 뒤 사용자 다수가 한 서버로 몰림

### 3. URL/Header 기반

JWT 의 일부, 사용자 ID, 세션 ID 등을 해시해 라우팅.

## Sticky Session 의 함정

### 1. 부하 불균형

특정 사용자/세션이 매우 무거우면 그 서버만 과부하. Round-robin 의 균형 분산 효과가 사라진다.

### 2. 서버 장애 시 세션 손실

A 가 죽으면 A 에 붙어있던 모든 클라이언트의 세션이 사라진다. 재로그인 / 재연결 필요.

### 3. 확장 시 재분배 필요

서버를 1개 추가하면 일부 사용자의 라우팅 키가 바뀌어야 함. consistent hashing 등으로 완화 가능.

### 4. 운영 복잡도 증가

배포·롤링 업데이트 시 활성 세션을 안전하게 다른 서버로 옮기는 절차 필요.

## 대안, Sticky 를 피하는 방법

### 1. 외부 세션 store

세션 데이터를 Redis, Memcached, DynamoDB 등에 보관. 모든 서버가 같은 데이터에 접근 가능 → [[Stateless]] 서버처럼 동작.

```
Client → 아무 서버 → Redis 에서 세션 조회 → 처리
```

**비용**: 매 요청마다 store I/O (보통 1-3 ms 추가)

### 2. JWT (클라이언트 측 세션)

세션 정보를 토큰에 담아 클라이언트가 들고 다님. 서버는 토큰만 검증.

**장점**: 완벽한 stateless
**단점**: 토큰 만료/취소가 어려움, 토큰이 커짐

### 3. [[Pub/Sub Bus]] (WebSocket 등 지속 연결)

각 서버가 자기 클라이언트만 관리하되, 서버 간 메시지는 Redis Pub/Sub 으로 라우팅.

```
Socket.IO + Redis adapter 패턴:
  Client A → Server 1
  Client B → Server 2 (다른 서버)
  Server 1 이 "A → B 에게 메시지" 처리 시:
    1. Redis publish "msg-to-B"
    2. Server 2 가 subscribe → B 에게 전달
```

## 실무 권고

| 시나리오 | 권장 |
|:---|:---|
| Stateless REST API | Sticky 불필요 |
| 인메모리 세션 + 단일 서버 | 처음엔 sticky, 곧 외부 store 로 마이그레이션 |
| WebSocket / SSE | 외부 store + Pub/Sub bus 패턴 권장 |
| 단기 캠페인 / 트래픽 작음 | Sticky session 으로 빠르게 시작 OK |

> [!IMPORTANT]
> Sticky session 은 "**필요악**"이다. 가능하면 외부 store 나 JWT 로 [[Stateless]] 화 하는 게 장기적으로 더 단순하다. 다만 WebSocket 처럼 지속 연결이 본질적인 경우엔 피할 수 없으므로 Pub/Sub 같은 다른 추상화로 대처한다.

## 참고

- [AWS, Sticky sessions for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/sticky-sessions.html)
- [Nginx, Session persistence](http://nginx.org/en/docs/http/ngx_http_upstream_module.html#sticky)
- [Socket.IO, Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)
