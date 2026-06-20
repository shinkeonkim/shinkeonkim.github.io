---
title: "HPACK"
aliases: ["HPACK 헤더 압축", "hpack"]
tags: [network, http, http2, compression]
updated: 2026-06-13
---

## 정의

**HPACK** ([RFC 7541](https://datatracker.ietf.org/doc/html/rfc7541))은 HTTP/2 에서 요청·응답 헤더를 압축하기 위해 설계된 방식.

HTTP/1.1 의 헤더는 매 요청마다 텍스트로 반복 전송되었다 (한 페이지 로드에 수십 KB가 헤더만으로 사용). HPACK 은 이를 동적·정적 인덱스 테이블로 줄인다.

## 압축 원리

### Static Table

자주 쓰이는 헤더 이름·값 조합을 미리 정의한 고정 인덱스 (61개).

```
1: :authority
2: :method GET
3: :method POST
4: :path /
5: :path /index.html
...
```

요청에 `:method GET` 이 있으면 그냥 인덱스 `2` 한 바이트만 전송.

### Dynamic Table

연결 단위로 유지되는 헤더 캐시. 처음 보낸 헤더는 인덱스로 등록되고, 다음 요청부터는 인덱스로만 전송.

### Huffman 인코딩

문자열로 전송해야 할 경우 Huffman 코드로 압축. ASCII에 최적화되어 보통 ~30% 추가 절약.

## 효과

| 시나리오 | HTTP/1.1 | HTTP/2 + HPACK |
|:---|:---|:---|
| 페이지 로드 (50 요청, 각 헤더 ~700B) | ~35 KB 헤더 | ~3-5 KB |
| 모바일 네트워크 (TCP slow start 단계) | 큰 영향 | 작은 영향 |
| 동일 호스트 반복 요청 | 반복 비용 | 거의 0 |

HTTP/2 의 multiplexing 외의 두 번째 큰 성능 이득.

## 보안 이슈

HPACK 의 dynamic table 은 **CRIME/BREACH 같은 사이드 채널 공격** 방어를 위해 일부 제약을 둔다 (예: 압축률을 외부에서 측정해 헤더 값을 추측하는 공격). RFC 7541 §7 의 보안 고려사항 참조.

HTTP/3 의 [[QUIC]] 환경에서는 HPACK 의 stream 간 의존성 문제를 해결한 **QPACK** ([RFC 9204](https://datatracker.ietf.org/doc/html/rfc9204)) 이 사용된다.

## 참고

- [RFC 7541, HPACK](https://datatracker.ietf.org/doc/html/rfc7541)
- [RFC 9204, QPACK (HTTP/3)](https://datatracker.ietf.org/doc/html/rfc9204)
