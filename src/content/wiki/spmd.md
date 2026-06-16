---
title: "SPMD"
aliases: ["Single Program Multiple Data", "spmd", "단일 프로그램 다중 데이터"]
tags: [parallel-computing, programming-model, distributed]
updated: 2026-06-14
---

## 정의

**SPMD** (Single Program, Multiple Data)는 병렬 컴퓨팅의 대표 모델 중 하나. **모든 프로세스(또는 thread)가 같은 프로그램을 실행하되, 각자 다른 데이터를 처리**한다.

Frederica Darema 가 1980년대 후반 IBM 에서 정의한 개념. MPI, CUDA, OpenMP 등 거의 모든 병렬 컴퓨팅 프레임워크의 기본 추상화.

## 동작 방식

```python
# SPMD 의사 코드 (모든 노드가 같은 코드 실행)
my_rank = get_rank()           # 0, 1, 2, ..., N-1
my_data = load_data(my_rank)   # 노드마다 다른 데이터 슬라이스
result = process(my_data)      # 같은 처리 로직
all_results = collective_op(result)  # 통신 (all-reduce 등)
```

각 노드/프로세스는:
- **rank (또는 id)** 로 자기를 식별
- **자기 데이터 슬라이스**만 처리
- **동기화 지점** 에서 통신 (barrier, all-reduce, broadcast 등)

## 다른 병렬 모델과의 차이

| 모델 | 프로그램 | 데이터 | 동기화 | 대표 사례 |
|:---|:---|:---|:---|:---|
| **SIMD** | 1 | 여러 vector | 매 사이클 | CPU AVX, SSE |
| **[[SIMT]]** | 1 | thread 마다 | warp 단위 | GPU CUDA |
| **SPMD** | 1 (인스턴스 N개) | 노드 마다 | 명시적 | MPI, 분산 학습 |
| **MIMD** | 여러 | 여러 | 명시적 | 일반 멀티스레드 |

[[SIMT]] 는 SPMD 의 GPU 하드웨어 구현 정도로 볼 수 있다. CUDA 코드를 작성할 때 각 thread 가 자기 `threadIdx.x` 로 자기 데이터를 처리하는 패턴이 정확히 SPMD.

## SPMD 의 매력

### 1. 프로그래밍 단순함

여러 다른 프로그램을 짜는 게 아니라 하나만 짜면 됨. rank 로 분기.

```python
if my_rank == 0:
    coordinator_logic()
else:
    worker_logic()
```

### 2. 확장 용이

같은 코드를 100 노드든 10,000 노드든 실행 가능. 노드 수만 바꾸면 끝.

### 3. 동기화가 명시적

모든 노드가 같은 코드를 실행하므로 `collective_op` 같은 동기화 지점이 자연스럽게 일치.

## 실제 예시

### MPI (Message Passing Interface)

전통적인 HPC 의 SPMD 표준.

```c
MPI_Init(&argc, &argv);
int rank, size;
MPI_Comm_rank(MPI_COMM_WORLD, &rank);
MPI_Comm_size(MPI_COMM_WORLD, &size);

// 각 rank 가 자기 데이터 슬라이스 처리
double local_sum = compute_local_sum(rank);

// 모든 노드의 합 = global_sum 으로 집계
double global_sum;
MPI_Reduce(&local_sum, &global_sum, 1, MPI_DOUBLE, MPI_SUM, 0, MPI_COMM_WORLD);

MPI_Finalize();
```

### CUDA (GPU)

GPU 의 SPMD 구현. 각 thread 가 자기 인덱스로 작업.

```cuda
__global__ void add_vectors(float* a, float* b, float* c, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) c[i] = a[i] + b[i];
}
```

### PyTorch DDP / FSDP

[[분산 학습]] 의 SPMD 패턴. 모든 GPU 가 같은 모델 코드를 실행, 각자 다른 배치 처리, `all_reduce` 로 gradient 동기화.

```python
# 모든 rank 가 실행
dist.init_process_group()
model = DDP(model)
for batch in dataloader:  # rank 마다 다른 배치
    loss = model(batch)
    loss.backward()
    # DDP 가 자동으로 all-reduce
    optimizer.step()
```

### JAX `pmap`

함수형 SPMD.

```python
@jax.pmap
def step(params, batch):
    return params - learning_rate * grad(loss)(params, batch)

# pmap 은 모든 device 에 같은 함수를 자동 분배
new_params = step(replicate(params), sharded_batch)
```

## SPMD 의 한계

### 1. Heterogeneous 워크로드 어려움

모든 노드가 같은 일을 한다는 가정. 일부 노드만 다른 작업이 필요한 경우 ([[Pipeline Parallelism]] 등) MIMD 스타일로 전환 필요.

### 2. Load imbalance

각 노드의 작업량이 다르면 빠른 노드가 느린 노드를 기다림. 균형 분할이 중요.

### 3. 통신 비용

`all_reduce`, `all_gather` 같은 collective 가 노드 수에 따라 비용 급증. 100 노드 → 10,000 노드 확장 시 통신 패턴 재설계 필요.

## 참고

- [[SIMT]] - GPU 하드웨어 구현
- [[분산 학습]] - 대규모 모델 학습의 SPMD 패턴
- [Darema 1988, SPMD model](https://www.computer.org/csdl/proceedings-article/icpp/1988)
- [MPI Standard](https://www.mpi-forum.org/)
