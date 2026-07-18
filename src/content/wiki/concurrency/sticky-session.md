---
title: "Sticky Session"
aliases: ["sticky session", "session affinity", "session persistence", "스티키 세션", "세션 어피니티", "sticky routing"]
tags: [network, load-balancing, architecture, session, stateful]
category: concurrency
updated: 2026-07-14
references:
  - title: "AWS, Sticky sessions for your Application Load Balancer"
    url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/sticky-sessions.html"
  - title: "Nginx, Session persistence"
    url: "http://nginx.org/en/docs/http/ngx_http_upstream_module.html#sticky"
  - title: "Socket.IO, Using multiple nodes"
    url: "https://socket.io/docs/v4/using-multiple-nodes/"
  - title: "Kubernetes, Service sessionAffinity"
    url: "https://kubernetes.io/docs/reference/networking/virtual-ips/#session-affinity"
---

## 정의

**Sticky Session** (= Session Affinity)은 로드밸런서가 **같은 클라이언트의 요청을 항상 같은 백엔드 서버로 라우팅**하도록 하는 동작이다.

[[Stateful]] 서버, 즉 세션 상태를 메모리에 들고 있는 WebSocket 서버, 인메모리 세션 store를 쓰는 HTTP 서버 등이 수평 확장될 때 필수적이다.

## 왜 필요한가

[[Stateless]] 서버는 어느 서버가 처리해도 결과가 같으므로 round-robin으로 분산하면 끝. 하지만 [[Stateful]] 서버는 다르다.

```
Client X가 Server A에 로그인 → A의 메모리에 세션 저장
Client X의 다음 요청 → Server B로 라우팅 → B는 세션 모름 → 인증 실패
```

이를 막으려면 X의 모든 요청을 A로 보내야 한다 = sticky session.

## 아키텍처 시각화

```mermaid
flowchart LR
    C1["Client A<br/>(cookie: srv=A)"] -->|"sticky → Server A"| LB[Load Balancer]
    C2["Client B<br/>(cookie: srv=B)"] -->|"sticky → Server B"| LB
    C3["Client C<br/>(새 요청, 쿠키 없음)"] -->|"round-robin"| LB
    LB -->|"Session A 있음"| SA["Server A<br/>session: A"]
    LB -->|"Session B 있음"| SB["Server B<br/>session: B"]
    LB -->|"신규 배정"| SC["Server C"]
```

## 구현 방법

### 1. Cookie 기반

로드밸런서가 응답에 쿠키를 심고, 다음 요청의 쿠키 값으로 라우팅 결정.

```
Server A가 응답 → LB가 Set-Cookie: LB_ROUTE=server-a 추가
Client 다음 요청 → Cookie: LB_ROUTE=server-a → LB가 A로 라우팅
```

AWS ALB의 stickiness 옵션, Nginx의 `sticky cookie` 등이 이 방식.

- **장점**: IP 변경에도 세션 유지 (모바일 유리)
- **단점**: 클라이언트가 쿠키를 지우면 세션 끊김, HTTPS가 아니면 탈취 가능

### 2. IP Hash 기반

`hash(client_ip) % N`으로 서버 선택. 같은 IP는 같은 서버로.

- **장점**: 쿠키 불필요
- **단점**: 모바일 환경에서 IP가 자주 바뀜, 회사 NAT 뒤 사용자 다수가 한 서버로 몰림

### 3. URL/Header 기반

JWT의 일부, 사용자 ID, 세션 ID 등을 해시해 라우팅.

```nginx
upstream backend {
    hash $http_x_user_id consistent;
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
    server 10.0.0.3:8080;
}
```

## 로드밸런서별 설정

### AWS ALB

ALB는 두 종류의 stickiness를 지원한다:

```
1. Load balancer generated cookie (AWSALB)
   - ALB가 자동으로 쿠키 생성
   - 기간: 1초 ~ 7일 설정 가능

2. Application-based cookie (AWSALBAPP)
   - 앱이 직접 쿠키 발급
   - 쿠키 이름 직접 지정
```

```json
{
  "Type": "forward",
  "TargetGroupArn": "...",
  "ForwardConfig": {
    "TargetGroupStickinessConfig": {
      "Enabled": true,
      "DurationSeconds": 86400
    }
  }
}
```

### Nginx (upstream sticky)

```nginx
upstream app {
    sticky cookie srv_id expires=1h path=/;
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
}
```

### HAProxy

```haproxy
backend app
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server s1 10.0.0.1:8080 check cookie s1
    server s2 10.0.0.2:8080 check cookie s2
```

### Kubernetes Service sessionAffinity

K8s Service 오브젝트에서 클라이언트 IP 기반 affinity를 설정:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800   # 3시간
  ports:
    - port: 80
      targetPort: 8080
```

> [!IMPORTANT]
> K8s의 `sessionAffinity: ClientIP`는 kube-proxy (iptables/ipvs) 레벨에서 작동한다. Ingress를 통하면 ingress controller가 별도로 cookie 기반 sticky를 처리해야 한다. Nginx Ingress Controller에서는 `nginx.ingress.kubernetes.io/affinity: "cookie"` annotation 사용.

## 세션 수명 주기 시퀀스

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant LB as LoadBalancer
    participant SA as ServerA
    participant SB as ServerB

    C->>LB: GET /login, no cookie
    LB->>SA: 신규 배정, round-robin
    SA->>SA: 세션 생성, sess_id=abc
    SA-->>LB: 200 OK, Set-Cookie sess_id=abc
    LB-->>C: 200 OK, Set-Cookie AWSALB=hash_A + sess_id=abc

    C->>LB: POST /order, Cookie AWSALB=hash_A
    LB->>SA: AWSALB 쿠키로 A로 라우팅
    SA->>SA: 세션 조회 OK, 주문 처리
    SA-->>LB: 200 OK

    Note over SA: Server A 장애 발생
    C->>LB: GET /cart, Cookie AWSALB=hash_A
    LB->>SB: A 다운, B로 재배정
    SB->>SB: sess_id=abc 없음, 세션 소실
    SB-->>C: 302 /login, 재로그인 필요
```

## Sticky Session의 함정

### 1. 부하 불균형

특정 사용자/세션이 매우 무거우면 그 서버만 과부하. Round-robin의 균형 분산 효과가 사라진다.

```mermaid
flowchart LR
    Heavy["Heavy User<br/>(동영상 업로드 중)"] -->|sticky| SA["Server A<br/>CPU 95%"]
    Light1["Light User"] -->|sticky| SB["Server B<br/>CPU 10%"]
    Light2["Light User"] -->|sticky| SC["Server C<br/>CPU 10%"]
```

### 2. 서버 장애 시 세션 손실

A가 죽으면 A에 붙어있던 모든 클라이언트의 세션이 사라진다. 재로그인 / 재연결 필요.

### 3. 확장 시 재분배 필요

서버를 1개 추가하면 일부 사용자의 라우팅 키가 바뀌어야 함. consistent hashing 등으로 완화 가능.

### 4. 운영 복잡도 증가

배포/롤링 업데이트 시 활성 세션을 안전하게 다른 서버로 옮기는 절차 필요. Blue-green 배포 시 세션 드레이닝이 필수.

> [!WARNING]
> ALB의 `deregistration_delay` (기본 300초) 동안 기존 연결이 서서히 다른 서버로 이전된다. 이 시간 내에 서버가 강제 종료되면 세션이 그냥 끊긴다. 충분한 draining 시간을 설정하거나 외부 store로 전환하는 것이 안전하다.

## 대안: Sticky를 피하는 방법

### 1. 외부 세션 store

세션 데이터를 Redis, Memcached, DynamoDB 등에 보관. 모든 서버가 같은 데이터에 접근 가능 → [[Stateless]] 서버처럼 동작.

```
Client → 아무 서버 → Redis에서 세션 조회 → 처리
```

```python
# Flask + Redis session
from flask_session import Session
import redis

app.config["SESSION_TYPE"] = "redis"
app.config["SESSION_REDIS"] = redis.from_url("redis://redis:6379")
Session(app)
```

**비용**: 매 요청마다 store I/O (보통 1-3 ms 추가)

### 2. JWT (클라이언트 측 세션)

세션 정보를 토큰에 담아 클라이언트가 들고 다님. 서버는 토큰만 검증.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

- **장점**: 완벽한 stateless, 서버 수평 확장 자유
- **단점**: 토큰 만료/취소가 어려움 (revocation list 필요), 토큰이 커짐

### 3. Pub/Sub Bus (WebSocket 등 지속 연결)

각 서버가 자기 클라이언트만 관리하되, 서버 간 메시지는 Redis Pub/Sub으로 라우팅.

```
Socket.IO + Redis adapter 패턴:
  Client A → Server 1
  Client B → Server 2 (다른 서버)
  Server 1이 "A → B에게 메시지" 처리 시:
    1. Redis publish "msg-to-B"
    2. Server 2가 subscribe → B에게 전달
```

## 대안 비교 매트릭스

| 방식 | stateless | 장애 내성 | 복잡도 | 비용 |
|:---|:---:|:---:|:---:|:---:|
| Sticky session | X | 낮음 | 낮음 | 낮음 |
| 외부 세션 store | O | 높음 | 중간 | Redis 비용 |
| JWT | O | 높음 | 중간 | 없음 |
| Pub/Sub bus | O (WebSocket) | 높음 | 높음 | Redis 비용 |

## 실무 권고

| 시나리오 | 권장 |
|:---|:---|
| Stateless REST API | Sticky 불필요 |
| 인메모리 세션 + 단일 서버 | 처음엔 sticky, 곧 외부 store로 마이그레이션 |
| WebSocket / SSE | 외부 store + Pub/Sub bus 패턴 권장 |
| 단기 캠페인 / 트래픽 작음 | Sticky session으로 빠르게 시작 OK |
| K8s 롤링 배포 빈번 | 외부 store 필수 (Pod 재시작마다 세션 소실) |
| 게임 서버 | 지속 연결 특성상 sticky 불가피, 장애 시 재접속 설계 |

> [!IMPORTANT]
> Sticky session은 "**필요악**"이다. 가능하면 외부 store나 JWT로 [[Stateless]]화 하는 게 장기적으로 더 단순하다. 다만 WebSocket처럼 지속 연결이 본질적인 경우엔 피할 수 없으므로 Pub/Sub 같은 다른 추상화로 대처한다.

## 관련 위키

- [[Stateful]]
- [[Stateless]]
- [[backpressure]] (WebSocket 연결 수 관리)
- [[circuit-breaker]] (서버 장애 감지)
- [[rate-limiting]] (연결당 제한)
