---
title: "QUIC"
aliases: ["QUIC 프로토콜", "quic", "Quick UDP Internet Connections"]
tags: [network, http, protocol]
category: network
updated: 2026-06-13
references:
  - title: "RFC 9000, QUIC"
    url: "https://datatracker.ietf.org/doc/html/rfc9000"
  - title: "RFC 9114, HTTP/3"
    url: "https://datatracker.ietf.org/doc/html/rfc9114"
  - title: "Cloudflare, QUIC 소개"
    url: "https://blog.cloudflare.com/the-road-to-quic/"
---

## 정의

**QUIC** (Quick UDP Internet Connections)은 Google이 2012년 처음 제안하고 2021년 [RFC 9000](https://datatracker.ietf.org/doc/html/rfc9000)으로 표준화된 UDP 기반 전송 프로토콜이다. HTTP/3의 기반이 된다.

기존 TCP가 가지는 문제들을 OS 커널 수정 없이(=사용자 영역에서) 해결하기 위해 UDP 위에 구현되었다.

## 핵심 특성

- **Stream 격리**: 한 연결 안에 여러 독립적인 stream. 한 stream의 패킷 손실이 다른 stream에 영향을 주지 않음 → TCP의 [[Head-of-Line Blocking]] 문제 해결
- **TLS 1.3 통합**: 전송과 암호화 핸드셰이크가 분리되어 있지 않다. 최초 연결도 1-RTT, 재접속은 0-RTT 가능
- **Connection ID**: IP나 포트가 바뀌어도 (와이파이 ↔ 셀룰러 전환) 같은 ID로 같은 연결 유지 (Connection Migration)
- **사용자 영역 구현**: 브라우저·서버가 직접 구현 → OS 업데이트 없이 새 기능 배포 가능

## TCP 대비 장점

| | TCP | QUIC |
|:---|:---|:---|
| 전송 | OS 커널 | 사용자 영역 (라이브러리) |
| HOL Blocking | 있음 | Stream 단위로 격리 |
| 최초 핸드셰이크 | TCP 3-way + TLS = 2-3 RTT | 1 RTT (TLS 통합) |
| 재접속 | 1 RTT | 0 RTT (TLS 1.3 세션 티켓) |
| Connection 식별 | (IP, Port) 튜플 | Connection ID |
| IP 변경 시 | 연결 끊김 | Migration으로 유지 |

## 약점·주의점

- **UDP 차단**: 일부 기업 방화벽은 UDP를 막거나 throttling함 → HTTP/3 ↔ HTTP/2 fallback 필요
- **CPU 부담**: 사용자 영역 구현이라 패킷 처리 CPU 비용이 TCP보다 클 수 있음 (커널 우회 효과는 일부)
- **NAT rebinding**: Connection Migration이 NAT 동작과 충돌할 수 있음

## 사용 사례

- HTTP/3 (Google, Facebook, Cloudflare 등 대형 CDN)
- WebTransport (브라우저 양방향 stream 신 API)
- 일부 게임·실시간 미디어 프로토콜
