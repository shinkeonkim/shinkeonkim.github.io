---
title: "Head-of-Line Blocking"
aliases: ["HOL Blocking", "HOLB", "헤드 오브 라인 블로킹", "Head of Line Blocking"]
tags: [network, http, protocol, performance]
updated: 2026-06-13
references:
  - title: "RFC 9000, QUIC: Stream Multiplexing"
    url: "https://datatracker.ietf.org/doc/html/rfc9000#section-2"
  - title: "Salesforce, The Full Picture on HTTP/2 and HOL Blocking"
    url: "https://engineering.salesforce.com/the-full-picture-on-http-2-and-hol-blocking-7f964b34d205/"
---

## 정의

**Head-of-Line Blocking (HOLB)** 은 처리 순서가 정해진 큐에서 **맨 앞 항목의 지연이 그 뒤 항목 전체의 지연으로 전파되는 현상**이다.

네트워크 프로토콜에서는 여러 층에서 발생할 수 있다.

## HTTP/1.1 의 HOL Blocking

한 TCP 연결로 여러 요청을 순차 처리 (pipelining 사용해도), 첫 요청의 응답이 느리면 그 뒤 요청들도 모두 대기.

```
Request 1 →  (서버에서 5초 처리 중)
Request 2 →  (대기)
Request 3 →  (대기)
              ...
Response 1 ←
Response 2 ←  ← 5초 뒤에야 처리 시작
Response 3 ←
```

브라우저가 도메인당 6개 TCP 연결을 만드는 이유의 일부.

## HTTP/2 가 해결한 것

HTTP/2의 multiplexing은 **HTTP 레벨의 HOL Blocking**을 해결한다. 한 TCP 연결에서 stream ID로 구분된 frame을 인터리브해 송수신.

그러나 **TCP 레벨의 HOL Blocking**은 여전히 남는다. 한 TCP 패킷이 손실되면, 그 패킷이 어느 stream에 속하든 TCP는 순서를 유지하기 위해 모든 stream의 후속 패킷을 대기시킨다.

## [[QUIC]] 가 해결한 것

QUIC은 stream 격리를 본격적으로 구현한다. UDP 위에서 각 stream이 자기 sequence number와 ACK을 따로 관리. 한 stream의 패킷 손실은 다른 stream에 영향 없음.

→ HTTP/3 (QUIC 위에서 동작)이 TCP의 HOL Blocking을 근본적으로 해결.

## 다른 사례

HOL Blocking은 네트워크 외 일반 큐 처리 시스템에서도 발생한다.

- 데이터베이스의 단일 큐 워커
- 메시지 브로커의 partition 단위 순차 처리
- 멀티스레드 작업에서 ordered 처리

해결책은 보통: **독립 처리 단위로 분할** (sharding, partitioning, stream 격리).
