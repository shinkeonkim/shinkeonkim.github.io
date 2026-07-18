---
title: "HPACK"
aliases: ["HPACK 헤더 압축", "hpack", "HTTP/2 헤더 압축", "HTTP header compression"]
tags: [network, http, http2, compression, security]
category: network
updated: 2026-07-16
references:
  - title: "RFC 7541, HPACK: Header Compression for HTTP/2"
    url: "https://datatracker.ietf.org/doc/html/rfc7541"
  - title: "RFC 9204, QPACK: Field Compression for HTTP/3"
    url: "https://datatracker.ietf.org/doc/html/rfc9204"
  - title: "RFC 9114, HTTP/3"
    url: "https://datatracker.ietf.org/doc/html/rfc9114"
---

## 정의

**HPACK** ([RFC 7541](https://datatracker.ietf.org/doc/html/rfc7541))은 [[http-2|HTTP/2]]에서 요청/응답 헤더를 압축하는 방식이다.

[[http-1-1|HTTP/1.1]]에서 헤더는 매 요청마다 평문 텍스트로 반복 전송되었다. 한 페이지 로드에 수십 건의 요청이 발생하면 헤더만으로 수십 KB가 낭비된다. HPACK은 **정적 테이블 + 동적 테이블 + Huffman 인코딩** 세 가지를 조합해 헤더 중복을 제거한다.

## 문제 상황: HTTP/1.1 헤더의 낭비

```
GET /api/users HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
Accept: application/json
Accept-Language: ko-KR,ko;q=0.9
Accept-Encoding: gzip, deflate, br
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: session_id=abc123; _ga=GA1.2.xxx
```

동일한 호스트에 50개 병렬 요청을 보내면, 위 헤더가 50번 그대로 반복된다. `Authorization`, `Cookie`처럼 큰 헤더가 매번 전송되어 모바일처럼 대역폭이 제한된 환경에서 특히 비효율적이다.

## 압축 원리

### Static Table (정적 테이블)

자주 쓰이는 헤더 이름/값 조합 61개를 사전 정의한 고정 인덱스.

```
Index | Header Name          | Header Value
------+----------------------+-------------------
1     | :authority           |
2     | :method              | GET
3     | :method              | POST
4     | :path                | /
5     | :path                | /index.html
6     | :scheme              | http
7     | :scheme              | https
8     | :status              | 200
...
61    | www-authenticate     |
```

`:method GET` 이 필요하면 인덱스 `2` 한 바이트만 전송하면 된다.

### Dynamic Table (동적 테이블)

연결 단위로 양쪽(클라이언트/서버)이 공유하는 헤더 캐시.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    Note over C,S: 첫 번째 요청
    C->>S: "Authorization: Bearer TOKEN123" (리터럴로 전송 + 동적 테이블 인덱스 62 등록)
    S-->>C: 200 OK

    Note over C,S: 두 번째 요청
    C->>S: 인덱스 62 (1 바이트) - 동일 헤더
    S-->>C: 200 OK
```

동적 테이블은 **FIFO 큐**로 구성된다. 오래된 항목은 새 항목이 추가될 때 밀려나며, 테이블 최대 크기는 `SETTINGS_HEADER_TABLE_SIZE` 프레임으로 협상한다 (기본값 4096 bytes).

### Huffman 인코딩

문자열로 전송해야 하는 헤더 값을 Huffman 코드로 추가 압축한다. HTTP 트래픽에서 자주 등장하는 문자에 짧은 코드를 배정해 ASCII 대비 약 30% 추가 절약을 달성한다.

```
'e' (0x65) → ASCII 8bit, Huffman 4bit (0b0000)
'a' (0x61) → ASCII 8bit, Huffman 5bit (0b00001)
'q' (0x71) → ASCII 8bit, Huffman 8bit (0b11101000)
```

## 인코딩 플로우

```mermaid
flowchart TD
    H["헤더 필드\n(name: value)"]
    Q1{"Static Table에\n존재하는가?"}
    Q2{"Dynamic Table에\n존재하는가?"}
    I1["인덱스 하나만 전송\n(1-2 바이트)"]
    I2["Dynamic Table 인덱스\n전송 (1-2 바이트)"]
    Q3{"Dynamic Table에\n추가할까?"}
    L1["리터럴 + 동적 등록\n(Huffman 압축 후)"]
    L2["리터럴만 전송\n(인덱싱 안 함)"]

    H --> Q1
    Q1 -->|"Yes"| I1
    Q1 -->|"No"| Q2
    Q2 -->|"Yes"| I2
    Q2 -->|"No"| Q3
    Q3 -->|"Yes"| L1
    Q3 -->|"No"| L2
```

헤더 값이 자주 바뀌는 경우 (예: `Date`, `Content-Length`) 는 동적 테이블 등록을 건너뛰어 테이블 공간 낭비를 방지한다. `Cache-Control: no-cache`처럼 민감 정보가 포함된 헤더는 `Never Indexed` 플래그로 중간 프록시의 캐시 저장을 금지할 수 있다.

## 압축 효과

| 시나리오 | HTTP/1.1 | HTTP/2 + HPACK |
|:---|:---|:---|
| 페이지 로드 50개 요청 (각 ~700 B) | ~35 KB 헤더 | ~3-5 KB |
| 모바일 네트워크 Slow Start 구간 | 큰 영향 | 작은 영향 |
| 동일 호스트 반복 API 호출 | 매번 전체 전송 | 첫 번째 이후 수 바이트 |

[[http-2|HTTP/2]]의 멀티플렉싱과 함께 HPACK은 HTTP/2의 두 번째 큰 성능 이득원이다.

## 보안 이슈: CRIME / HPACK Bomb

### CRIME 공격

**CRIME** (Compression Ratio Info-leak Made Easy)은 TLS 압축 + HTTP 응답 압축을 함께 쓸 때 발생하는 사이드 채널 공격이다.

공격자가 임의 문자열을 요청에 주입할 수 있는 상황에서, 압축된 패킷 크기 변화를 관찰하여 헤더 값(쿠키, 세션 토큰 등)을 추측한다.

```
압축 전: "Cookie: secret=a..." → 크기 100
     +  "secret=a"          → 압축 시 중복 제거, 크기 95 (추측 성공)
          
압축 전: "Cookie: secret=a..." → 크기 100
     +  "secret=b"          → 다른 문자열, 중복 없음, 크기 102 (추측 실패)
```

HPACK은 이를 완전히 해결하지는 않는다. 공격자가 동일 HTTP/2 연결에서 요청을 보낼 수 있다면 동적 테이블 크기 변화를 관찰하는 비슷한 공격이 이론적으로 가능하다. RFC 7541 §7 보안 고려사항 참조.

> [!WARNING]
> **Never Indexed 플래그**: `Authorization`, `Cookie` 같은 민감 헤더는 `Literal Header Field Never Indexed` 표현을 사용해 중간 노드(프록시)의 인덱싱을 막아야 한다. HTTP/2 라이브러리 대부분이 이를 자동 처리하지만, 커스텀 구현 시 반드시 확인.

### HPACK Bomb

동적 테이블에 최대 크기(4 KB)까지 헤더를 채운 뒤, 그 모든 항목을 인덱스 참조로만 이루어진 헤더 블록을 수십만 개 전송한다. 수신측은 작은 바이트를 수백 MB 메모리로 팽창시키며 디코딩해야 한다.

```
# 공격자 전송: 9 바이트 헤더 블록
# 수신측 메모리 요구: 수 MB

- 동적 테이블 가득 채움 (4 KB)
- 참조만 있는 헤더 블록 10만 개 전송 → 테이블 전체 팽창 반복
```

> [!CAUTION]
> 서버 구현 시 `SETTINGS_MAX_HEADER_LIST_SIZE`와 최대 헤더 블록 크기를 반드시 제한해야 한다. HTTP/2 라이브러리의 기본 설정을 확인하고 적절한 상한을 설정할 것.

## QPACK: HTTP/3에서의 개선

[[quic|QUIC]] 위에서는 HPACK의 **순서 의존성 문제**가 발생한다. HTTP/2는 TCP 위에서 동작해 헤더 블록이 순서대로 도착하지만, HTTP/3의 QUIC은 스트림이 독립적이다.

**문제**: 동적 테이블 업데이트가 스트림 A에서 도착했는데, 스트림 B의 헤더가 그 업데이트를 참조한다면? QUIC에서는 스트림 B가 먼저 도착할 수 있다.

**QPACK 해결책** ([RFC 9204](https://datatracker.ietf.org/doc/html/rfc9204)):

```mermaid
flowchart LR
    E["Encoder\n(클라이언트)"]
    D["Decoder\n(서버)"]
    ES["Encoder Stream\n(단방향, 테이블 업데이트)"]
    DS["Decoder Stream\n(단방향, ACK)"]
    RS["Request Stream\n(각 HTTP 요청)"]

    E -->|"동적 테이블 업데이트"| ES --> D
    D -->|"테이블 업데이트 확인"| DS --> E
    E -->|"헤더 블록 (인덱스 참조)"| RS --> D
```

인코더 스트림과 디코더 스트림이 분리되어 동적 테이블 업데이트가 독립적으로 전달된다. 요청 스트림은 해당 업데이트가 도착했다는 확인을 받은 뒤에만 인덱스를 참조한다.

| 항목 | HPACK | QPACK |
|:---|:---|:---|
| 대상 프로토콜 | HTTP/2 (TCP) | HTTP/3 (QUIC) |
| 동적 테이블 | 단일 스트림 순서 의존 | 독립 인코더/디코더 스트림 |
| 순서 보장 필요 | Yes (TCP가 보장) | No (QUIC 스트림 독립) |
| HOL 블로킹 | TCP 계층에서 처리 | QPACK 레벨 동기화로 해결 |

## 실전 예시

### 헤더 인코딩 직접 관찰 (Python)

```python
# hpack 패키지로 HPACK 인코딩/디코딩 실습
# pip install hpack

import hpack

encoder = hpack.Encoder()
decoder = hpack.Decoder()

headers = [
    (":method", "GET"),
    (":path", "/api/users"),
    (":scheme", "https"),
    (":authority", "example.com"),
    ("authorization", "Bearer my-token"),
    ("accept", "application/json"),
]

# 인코딩
encoded = encoder.encode(headers)
print(f"인코딩 전 헤더 길이: {sum(len(k)+len(v)+2 for k,v in headers)} bytes")
print(f"HPACK 인코딩 후: {len(encoded)} bytes")

# 디코딩
decoded = decoder.decode(encoded)
print(f"디코딩 결과: {decoded}")
```

### nginx에서 HPACK 확인

```bash
# HTTP/2 + HPACK 요청 전송
curl -v --http2 https://example.com/api/users -H "Authorization: Bearer token123"

# 응답 헤더에서 HTTP/2 확인
# < HTTP/2 200
# < content-type: application/json
# < content-length: 512

# Wireshark에서 HTTP/2 헤더 관찰:
# 필터: http2.header.name == "authorization"
```

### 동적 테이블 크기 협상

```python
# Python h2 라이브러리로 SETTINGS 프레임 제어
# pip install h2

import h2.connection
import h2.config

config = h2.config.H2Configuration(client_side=True)
conn = h2.connection.H2Connection(config=config)

# 동적 테이블 최대 크기를 8192 bytes로 설정
conn.initiate_connection()
conn.update_settings({
    h2.settings.SettingCodes.HEADER_TABLE_SIZE: 8192,
    h2.settings.SettingCodes.MAX_HEADER_LIST_SIZE: 65536,
})
```

## 함정

> [!WARNING]
> 1. **동적 테이블은 연결 단위**: 연결이 끊기면 테이블도 초기화된다. HTTP/2 연결 풀링이 끊기는 상황 (재배포, 로드 밸런서 교체 등)에서 첫 몇 개 요청은 압축 효율이 낮다.
> 2. **프록시가 테이블 공유 안 함**: 클라이언트-프록시, 프록시-서버 각각 별개 HPACK 컨텍스트. 프록시를 거치면 클라이언트 테이블이 서버에 전달되지 않는다.
> 3. **헤더 순서가 성능에 영향**: 자주 등장하는 헤더를 먼저 보내면 동적 테이블 효율이 높아진다.
> 4. **HPACK Bomb 방어 필수**: `SETTINGS_MAX_HEADER_LIST_SIZE`로 헤더 목록 최대 크기 제한. 기본값이 없는 구현도 있으므로 명시적 설정 필요.

## 관련 위키

- [[http-2|HTTP/2]] - HPACK이 사용되는 프로토콜
- [[http-3|HTTP/3]] - QPACK을 사용하는 후속 버전
- [[quic|QUIC]] - HTTP/3의 전송 계층
- [[tls|TLS]] - HPACK과 함께 동작하는 암호화 레이어
- [[http-1-1|HTTP/1.1]] - HPACK 도입 이전 버전
