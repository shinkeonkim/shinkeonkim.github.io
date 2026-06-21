---
title: "DTLS"
aliases: ["dtls", "Datagram TLS", "Datagram Transport Layer Security"]
tags: [network, security, protocol, cryptography]
updated: 2026-06-13
references:
  - title: "RFC 9147, DTLS 1.3"
    url: "https://datatracker.ietf.org/doc/html/rfc9147"
  - title: "RFC 6347, DTLS 1.2"
    url: "https://datatracker.ietf.org/doc/html/rfc6347"
  - title: "W3C WebRTC Security"
    url: "https://datatracker.ietf.org/doc/html/rfc8826"
---

## 정의

**DTLS** (Datagram Transport Layer Security)는 [[UDP]] 위에서 동작하는 [[TLS]] 의 변형. 데이터그램 (UDP 패킷) 기반 통신에 보안을 제공한다.

[[QUIC]] 와 WebRTC DataChannel 등이 사용한다. TLS 와 거의 같은 보안 보장 (서버 인증, 키 교환, 암호화, 무결성)을 제공하지만 UDP 의 특성 (비순서, 손실, 비신뢰)을 다룬다.

## 왜 TLS 가 아닌 DTLS 인가

TLS 는 [[TCP]] 의 "순서 보장된 신뢰성 있는 stream" 위에서 설계되었다.

- TLS 핸드셰이크 메시지는 정확한 순서로 수신될 것을 가정
- TLS record 의 sequence number 는 암묵적 (보내지 않음, TCP 가 순서 보장)

UDP 환경에서는 이런 가정이 깨진다.

- 패킷 순서가 바뀜
- 패킷이 손실됨
- 패킷이 중복됨

DTLS 는 이를 다루기 위해:

| TLS | DTLS |
|:---|:---|
| 핸드셰이크 순서 가정 | 핸드셰이크 메시지 번호화 + 재전송 |
| sequence number 암묵 | sequence number 명시적 (record 헤더에 포함) |
| 손실 가정 안 함 | record 손실/중복 허용 |
| record fragmentation X | record fragmentation 지원 (MTU 대응) |

## 버전

| 버전 | 출시 | 기반 TLS |
|:---|:---:|:---|
| DTLS 1.0 | 2006 | TLS 1.1 |
| DTLS 1.2 | 2012 | TLS 1.2 |
| **DTLS 1.3** | **2022** ([RFC 9147](https://datatracker.ietf.org/doc/html/rfc9147)) | TLS 1.3 |

DTLS 1.3 은 TLS 1.3 의 1-RTT / 0-RTT 핸드셰이크 개선을 그대로 가져왔다.

## 사용처

### 1. WebRTC DataChannel

브라우저 간 P2P 데이터 채널은 모두 DTLS 로 암호화된다. 시그널링으로 키 교환 fingerprint 를 미리 합의 → DTLS 핸드셰이크로 키 확립 → SCTP 데이터 송수신.

### 2. [[QUIC]] (간접적)

QUIC 은 TLS 1.3 핸드셰이크를 직접 통합 (DTLS 가 아닌). 그러나 비슷한 "UDP 위 보안" 문제를 같은 방식으로 해결한다.

### 3. VPN / IoT

OpenVPN UDP 모드, CoAP (IoT 프로토콜) 등이 DTLS 사용.

### 4. 미디어 (SRTP-DTLS)

WebRTC 의 미디어 채널은 SRTP 로 암호화되지만, SRTP 의 키는 DTLS 핸드셰이크로 합의한다 (DTLS-SRTP).

## DTLS 의 한계

- **재전송 비용**: 핸드셰이크 패킷 손실 시 재전송 → 초기 연결이 TCP+TLS 보다 느릴 수 있음
- **MTU 의존**: UDP 패킷이 MTU 를 넘으면 IP fragmentation → 큰 핸드셰이크 record 는 분할 필요
- **DoS 공격 노출**: UDP 는 spoofing 이 쉬워 핸드셰이크 시 cookie 메커니즘으로 보호 (HelloVerifyRequest)
