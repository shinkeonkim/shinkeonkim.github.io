---
layout: post
title: "[TIL - Python] Spread operator"
categories: Python
math: true
tags:
  - Python
  - 숏코딩
  - TIL
---

# Spread operator

스프레드 연산자는 배열, 문자열, 객체 등의 Iterable 객체를 개별 요소로 분리해주는 연산자를 말합니다.

주로 JS에서 `...` 을 쓰면서 한번씩 보게 되는데, Python에서도 있고, 활용할 수 있다는걸 이제서야 알게 되었습니다. (ㅋㅋㅋ)

일단 아래와 같이 활용했습니다.

## 한 줄에 공백을 구분으로 숫자 여러개 입력을 받을 때

주로 이렇게 입력을 받아왔습니다.

```python
L = list(map(int, input().split()))
```

근데, 스프레드 연산자를 쓰면?

```python
L = [*map(int, input().split())]
```

## 리스트 깔끔하게 출력하기

아래와 같이 리스트가 있습니다.

```python
L = [1, 4, 12, 123]
```

위 리스트를 아래와 같이 출력하려고 합니다. 어떻게 할 수 있을까요?

```text
1 4 12 123
```

일단 나이브하게 해봅시다

```python
for i in L:
  print(i, end = ' ')
```

이건 너무 길죠? 한번 문자열의 join 메서드를 활용해볼까요?

```python
print(' '.join(L))
```

이것도 너무 불편합니다. 이제 스프레드 연산자를 써봅시다.

```python
print(*L)
```

정말 간결합니다.

스프레드 연산자를 너무 늦게 알아서 정말 불편하게 코드를 짜고 있었네요.
하나하나 더 `파이썬스럽게` 코드를 짤 수 있게 더 알아봐야 할 것 같습니다.

끝