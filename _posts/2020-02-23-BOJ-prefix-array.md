---
layout: post
title: "[BOJ] silver 문자열 문제 풀이(1)"
categories: algorithm
tags:
    - BOJ
    - prefix array
---

> 원래 prefix array tag를 가진 문제들이었지만, 많이 달라졌네요 ㅋㅋㅋ. 문자열 문제 풀이로 변경하였습니다.

### BOJ 1639: 행운의 티켓

[1639번: 행운의 티켓](https://www.acmicpc.net/problem/1639)

```python
ans = 0

L = list(map(int,list(input())))

for i in range(len(L)):
    for j in range(i+1,len(L),2):
        sub = L[i:j+1]

        if sum(sub[:len(sub)//2]) == sum(sub[len(sub)//2:]):
            if ans < len(sub):
                ans = len(sub)

print(ans)
```

### BOJ 10751: COW

[10751번: COW](https://www.acmicpc.net/problem/10751)

이 문제는 원어 문제인데 대충 (못 미더운 영어실력으로) 해석을 해보면, 

**'C', 'O', 'W' 로 이루어진 문자열 s가 있을 때, 문자열s를 나눈 뒤에 앞에서부터 조합해 만들수있는 "COW"의 개수를 구해라**

정도로 추릴 수 있습니다.

제 풀이는 prefix array를 활용하면서도, 안한 느낌이 납니다만.. 아무튼 설명을 해보자면,

```
0. cnt0 = cnt1 = cnt2 = 0

1. 문자열을 앞에서부터 탐색한다.

2. 현재 문자가 C라면 cnt0에 1 더한다.

3. 현재 문자가 O라면 cnt1에 cnt0값만큼 더한다.

4. 현재 문자가 W라면 cnt2에 cnt1값만큼 더한다.
```

이 위의 방식대로 한번 문제를 적어보면서 생각해보시면 제가 어떤 방식을 활용했는지 이해되실겁니다. 아마?

코드는 아래와같습니다.

```cpp
#include <iostream>
#include <string>

using namespace std;

typedef long long ll;

int N;
string s;
ll cnt[3];

int main() {
	cin >> N >> s;

	for(int x=0; x<N; x++) {
		if(s[x]=='C') cnt[0]++;
		else if(s[x]=='O') cnt[1]+=cnt[0];
		else cnt[2]+=cnt[1];
	}

	cout<<cnt[2];
}
```

### BOJ 2559: 수열

[2559번: 수열](https://www.acmicpc.net/problem/2559)

이 문제는 딱히 따로 문제에 대해서 크게 설명할 필요는 없을 것 같습니다.

제가 이 문제를 해결한 방법은 아래와 같습니다.

1. 먼저, 맨 앞에서부터 길이 K를 가지는 부분 배열의 합을 구하고 이를 초기값으로 둡니다.

2. 이제 쭉 뒤로 탐색을 하면서, 기존값에서 앞에 1칸값은 빼고 뒤에 1칸값은 더해가면서 길이 K를 맞춰가며 수치를 구합니다.

3. 그리고 구한 수치들 중 최대값을 찾습니다. 

무난무난하게 해결할 수 있는 문제입니다.

코드는 다음과 같습니다.

```python
N,K=map(int,input().split())
L = list(map(int,input().split()))
S = 0

for i in range(K):
    S += L[i]

ans = S

for i in range(0,N-K):
    S-=L[i]
    S+=L[i+K]

    if ans < S:
        ans = S

print(ans)
```

### BOJ 8933: MCS

[8933번: MCS](https://www.acmicpc.net/problem/8933)

개인적으로 조금 귀찮았던 문제입니다.

사실상 문제 풀이 아이디어나 구현 방식은 실버가 맞는데 조금 들어가는 아이디어가 많았습니다.

일단 먼저 코드부터 올려놓겠습니다.

```cpp
#include <iostream>
#include <string>
#include <map>
using namespace std;
typedef long long ll;

int T;
int N;
string s;
int cnt[4];

void add(int* cnt, char x) {
	if(x=='A') cnt[0]++;
	if(x=='T') cnt[1]++;
	if(x=='G') cnt[2]++;
	if(x=='C') cnt[3]++;
}

void sub(int* cnt, char x) {
	if(x=='A') cnt[0]--;
	if(x=='T') cnt[1]--;
	if(x=='G') cnt[2]--;
	if(x=='C') cnt[3]--;
}

int hash_num(int* cnt) {
	int ret = 0;
	for(int x=0; x<4; x++) {
		ret*=600;
		ret+=cnt[x];
	}
	return ret;
}

int main() {
	cin >> T;
	while(T--) {
		for(int x=0;x<4; x++) cnt[x]=0;
		cin >> N >> s;
		if(N>s.length()) {
			cout << 0;
			continue;
		}
		map<ll,int> num_cnt;
		int answer = 0;
		for(int x=0; x<N; x++) {
			add(cnt,s[x]);
		}
		ll K = hash_num(cnt);
		if(num_cnt.find(K) !=num_cnt.end()) {
			num_cnt[K]++;	
		}
		else {
			num_cnt[K]=1;
		}
		for(int x=0; x<=s.length()-N; x++) {
			sub(cnt,s[x]);
			add(cnt,s[x+N]);
			ll K = hash_num(cnt);
			if(num_cnt.find(K) !=num_cnt.end()) {
				num_cnt[K]++;	
			}
			else {
				num_cnt[K]=1;
			}
		}
		
		for(auto it = num_cnt.begin(); it!=num_cnt.end(); it++) {
			if(answer < it->second) {
				answer = it->second;
			}
		}
		cout<<answer<<"\n";
	}
}
```

전 조금 이런저런 고생을 하면서 코드를 작성했는데,

add나 sub 함수는 방금 전에 설명한 `2559: 수열` 문제에서 사용한 아이디어를 활용한 함수입니다.

그리고 hash\_num 이라는 함수가 있는데, 현재 탐색중인 구간에 A,T,G,C의 개수를 cnt에 저장하게 했고,

이 cnt의 상태를 하나의 hash값으로 바꾸어주는 함수입니다.

그럼 cnt가 하나의 long long 범위 내에 드는 숫자로 됐으니, 이제 이 hash값을 map을 이용해 key는 hash값, value는 개수로 해서 저장합니다.

그리고 맨 마지막에 map을 순회하면서 value 중 최대값이 무엇인지 찾고 출력합니다.

조금 복잡하게 짠 느낌이 없지않아 있지만 아무튼 이 정도로 설명할 수 있을 것 같네요.

처음으로 문제 풀이를 올리는지라 너무 설명이 번잡하네요. :(

끝!
