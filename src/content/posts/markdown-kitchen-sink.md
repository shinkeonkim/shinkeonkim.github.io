---
title: "마크다운 문법 종합 테스트"
description: "Astro + remark 플러그인 조합에서 어떤 마크다운 문법이 동작하는지 정리한 데모 페이지."
date: 2026-05-23
updated: 2026-05-23
tags: [meta, markdown, demo]
---

이 글은 새 블로그에서 지원하는 마크다운 문법을 한눈에 확인하기 위한 페이지입니다.

## 1. 기본 텍스트 강조

**굵게** · *기울임* · ***굵게+기울임*** · ~~취소선~~ · `인라인 코드` · <u>밑줄(HTML)</u>

자동 링크: <https://astro.build>
일반 링크: [Astro 공식 문서](https://docs.astro.build)
위키 링크: [[Astro]] · 별칭 [[Astro|Astro JS]] · 깨진 링크 [[존재하지않는위키]]

## 2. 헤딩 계층

### 3단계 헤딩

#### 4단계 헤딩

##### 5단계 헤딩

###### 6단계 헤딩

## 3. 인용과 콜아웃

평범한 블록 인용:

> "단순함이 궁극의 정교함이다." — 레오나르도 다 빈치

GitHub 스타일 콜아웃 (5종):

> [!NOTE]
> 정보 — 가볍게 알아두면 좋은 부가 설명을 적습니다.

> [!TIP]
> 팁 — 더 쉽게 일을 처리하기 위한 조언입니다.

> [!IMPORTANT]
> 중요 — 목표 달성에 꼭 필요한 핵심 정보입니다.

> [!WARNING]
> 경고 — 문제를 피하기 위해 즉시 주의해야 할 내용입니다.

> [!CAUTION]
> 주의 — 특정 행동으로 인한 위험이나 부정적 결과를 알립니다.

## 4. 리스트

순서 없는 리스트:

- 첫 번째 항목
- 두 번째 항목
  - 중첩 항목
  - 다른 중첩
    - 더 깊은 중첩
- 세 번째 항목

순서 있는 리스트:

1. 패키지 설치
2. 설정 추가
3. 빌드 확인

체크리스트 (GFM):

- [x] Astro 프로젝트 셋업
- [x] BrainDB 대체 remark 플러그인 작성
- [x] 다크/라이트 모드 구현
- [ ] 1만 글 마이그레이션

## 5. 코드 블록

인라인 코드: `const greeting = "안녕"`

TypeScript:

```ts
interface User {
  id: string;
  name: string;
  email?: string;
}

export async function getUser(id: string): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) return null;
  return response.json() as Promise<User>;
}
```

Python:

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: str
    name: str
    email: Optional[str] = None

async def get_user(id: str) -> Optional[User]:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"/api/users/{id}")
        if r.status_code != 200:
            return None
        data = r.json()
        return User(**data)
```

Bash:

```bash
#!/usr/bin/env bash
set -euo pipefail

for file in src/content/posts/*.md; do
  echo "Processing $file"
  pnpm exec markdownlint "$file"
done
```

JSON + diff + plain text:

```json
{
  "name": "shinkeonkim-log",
  "version": "0.1.0"
}
```

```diff
- 안녕하세요
+ 안녕하세요, 김신건입니다.
```

```
순수 텍스트 블록은 하이라이팅이 없습니다.
어떤 언어인지 명시하지 않으면 이렇게 보입니다.
```

## 6. 표

| 항목 | 설명 | 상태 |
|------|------|:---:|
| 다크/라이트 모드 | localStorage + prefers-color-scheme | ✅ |
| 위키링크 | 자체 remark 플러그인 | ✅ |
| 그래프 뷰 | D3 force simulation | ✅ |
| 통합 검색 | Pagefind 빌드 후 인덱싱 | ✅ |
| 페이지네이션 | Astro `paginate()` | ✅ |

정렬 옵션:

| 왼쪽 정렬 | 가운데 정렬 | 오른쪽 정렬 |
|:----------|:-----------:|------------:|
| left      | center      | right       |
| 짧은 텍스트 | 중간 길이 텍스트 | 더 긴 텍스트 |

## 7. 이미지

`public/` 디렉토리에 둔 이미지 (절대 경로):

![데모용 SVG 아바타](/favicon.svg)

리모트 이미지:

![Astro 로고](https://astro.build/assets/press/astro-logo-light.svg)

## 8. 푸트노트

푸트노트도 지원합니다[^astro-note]. 본문이 길어질 때 출처를 정리할 때 유용합니다[^korean].

[^astro-note]: Astro 5의 기본 remark 설정은 `remark-gfm` 과 `remark-smartypants` 를 포함합니다.
[^korean]: 한국어 콘텐츠에서도 푸트노트 마커가 정상 동작합니다.

## 9. 구분선과 줄바꿈

---

위는 구분선입니다. 줄바꿈 두 칸으로  
강제 줄바꿈도 됩니다.

## 10. HTML 직접 삽입

마크다운 안에서 필요할 때 HTML 을 직접 쓸 수 있습니다:

<details>
<summary>접었다 펼치는 영역</summary>

이 안에 마크다운은 동작하지 않습니다 (raw HTML). 그래도 텍스트와 일반 HTML 은 잘 들어갑니다.

</details>

<kbd>⌘</kbd> + <kbd>K</kbd> 같은 단축키 표기도 가능합니다.
