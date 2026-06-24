---
title: "TCP"
aliases: ["Transmission Control Protocol", "tcp"]
tags: [network, protocol, transport-layer]
category: network
updated: 2026-06-13
references:
  - title: "RFC 9293, TCP"
    url: "https://datatracker.ietf.org/doc/html/rfc9293"
  - title: "The TCP/IP Guide, TCP"
    url: "http://www.tcpipguide.com/free/t_TCPIPTransmissionControlProtocolTCP.htm"
---

## 정의

**TCP** (Transmission Control Protocol)는 신뢰성 있는 연결 지향 전송 계층 프로토콜이다. [RFC 9293](https://datatracker.ietf.org/doc/html/rfc9293) 으로 정의되어 있다. HTTP/1.1·2, SMTP, SSH, FTP 등 인터넷의 대부분의 응용 프로토콜이 TCP 위에서 동작한다.

[[UDP]] 와 대비된다, UDP 가 "보내고 잊는" 방식이라면 TCP 는 "확실히 도착한 순서대로 전달".

## 핵심 특성

- **연결 지향(Connection-oriented)**: 통신 전에 3-way handshake 로 연결 확립
- **순서 보장(In-order delivery)**: 패킷에 sequence number 부여, 수신측에서 재정렬
- **신뢰성(Reliable)**: ACK 미수신 시 재전송, 손실 자동 복구
- **흐름 제어(Flow Control)**: receiver window 로 수신측 처리 속도 맞춤
- **혼잡 제어(Congestion Control)**: 네트워크 혼잡 시 송신 속도 조절 (TCP Reno, Cubic, BBR 등)

## 3-way Handshake (연결 수립)

```anim:tcp-handshake
{}
```

1 RTT 소요. [[TLS]] 까지 추가하면 보통 2-3 RTT.

```
Client                          Server
   │── SYN  (seq=x)  ────────────→ │
   │ ←──── SYN-ACK (seq=y, ack=x+1) ─── │
   │── ACK (ack=y+1) ────────────→ │
   ←── 데이터 송수신 가능 ──→
```

## 4-way Handshake (연결 종료)

```anim:tcp-fin-handshake
{}
```

각 방향 (C→S, S→C)을 독립적으로 종료하므로 4단계가 필요. Client 는 마지막에 TIME_WAIT 상태로 2×MSL 동안 대기, 지연 패킷이 새 연결을 오염시키지 않게 하기 위함.

## TCP 의 한계

| 문제 | 설명 | 해결 시도 |
|:---|:---|:---|
| 연결 비용 | 매번 3-way handshake | HTTP keep-alive |
| [[Head-of-Line Blocking]] | 한 패킷 손실이 같은 연결의 모든 stream 영향 | HTTP/2 가 부분 해결, [[QUIC]] 가 완전 해결 |
| 연결 변경 시 끊김 | IP/Port 바뀌면 새 연결 | [[QUIC]] Connection Migration |
| 커널 종속 | OS 업데이트 없이는 개선 불가 | [[QUIC]] 사용자 영역 구현 |

## 사용처

- HTTP/1.1, HTTP/2 (HTTPS 포함)
- WebSocket (HTTP Upgrade 후 TCP 그대로 사용)
- SSH, SMTP, FTP
- Database 프로토콜 대부분 (PostgreSQL, MySQL wire protocol)
