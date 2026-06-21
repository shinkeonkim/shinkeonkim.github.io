---
title: "UDP"
aliases: ["User Datagram Protocol", "udp"]
tags: [network, protocol, transport-layer]
updated: 2026-06-13
references:
  - title: "RFC 768, UDP"
    url: "https://datatracker.ietf.org/doc/html/rfc768"
  - id: mdn-web-docs
    note: "MDN, UDP - https://developer.mozilla.org/en-US/docs/Glossary/UDP"
---

## 정의

**UDP** (User Datagram Protocol)는 비연결·비신뢰 전송 계층 프로토콜이다. [RFC 768](https://datatracker.ietf.org/doc/html/rfc768) (1980) 로 정의되었다. [[TCP]] 와 대비된다.

"보내고 잊는다(fire-and-forget)", 송신측은 패킷을 던지고 끝, 받았는지 안 받았는지 확인하지 않는다.

## 핵심 특성

- **비연결(Connectionless)**: 핸드셰이크 없음, 즉시 송신
- **비순서**: 수신 순서 보장 없음
- **비신뢰**: 손실되어도 재전송 없음
- **가벼움**: 헤더 8 bytes (TCP 의 20+ bytes 와 비교)
- **단순함**: 흐름 제어 / 혼잡 제어 없음

## 헤더 구조

```anim:udp-packet-structure
{}
```

UDP 패킷 헤더는 총 **8 bytes** (TCP 의 20+ bytes 와 대비).

| 필드 | 크기 | 설명 |
|:---|:---:|:---|
| Source Port | 2 bytes | 송신측 포트 |
| Destination Port | 2 bytes | 수신측 포트 |
| Length | 2 bytes | 헤더 + 데이터 길이 |
| Checksum | 2 bytes | 무결성 검증 |

## 전송 방식, Fire-and-Forget

```anim:udp-transmission
{}
```

UDP 는 핸드셰이크 없이 즉시 송신한다. ACK 없음, 손실되어도 송신측은 알 수 없다.

## 언제 UDP 를 쓰는가

신뢰성보다 **저지연·저오버헤드**가 더 중요할 때.

- **DNS**: 작은 질의·응답, 응답 안 오면 재시도하면 됨
- **실시간 미디어**: 비디오 통화에서 1 프레임 손실은 재전송할 시간이 없음, 다음 프레임이 더 중요
- **게임**: 위치 업데이트가 1 패킷 잃어도 다음 패킷이 곧 옴
- **DHCP, NTP, SNMP**: 단순한 요청·응답
- **[[QUIC]]** (그리고 HTTP/3): UDP 위에서 신뢰성·순서 보장을 사용자 영역에서 직접 구현

## "UDP 위에 신뢰성을 다시 만든다"는 역설

QUIC, WebRTC SCTP, 게임 엔진의 reliable UDP, 모두 UDP 위에서 TCP 와 유사한 기능을 직접 구현한다. 왜?

- **TCP 의 한계를 우회**: OS 커널 의존, [[Head-of-Line Blocking]], 연결 변경 시 끊김
- **선택적 신뢰성**: 메시지마다 "ordered / unordered, reliable / unreliable" 선택 가능 (SCTP 의 partial reliability)
- **빠른 진화**: 사용자 영역 구현이라 OS 업데이트 없이 개선

UDP 의 "단순함"은 양날의 검, 직접 구현해야 하지만 그만큼 유연하다.
