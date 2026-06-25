# Wiki Mass Buildout - Instructions

> 이 문서는 **session-independent** 입니다. 어떤 session 이 이어받아도 이 문서만 읽으면 다음 토픽을 작성할 수 있어야 합니다.

## Goal

`solved.ac/problems/tags` 의 **229개 알고리즘 태그** 전부에 대해, 다음 4 요소를 포함한 wiki 문서를 만든다.

1. 개념 설명 (정의, 문제 상황과 동기, 핵심 아이디어, 복잡도)
2. **CodeWithOutput** 컴포넌트로 다언어 (C++, Python, 가능하면 Java) 코드 + 실행 결과
3. **애니메이션** (JSON 파일, `anim:<slug>` 로 wiki 에서 참조)
4. **BOJ 연습 문제 표** (kokoa-lab/boj-problems repo 링크)

진행 상태는 [`PROGRESS.md`](./PROGRESS.md) 에서 관리. 한 토픽을 완료하면 그 항목 체크박스를 `[ ]` -> `[x]` 로.

---

## 작업 단위 (한 토픽당)

각 토픽은 다음 3 산출물을 동시에 만든다.

| 산출물 | 경로 |
|:---|:---|
| Wiki MDX | `src/content/wiki/algorithm/<sub>/<slug>.mdx` |
| Animation JSON | `public/animations/<slug>.json` |
| (선택) Source 파일 | `src/content/sources/<source-slug>.md` (이미 있으면 재사용) |

**slug** 는 solved.ac 태그의 영어 슬러그를 그대로 (kebab-case). 예: `binary_search` -> `binary-search`.

---

## Wiki MDX 구조 (필수 섹션)

```yaml
---
title: "<Korean 또는 English topic name>"
aliases: ["alias1", "한글별칭", "..."]
tags: [algorithm, <subcategory>, ...]
updated: 2026-06-23
references:
  - id: unknown-to-wellknown          # 이미 만든 source ID
    note: "..."
  - title: "<inline ref>"
    url: "<URL>"
    author: "<author>"
---

## 정의

<2~4 줄. 알고리즘이 무엇인지, 누가 언제 고안했는지>

## 문제 상황과 동기

<왜 필요한가, naive 접근의 한계 (구체 bound), 핵심 통찰 (한 줄), 자주 등장하는 PS / 실무 위치>

## 시각화

```anim:<slug>
{}
```

## 핵심 아이디어

<invariant, amortized 분석, 왜 bound 가 성립하는가>

## 알고리즘

<pseudocode in ```text fence>

## 구현

<CodeWithOutput 컴포넌트, 다언어 + 입출력. 아래 "CodeWithOutput 사용법" 참고>

## 복잡도

| 항목 | 값 |
|:---|:---|
| **시간 (최선)** | ... |
| **시간 (평균)** | ... |
| **시간 (최악)** | ... |
| **공간** | ... |
| **안정성** | ✓ / ✗ |

## 변형 / 활용

<선택. 대표 변형, 응용 분야>

## 함정

<선택. 잘못 짜는 케이스 2~3 가지>

## BOJ 연습 문제

| 번호 | 제목 | 정답률 | 링크 |
|:---|:---|---:|:---|
| BOJ 1000 | A+B | 32.5% | [kokoa-lab](https://github.com/kokoa-lab/boj-problems/tree/main/organize_problems/1000-1099/1000) |

## 참고

- [[관련 wiki 페이지]]
- 외부 링크 (블로그, 논문 등)
```

**목표 라인**: 본문 150~280 줄.

**em-dash (U+2014) 금지**. `,`, `:`, `/`, `-` (ASCII hyphen) 사용. `bun run lint:no-em-dash` 가 막힌다.

**Wikilink**: 같은 wiki 내 다른 페이지 참조시 `[[Page Name]]`.

---

## CodeWithOutput 사용법

컴포넌트 위치: [`src/features/code-with-output/ui/CodeWithOutput.astro`](../../src/features/code-with-output/ui/CodeWithOutput.astro)

### 단일 코드 + 단일 케이스

```jsx
<CodeWithOutput
  language="cpp"
  code={`#include <iostream>
int main() {
  int a, b;
  std::cin >> a >> b;
  std::cout << a + b;
  return 0;
}`}
  input={`3 5`}
  output={`8`}
  inputLanguage="text"
  outputLanguage="text"
/>
```

### 다언어 비교 + 단일 케이스

```jsx
<CodeWithOutput
  variants={[
    { language: "cpp", label: "C++", code: `...` },
    { language: "python", label: "Python", code: `...` },
    { language: "java", label: "Java", code: `...` }
  ]}
  input={`3 5`}
  output={`8`}
/>
```

### 다언어 + 다중 케이스

```jsx
<CodeWithOutput
  variants={[
    { language: "cpp", label: "C++", code: `...` },
    { language: "python", label: "Python", code: `...` }
  ]}
  cases={[
    { label: "기본 예제", input: "3 5", output: "8" },
    { label: "큰 값", input: "1000000000 1000000000", output: "2000000000" }
  ]}
/>
```

### 작성 원칙

- **C++ 은 항상 포함** (PS 표준).
- **Python 도 가능하면 포함** (가독성, 알고리즘의 본질만 드러남).
- **Java 는 선택** (Java 가 일반적인 토픽, 예: HashMap, TreeMap 같은 경우만).
- **실제로 컴파일/실행되는 코드** 만 쓴다. 검증할 자신이 없으면 ``` ```text 의사코드 ``` 로 fallback.
- **input/output 은 실제 stdin/stdout** 형식. 콘솔에 그대로 칠 수 있어야 함.
- 다중 케이스는 *경계값, 음수, 큰 값* 같이 의미 있는 케이스만.

### Frontmatter MDX 임포트

MDX 에서 `<CodeWithOutput>` 을 쓰려면 파일 상단에 import 가 필요. 단, Astro 의 글로벌 컴포넌트 등록 방식에 따라 import 생략 가능할 수 있음. 기존 사용 예 (`src/content/wiki/sql/sql-join.mdx`) 따라 그대로 사용.

---

## Animation JSON

경로: `public/animations/<slug>.json`

스키마 핵심: [.private/animation-creation-context.md](../animation-creation-context.md) 참고.

목표 60~120 줄 (java-treemap-rbtree.json 와 비슷한 밀도).

필수 필드:
- `version: 4`
- `id: "<slug>"`
- `title`, `description`
- `category: "algorithm"`
- `tags: [...]`
- `duration: 12000~14000`
- `canvas: { width: 900, height: 500, background: "transparent" }`
- `elements: [...]` (10~25 개)
- `chapters: [...]` (4~6 개)
- `effects: [...]` (3~7 개)
- `settings: { loop: true, autoplay: true, showCaption: false, showChapterList: true }`

색상 팔레트 (재사용):

| 용도 | fill | stroke | text |
|:---|:---|:---|:---|
| Neutral | `#e2e8f0` | `#475569` | `#0b0b0f` |
| Info / blue | `#dbeafe` | `#2563eb` | `#1e3a8a` |
| Success / green | `#dcfce7` | `#16a34a` | `#14532d` |
| Active / yellow | `#fef9c3` | `#eab308` | `#713f12` |
| Warning / red | `#fee2e2` | `#dc2626` | `#7f1d1d` |
| Accent / purple | `#ede9fe` | `#7c3aed` | `#5b21b6` |
| Dark / code | `#1e293b` | `#475569` | `#e2e8f0` |

---

## BOJ 연습 문제 표 (kokoa-lab repo)

acmicpc.net 직접 링크 대신 kokoa-lab/boj-problems 의 디렉토리 링크 사용.

URL 패턴:
```
https://github.com/kokoa-lab/boj-problems/tree/main/organize_problems/<bucket>/<id>
```

`<bucket>` = id 의 백자리 단위. 예: 12916 -> `12900-12999`, 1763 -> `1700-1799`, 27071 -> `27000-27099`.

문제 제목 / 정답률을 자동 확인하려면:
```
https://raw.githubusercontent.com/kokoa-lab/boj-problems/main/organize_problems/<bucket>/<id>/problem.md
```

의 YAML frontmatter (`title`, `acceptance_rate`) 를 파싱.

채워야 할 표:
```markdown
| 번호 | 제목 | 정답률 | 링크 |
|:---|:---|---:|:---|
| BOJ <id> | <title> | <rate>% | [kokoa-lab](URL) |
```

문제 정보 fetch 가 실패하면 `(수집 안 됨)` 으로 표시하고 링크는 계속 유지.

---

## 검증 (모든 토픽 완료 후)

```bash
bun run lint:no-em-dash    # em-dash 없는지
bun astro check            # frontmatter schema 통과
jq empty public/animations/*.json   # 모든 애니메이션이 valid JSON
```

각 토픽 완료 시 위 3 가지 모두 통과해야 함.

---

## 토픽 그룹별 권장 시각화 / 코드 예시

| 토픽 family | 시각화 컨셉 | 코드 예시 |
|:---|:---|:---|
| 정렬 (sorting, bubble, quick, ...) | 배열 cell 들의 swap / merge 단계 | 길이 5~10 배열 정렬, 결과 출력 |
| 그래프 탐색 (bfs, dfs, dijkstra, ...) | 4~6 노드 그래프 + 방문 순서 색칠 | adj-list 입력 받아 거리 출력 |
| DP (basic, knapsack, lis, lcs, ...) | DP 표 채우기 | N, K 받아 dp[N][K] 출력 |
| 자료구조 (segtree, lazyprop, ...) | 트리 노드 + 활성 path | 구간 합 쿼리 |
| 문자열 (kmp, manacher, trie, ...) | 문자열 위 포인터 이동 | 매칭 위치 출력 |
| 수학 / 정수론 (sieve, gcd, ...) | 숫자 격자 / divisor lattice | 입력값에 대한 답 |
| 기하 (convex_hull, sweeping, ...) | 2D 점들 + sweep line | 면적 / 점 개수 |
| 최적화 (cht, slope_trick, ...) | 함수 그래프 + 접선 | 최적값 |

---

## "다음 세션이 이어받을 때" 가이드

1. **이 INSTRUCTIONS.md 를 먼저 읽는다.**
2. [`PROGRESS.md`](./PROGRESS.md) 에서 `[ ]` 인 항목 중 가장 위 (가장 우선순위 높은) 것을 잡는다.
3. 그 항목을 `[~]` (in-progress) 로 마크하고 작업 시작.
4. 다음 3 산출물을 만든다:
   - `src/content/wiki/algorithm/<sub>/<slug>.mdx`
   - `public/animations/<slug>.json`
   - (필요시) `src/content/sources/<source>.md`
5. 위의 "검증" 명령으로 통과 확인.
6. PROGRESS.md 에서 그 항목을 `[x]` 로 마크.
7. 가능한 한 그 세션에서 더 많은 항목 진행.
8. 세션 종료 시 PROGRESS.md 의 "Session Log" 에 한 줄 추가.

## 작업 효율 팁

- **Sub-agent (subagent_type="general")** 가 동작하면 한 번에 3개 토픽씩 묶어 fan out. 4개 이상은 timeout 위험.
- **인프라가 불안정**할 때는 main session 에서 직접 작성. 한 토픽당 ~10~15분 직접 작업.
- **유사 토픽 묶음 처리**: bfs/dfs/dijkstra/0_1_bfs 같이 비슷한 토픽은 같은 세션에 묶으면 시각화 / 코드 재사용 가능.
- **기존 wiki 참고**: `src/content/wiki/algorithm/bubble-sort.mdx`, `merge-sort.mdx` 가 가장 잘 정제된 템플릿. 새 토픽은 이 톤을 mimic.

---

## 이미 완료된 wiki (참고)

Round 1~3 에서 작성된 42개의 Unknown-To-Wellknown 토픽 + 기존 sorting 8개. PROGRESS.md 에 `[x]` 로 표시되어 있음. 새 토픽 작성 시 [[wikilink]] 로 적극 참조.

기존 source 파일 (`src/content/sources/`):
- `unknown-to-wellknown` (U2W 메타)
- `koosaga-blog`, `infossm-blog`, `jhnah917-blog`, `ddia`, `astro-docs`, `python-docs`, `python-peps`, 등

새 source 가 자주 인용된다면 source 파일 추가.
