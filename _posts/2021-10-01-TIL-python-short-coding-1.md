---
layout: post
title: "[TIL] python으로 숏코딩 하기 1"
categories: TIL
date: 2021-10-01 21:34:20 +0900
math: true
tags:
  - python
  - short coding
---

## n을 입력받고 n번 반복문 돌리기

[22155번: Простая задача](https://www.acmicpc.net/problem/22155) 문제를 풀고, 숏코딩 풀이들을 살펴보다 알게 되었다.

주어진 상황을 직관적으로 짜보면 아래와 같다.

```python
n = int(input())
for i in range(n):
```

하지만 뒤 코드에 n을 활용하지 않는다면, 아래와 같이 range에 포함시킬 수 있다.

```python
for i in range(int(input())):
```

이게 끝이 아니다. 

```python
for i in ' '*int(input()):
```

어차피 n번 반복하면 되기 때문에 n이 크지 않다면 무난하게 위와 같이 짧게 쓸 수 있다.
(clean code라고 할 수 있을 지는 모르겠지만 재밌다.)

