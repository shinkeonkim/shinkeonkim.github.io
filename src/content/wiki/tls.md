---
title: "TLS / SSL"
aliases: ["TLS", "SSL", "Transport Layer Security", "Secure Sockets Layer", "tls", "ssl"]
tags: [network, security, protocol, cryptography]
updated: 2026-06-15
---

## 정의

**TLS** (Transport Layer Security)는 [[TCP]] (또는 [[UDP]] 위 [[QUIC]]) 위에서 동작하는 암호화·인증 프로토콜이다. **SSL** 은 TLS 의 전신 (Netscape 1995, 더 이상 사용되지 않음).

웹의 HTTPS 가 바로 "HTTP + TLS". 인증서 검증, 키 교환, 암호화된 데이터 전송 모두 TLS 가 담당한다.

## 버전 역사

| 버전 | 출시 | 상태 |
|:---|:---:|:---|
| SSL 1.0 | 1994 | 내부 사용, 공개 안 됨 |
| SSL 2.0 | 1995 | 폐기 (취약점 다수) |
| SSL 3.0 | 1996 | 폐기 (POODLE 공격) |
| TLS 1.0 | 1999 | 폐기 (BEAST 공격) |
| TLS 1.1 | 2006 | 폐기 |
| TLS 1.2 | 2008 | 현재도 널리 사용 |
| **TLS 1.3** | **2018** | **권장**, [[QUIC]] 에 통합됨 |

> [!CAUTION]
> "SSL 인증서" 라는 용어는 관습적으로 남아있지만, 실제로 사용되는 건 TLS 다. SSL 1.0~3.0 은 모두 폐기되었다.

## TLS 가 하는 일

1. **서버 인증**: 인증서로 "당신이 정말 example.com 입니까?" 검증
2. **키 교환**: 양측이 공유할 대칭키를 안전하게 생성 (ECDHE 등)
3. **대칭 암호화**: 이후 데이터를 AES-GCM, ChaCha20-Poly1305 등으로 암호화
4. **무결성 검증**: 메시지 변조 감지 (AEAD 알고리즘에 내장)

## 핵심 개념

### 비대칭 vs 대칭 암호의 역할 분리

| | 알고리즘 예 | 사용 시점 | 특성 |
|:---|:---|:---|:---|
| **비대칭 (공개키)** | RSA, ECDSA, ECDHE | 핸드셰이크 단계 | 느림, 인증서 검증·키 교환에만 사용 |
| **대칭** | AES-GCM, ChaCha20 | 응용 데이터 단계 | 빠름, 핸드셰이크에서 합의한 세션 키로 암호화 |

핸드셰이크에서 비대칭으로 안전하게 세션 키를 만들고, 이후 모든 데이터는 빠른 대칭 암호로 처리한다.

### Forward Secrecy

ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) 기반 키 교환은 매 세션마다 새 키를 만든다. 서버의 장기 비밀키가 나중에 유출되어도 과거 세션은 복호화 불가. TLS 1.3 은 이런 ephemeral 키 교환만 허용한다.

### AEAD (Authenticated Encryption with Associated Data)

암호화와 무결성 검증을 한 번에 수행하는 알고리즘. 별도의 MAC 계산 없이 변조 감지 가능. TLS 1.3 은 AEAD 만 허용.

## TLS 1.2 Full Handshake (2-RTT)

```anim:tls-handshake-1-2
{}
```

단계별 흐름:

1. **ClientHello**: 클라이언트가 지원하는 cipher suite 목록 + random 값을 보낸다.
2. **ServerHello + Certificate + ServerKeyExchange + ServerHelloDone**: 서버가 cipher 를 고르고, 인증서 체인 + 서버 측 키 교환 파라미터를 한 번에 보낸다.
3. **ClientKeyExchange + ChangeCipherSpec + Finished**: 클라이언트가 pre-master 비밀을 보내고, 이후 대칭키 모드로 전환한다는 신호와 함께 Finished 메시지를 보낸다.
4. **ChangeCipherSpec + Finished**: 서버도 대칭키 모드로 전환했음을 알리고 Finished 로 핸드셰이크 무결성을 검증한다.

총 **2 RTT** 소요. 응용 데이터 전송은 그 이후부터.

## TLS 1.3 Handshake (1-RTT)

```anim:tls-handshake-1-3
{}
```

TLS 1.3 의 핵심 개선:

### KeyShare 동봉

ClientHello 에 클라이언트가 미리 계산한 DH 공개키 후보 (`KeyShare`) 를 동봉한다. 서버는 같은 cipher / 그룹을 선택하면 즉시 같은 세션 키를 도출할 수 있다.

### 인증서를 핸드셰이크 안에서 암호화

TLS 1.2 에서는 인증서가 평문으로 전송되었으나 TLS 1.3 에서는 ServerHello 직후부터 핸드셰이크 메시지도 (handshake traffic key 로) 암호화된다. 사용자가 어떤 도메인을 방문하는지 외부에서 보기 어려워진다. (단, SNI 는 여전히 평문, ECH 로 보완 중)

### 0-RTT Resumption

이전 세션의 PSK (Pre-Shared Key) 또는 세션 티켓을 첨부하면, 첫 패킷에 응용 데이터를 동봉할 수 있다. RTT 0 으로 응답 시작 가능.

⚠️ 0-RTT 는 **replay attack** 위험이 있다. 같은 데이터가 재전송될 수 있으므로 멱등(idempotent) 요청 (GET 등) 에만 권장. 결제 같은 부작용 있는 요청은 1-RTT 로 강제해야 한다.

### Cipher Suite 단순화

TLS 1.2 의 약한·취약 cipher (RC4, 3DES, CBC mode 등) 가 모두 제거되었다. 5개의 AEAD cipher suite 만 남았다.

## 인증서 체인 검증

```anim:tls-cert-chain
{}
```

브라우저는 서버가 보낸 인증서가 신뢰할 수 있는지 다음 절차로 검증한다.

1. **도메인 일치 확인**: 인증서의 SAN (Subject Alternative Name) 또는 CN 이 접속한 도메인과 일치하는가
2. **만료 확인**: `notBefore` ~ `notAfter` 범위 안에 있는가
3. **체인 서명 검증**: Leaf 인증서의 서명을 Intermediate CA 의 공개키로 검증, Intermediate 의 서명을 Root CA 의 공개키로 검증
4. **Root 일치 확인**: 체인의 최상위가 OS / 브라우저의 truststore 에 내장된 신뢰된 Root CA 인가
5. **폐기 여부 확인 (선택)**: OCSP (Online Certificate Status Protocol) 또는 CRL (Certificate Revocation List) 로 인증서가 revoke 되지 않았는지

서버는 보통 **Leaf + Intermediate** 만 전송한다. Root 는 클라이언트가 이미 truststore 에 가지고 있다.

### 인증서 발급 흐름

| 단계 | 누가 | 무엇을 |
|:---|:---|:---|
| 1. CSR 생성 | 서버 운영자 | 도메인 + 공개키로 CSR (Certificate Signing Request) 만든다 |
| 2. 도메인 소유 증명 | 운영자 → CA | DNS TXT 레코드 (DNS-01) 또는 HTTP `/.well-known/` (HTTP-01) |
| 3. 서명 | CA | 검증 통과 시 CA 의 비밀키로 Leaf 인증서에 서명 |
| 4. 갱신 | 서버 운영자 | Let's Encrypt 는 90일, 보통 60일 전 자동 갱신 |

Let's Encrypt, Cloudflare 등이 무료 + 자동화된 TLS 인증서를 제공하면서 HTTPS 가 사실상 표준이 되었다.

## [[QUIC]] 와 TLS

QUIC 은 TLS 1.3 을 **전송 계층에 통합**했다.

| 프로토콜 조합 | 핸드셰이크 RTT |
|:---|:---|
| TCP + TLS 1.2 | TCP (1 RTT) + TLS (2 RTT) = 3 RTT |
| TCP + TLS 1.3 | TCP (1 RTT) + TLS (1 RTT) = 2 RTT |
| QUIC (TLS 1.3 통합) | 1 RTT (full) 또는 0 RTT (resume) |

QUIC 은 핸드셰이크와 전송을 분리하지 않고, 같은 패킷 안에서 처리한다. 결과적으로 HTTP/3 는 첫 페이지 로딩이 HTTP/2 보다 빠르다.

## 약점과 주의점

- **인증서 관리 비용**: 갱신 자동화 (ACME / certbot / cert-manager) 가 필수. 만료 사고는 흔하다.
- **중간자 (MITM) 위험**: 사내 프록시나 일부 디바이스가 truststore 에 자체 CA 를 심어 트래픽을 가로채는 경우가 있다.
- **0-RTT replay**: TLS 1.3 의 0-RTT 는 부작용 있는 요청에 사용 금지.
- **SNI 노출**: 어떤 도메인에 접속하는지는 ClientHello 의 SNI 에 평문으로 노출됨. ECH (Encrypted Client Hello) 로 점진적 해결 중.
- **신뢰 모델 자체의 한계**: 약 150개 Root CA 중 하나라도 침해되면 임의의 도메인을 위장할 수 있음. Certificate Transparency (CT) 로 발급 로그 공개 의무화.

## 참고

- [RFC 8446, TLS 1.3](https://datatracker.ietf.org/doc/html/rfc8446)
- [RFC 5246, TLS 1.2](https://datatracker.ietf.org/doc/html/rfc5246)
- [Cloudflare, Why TLS 1.3 is great](https://blog.cloudflare.com/why-tls-1-3-isnt-in-browsers-yet/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt, How it works](https://letsencrypt.org/how-it-works/)
- [Certificate Transparency](https://certificate.transparency.dev/)
