---
layout: post
title: "[TIL] Django Alphanumeric Random String 생성하기"
categories: BOJ
date: 2021-12-14 21:40:53 +0900
math: true
tags:
  - TIL
  - python
  - Django
  - random
---

## Django에서 랜덤 문자열 쉽게 만들어내기

웹 서비스를 구성하다보면, 종종 랜덤 문자열을 뽑아내야 하는 경우가 있다. 

이번에는 사용자가 직접 가입하지 않고 초대를 받아 가입하는 서비스를 구성하던 중에, 임의적으로 유저의 username을 설정해야 했다.
이전에는 random module을 이용해 작성했지만, 이번에는 Django에서 지원하는 모듈로 작성하고자 찾아봤다.

## get_random_string

바로, `get_random_string`이다.

아래와 같이 import 하면 된다.

```python
from django.utils.crypto import get_random_string
```

#### 사용방법

1. length를 무조건 넘겨주어야 한다.
    ```python
    get_random_string(length=10)
    ```

2. allowed_chars를 이용해서 랜덤으로 뽑아낼 문자의 후보를 한정할 수 있다.
    ```python
    get_random_string(length=10, allowed_chars="ABCD")
    ```

3. 번외로 말하면 allowed_chars는 아래와 같이 하드코딩되어서 들어가고 있는 구조이다.

    ```python
    RANDOM_STRING_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

    def get_random_string(length=NOT_PROVIDED, allowed_chars=RANDOM_STRING_CHARS):
    ```

    따라서, 아래와 같이 allowed_chars를 한글로 대체하여 한글 랜덤 문자열을 자연스럽게 뽑아낼 수도 있다.
    ```
    get_random_string(3, "가나다")
    ```
