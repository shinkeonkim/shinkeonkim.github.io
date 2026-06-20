---
title: "SIMT"
aliases: ["Single Instruction Multiple Threads", "simt", "warp", "SIMT 모델"]
tags: [gpu, parallel-computing, architecture, cuda]
updated: 2026-06-13
---

## 정의

**SIMT** (Single Instruction, Multiple Threads) 는 NVIDIA 가 정립한 GPU 의 실행 모델이다. 한 명령(instruction) 을 한 그룹의 thread(warp) 가 동시에 실행하되, **각 thread 는 자기 레지스터와 데이터**를 갖는다.

```anim:gpu-simt
{}
```

## SIMD 와의 차이

SIMD (Single Instruction Multiple Data) 와 헷갈리기 쉽다.

| | SIMD | SIMT |
|:---|:---|:---|
| 데이터 그룹 | 벡터 레지스터 (예: AVX-512 = 16 floats) | thread (수 십개) |
| 분기 처리 | 어렵음 (masked operation) | 자동 (warp divergence) |
| 프로그래밍 모델 | 명시적 SIMD intrinsic | 평범한 thread 코드 |
| 대표 사례 | CPU AVX, ARM NEON | NVIDIA CUDA, AMD ROCm |

CUDA 코드는 마치 각 thread 가 독립적으로 도는 것처럼 작성하지만, 하드웨어는 32 thread (= 1 warp)를 lockstep 으로 함께 실행한다.

```cpp
__global__ void add(float* a, float* b, float* c, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) c[i] = a[i] + b[i];
}
// 각 thread 가 c[i] = a[i] + b[i] 를 자기 i 로 수행
// 한 warp 의 32 thread 가 동시에 ADD 명령 실행
```

## Warp

- **Warp 크기**: NVIDIA = 32 threads, AMD wavefront = 32 또는 64
- 1 warp 의 모든 thread 는 **같은 PC (program counter)** 를 공유 → 같은 명령 동시 수행
- 각 thread 는 **고유한 thread index** + 자기 레지스터 보유

```
SM (Streaming Multiprocessor) 한 개:
  - 64 개의 warp 동시 보유 가능
  - 한 cycle 에 1~4 개의 warp 명령 디스패치
  - 같은 SM 의 warp 들은 공유 메모리(SRAM) 접근 가능
```

NVIDIA H100 = 132 SM × 64 warp × 32 thread = **약 27만 thread 동시 처리** 가능 (실제 활성 thread 수는 워크로드에 따라 다름).

## Warp Divergence

SIMT 의 가장 큰 함정.

```cpp
if (x > 0) {
  result = compute_A();
} else {
  result = compute_B();
}
```

같은 warp 의 일부 thread 만 `if` 경로를 타고 나머지가 `else` 를 타면, **GPU 는 두 경로를 직렬로 실행**한다.

```
Cycle 1: warp 의 (x>0) thread 만 활성, compute_A 실행
         (x<=0) thread 는 idle
Cycle 2: warp 의 (x<=0) thread 만 활성, compute_B 실행
         (x>0) thread 는 idle
```

결과적으로 같은 warp 안에서 분기가 갈리면 **활용률이 절반**으로 떨어진다.

### Divergence 최소화 패턴

- **데이터 정렬**: 비슷한 분기 결과를 가진 thread 를 같은 warp 로 모음
- **분기 단순화**: triangle ops, masked select 등으로 변환
- **branch-free 알고리즘 선호**: 예) `min(a, b)` 보다 `a + (b - a) * (a > b)` 같은 식

## 메모리 접근 패턴

SIMT 의 또 다른 성능 결정 요인은 **coalesced memory access**.

- 한 warp 의 32 thread 가 연속된 메모리 주소를 접근 → 1번의 메모리 트랜잭션으로 처리 (좋음)
- 흩어진 주소를 접근 → 32번의 트랜잭션 (나쁨, 32x 메모리 대역폭 소모)

배열 인덱스를 thread ID 로 만드는 게 정석.

```cpp
// Good: thread 0 → a[0], thread 1 → a[1], ... → coalesced
data[threadIdx.x]

// Bad: thread 0 → a[0], thread 1 → a[32], ... → scattered
data[threadIdx.x * 32]
```

## 관련 모델: SPMD

SIMT 와 비슷하지만 더 일반적인 모델로 **SPMD** (Single Program Multiple Data) 가 있다. MPI 같은 분산 컴퓨팅에서 모든 노드가 같은 프로그램을 다른 데이터로 실행하는 패턴.

SIMT 는 SPMD 의 GPU 하드웨어 구현 정도로 보면 맞다.

## 참고

- [[HBM]] - SIMT thread 수만큼 메모리 대역폭이 중요한 이유
- [[Systolic Array]] - SIMT 와 다른 행렬 곱셈 전용 구조
- [NVIDIA CUDA C++ Programming Guide, SIMT Architecture](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#simt-architecture)
- [AMD ROCm, Wavefront](https://rocm.docs.amd.com/)
