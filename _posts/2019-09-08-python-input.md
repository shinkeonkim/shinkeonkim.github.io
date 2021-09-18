---
layout: post
title: "PS를 하면서 사용하는 python input() 방식"
categories: class
tags:
    - python
--- 

## python의 input()은 문자열이야!

python에서 input()을 사용할 떄 다음과 같이 이해하면 편하다.

```
input()에 사용자가 입력하는 내용이 문자열로 대치된다.
```

이해가 안될 수 있으니 예시를 들어보자.

```python
a = input()
print(a)
```

위와 같은 코드가 있을 때, 사용자가 Hello라는 문자열을 입력했다고 생각해보자. 그러면 아래 코드와 같이 바꾸어 생각해볼 수 있다.

```python
a = "Hello"
print(a)
```

말 그대로 input()의 위치에 사용자가 입력한 문자열이 들어가는 것이다. 그러면 한번 5를 입력하고 2를 곱한 값을 출력해보자.

```python
a = input()
print(a*2)
```

만약, 위의 코드에 입력을 5라 했을 때, 10이라는 답이 출력되길 바랬다면 아직 python의 input()을 완벽히 이해하지 못한 상황이다.

python의 input()은 `문자열`로 생각해야 한다.
따라서 위의 코드는 `55`라는 문자열이 출력됬을 것이다. 그렇다면 10이 출력되게 할려면 어떻게 해야 할까.

```python
a = input()
a = int(a)
print(a*2)
```
이렇게 문자열을 int() 함수를 이용해 정수로 바꾼 뒤, 2를 곱한 다면 10이 출력될 것이다.

이 정도 내용을 모두 이해했다면 input()의 방식을 어느 정도 이해했을 것이다. 다음으로 넘어가보자.

## PS문제에서 주로 입력이 들어오는 방식

### 숫자 한 개

```python
a = int(input())
```

### 두 줄에 걸쳐 숫자 2개
```python
a = int(input())
b = int(input())
```

### 한 줄에 걸쳐 숫자 2개
```python
a,b = map(int,input().split())
```

### 한 줄에 걸쳐 N개의 숫자
```python
L = list(map(int,input().split()))
```
한 리스트에 담아 인덱스로 접근하는 것이 더 편하지만, 인덱스에 따라 무슨 정보가 담기는 지 잘 기억해야 한다.

### 특수 기호로 구분된 N개의 숫자
```python
L = list(map(int,input().split("특수기호")))
```

### 문자열 1개
```python
a = input()
```
공백이 포함됬든 안 포함됬든 상관없이 개행문자 기준으로 한 줄 모두 입력된다.

### 문자열 2개
```python
a,b = input().split()
```

### 문자열 N개
```python
L = list(map(int,input().split()))
```

### 실수 1개
``` python
a = float(input())
```
사실, 필자는 부동소수점 오류때문에 float으로 변환하기보다 input() 문자열 그 자체로 계산을 한 뒤, 직접 소숫점을 출력하는 방식을 더 많이 사용한다.


### 실수 2개
``` python
a,b = map(float,input().split())
```

일단 여러 부류로 나누어 설명을 해보았다. 더 많은 내용을 정리해 조금씩 더 정리를 해보겠다.

 2019.09.08) 일단 정수, 문자열, 실수에서 나올 수 있는 예시 정도를 정리해보았다.

