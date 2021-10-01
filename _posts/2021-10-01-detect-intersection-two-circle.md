---
layout: post
title: "[기초 PS 지식] 두 원의 교차 여부 판단하기"
categories: basic
date: 2021-10-01 23:10:49 +0900
math: true
tags:
  - math
  - ps
---

## 문제 상황

두 원의 x, y 좌표가 주어지고, 각각 반지름이 주어졌다고 하자.

이때, 두 원이 겹쳐진 부분이 있는지 판단하자.

## 기본 지식

한번 아래 그림들을 쭉 보면서, A점과 B점 사이의 거리에 집중해보자.

### 두 원이 겹쳐져 있을 때

두 원이 겹쳐져 있을 때, A점과 B점사이의 거리는 두 원의 반지름의 합(r1 + r2)보다 짧다.

![intersection-two-circle-1](/assets/img/posts/intersection-two-circle-1.jpeg)

### 두 원이 접할 때

두 원이 겹쳐져 있을 때, A점과 B점사이의 거리는 두 원의 반지름의 합(r1 + r2)과 같다.

![intersection-two-circle-2](/assets/img/posts/intersection-two-circle-2.jpeg)

### 두 원이 떨어져 있을 때

두 원이 겹쳐져 있을 때, A점과 B점사이의 거리는 두 원의 반지름의 합(r1 + r2)보다 길다.

![intersection-two-circle-3](/assets/img/posts/intersection-two-circle-3.jpeg)

## 코드로 나타내기

그럼 이걸 코드로 나타내자.

예시로 만약 두 원이 겹친다면 YES를, 접하거나 떨어져 있는 경우 NO를 출력하는 코드를 작성해보자. 

([22938번: 백발백준하는 명사수](https://www.acmicpc.net/problem/22938)의 상황이다.)

```python
x1, y1, r1 = map(int, input().split())
x2, y2, r2 = map(int, input().split())

print("YES" if ((x1-x2) * (x1-x2) + (y1-y2) * (y1-y2)) ** (1/2) < r+r2 else "NO")
```

위와 같이 직관적으로 점과 직선사이의 공식을 써서 해결할 수 있다. 심지어, 저 위 링크의 문제도 이 코드로 해결된다.

다만, 가끔 소수점 연산의 오차를 노린 테케가 섞여 있는 문제가 있을 수도 있으니

이럴 때 루트(sqrt)를 적용한 코드보단, 아래와 같이 양변을 제곱해 소수점 연산을 안하는 것이 더 좋다.

```python
x1, y1, r1 = map(int, input().split())
x2, y2, r2 = map(int, input().split())

print("YES" if (x1-x2) * (x1-x2) + (y1-y2) * (y1-y2) < r*r + r2*r2 + 2*r*r2 else "NO")
```

끝
