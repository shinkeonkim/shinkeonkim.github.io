---
title: '[Leetcode] 193 Valid Phone Numbers'
description: Leetcode 193번 문제 풀이입니다.
date: 2026-05-25 17:14:00 +0900
tags:
- Leetcode
series: Leetcode 풀이
seriesOrder: 193
---

## 문제 요약 및 풀이

file.txt가 주어질 때, (xxx) xxx-xxxx or xxx-xxx-xxxx 형태의 전화번호를 모두 출력하는 한 줄짜리 [[Shell Script]]를 작성해야 한다.

신경써야했던 부분은

1. 괄호가 있는 경우와 없는 경우의 두 케이스를 구분해야 한다.
2. 앞, 뒤에 의미없는 문자들이 들어오는 케이스가 있을 수 있다.
3. 숫자가 아닌 문자들이 들어오는 케이스가 있을 수 있다.
4. 각 숫자의 개수도 정확히 맞아야 한다.

## 풀이 코드

```shell
grep -E '(^[0-9]{3}-[0-9]{3}-[0-9]{4}$)|^(\([0-9]{3}\) [0-9]{3}-[0-9]{4}$)' file.txt
```
