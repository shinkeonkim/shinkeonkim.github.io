# Animation Inspection Rubric

> 모든 `public/animations/*.json` 애니메이션의 완성도 평가 기준.
> Burnside 같은 "scaffold-only" 애니메이션 (배경 박스 + 제목만 있고 실제 시각화는 없는 케이스) 을 잡아내기 위함.

## 평가 단계

### Stage 1: 정량 score (자동, `scripts/score-animations.py`)

각 애니메이션에 대해 다음 metric 추출.

| Metric | 의미 |
|:---|:---|
| `total_elements` | 전체 element 개수 |
| `content_elements` | label/content 가 있어 *데이터를 표현* 하는 element 수 |
| `visual_shape_elements` | `circle, line, arrow, path, polygon` 합계 |
| `data_rect_elements` | width < 200 + label 있는 rect (cell / box) |
| `tracks_count` | property tracks 총 개수 (애니메이션 변화 횟수) |
| `effects_count` | effects 배열 길이 |
| `chapters_count` | chapters 배열 길이 |

다음 condition 으로 자동 flag.

| Flag | 조건 | 의미 |
|:---|:---|:---|
| `SCAFFOLD_ONLY` | `visual_shape_elements + data_rect_elements == 0` | 배경 + 텍스트만, 실제 시각화 없음 |
| `TOO_FEW_ELEMENTS` | `total_elements < 10` | 콘텐츠 부족 |
| `STATIC` | `tracks_count == 0` AND `effects_count <= 2` | 정적 (애니메이션 변화 거의 없음) |
| `SHORT` | `duration < 6000` | 너무 짧음 |
| `NO_CHAPTERS` | `chapters_count == 0` | navigation 없음 |

### Stage 2: 정성 review (agent, 페어 wiki MDX 와 비교)

자동 flag 가 하나라도 잡힌 애니메이션에 대해 agent 가 다음 4 가지를 검토.

#### Criterion A: 시각화 적합성

wiki MDX 의 "## 정의" / "## 핵심 아이디어" / "## 알고리즘" 섹션이 설명하는 *구체적인 개념* 이 애니메이션에 시각적으로 등장하는가?

- **Burnside 예시**: wiki 는 "4구슬 목걸이, 4 회전 변환, 각 회전마다 |Fix(g)| 계산" 을 설명. 애니메이션이 목걸이/구슬/회전 중 어느 것도 그리지 않으면 → **FAIL**.

#### Criterion B: 알고리즘 동작 표현

알고리즘이 *단계적으로 진행되는 과정* 이 시각화에 반영되는가?

- 정적인 결과만 보여주고 *과정* 이 없으면 → **NEEDS_REVISION**.
- 예: 정렬 알고리즘인데 swap 이 보이지 않음, BFS 인데 방문 순서 색칠이 없음.

#### Criterion C: text vs visual 비율

text content tracks 가 *해야 할 일* 을 설명하는데 정작 element 들은 변화 없음 → text-on-empty-canvas anti-pattern.

- text 가 "이제 90도 회전" 라고 적혀 있지만 화면에는 아무 회전도 일어나지 않음 → **NEEDS_REVISION**.

#### Criterion D: chapter 단위 충실성

각 chapter 시간대에 *실제로 element 가 등장 / 변경 / 강조* 되는가?

- chapter 시점에 element 의 `appearances` 시작 또는 track keyframe / effect 가 있어야 함.
- chapter label 만 있고 아무 일도 안 일어나는 시간대 → **NEEDS_REVISION**.

### Stage 3: 판정

위 4 criterion 종합.

| Verdict | 조건 |
|:---|:---|
| **PASS** | 4 criterion 모두 만족 |
| **NEEDS_REVISION** | criterion B, C, D 중 하나 이상 미달 (재구성 필요) |
| **FAIL** | criterion A 미달 (개념이 아예 시각화되지 않음, 완전 재작성 필요) |

## Output format (agent)

agent 는 각 애니메이션에 대해 한 줄 요약 + 1-2 줄 근거를 다음 형식으로 출력.

```
- <slug>.json | <PASS|NEEDS_REVISION|FAIL>
  reason: <2~3 줄로 구체 근거>
  missing: [<key concept 1>, <key concept 2>, ...]   # FAIL/NEEDS_REVISION 시에만
```

예시 (burnside):
```
- burnside.json | FAIL
  reason: wiki는 4구슬 목걸이 + 4회전 변환 + |Fix(g)| 계산을 설명하지만, 
          애니메이션에는 배경 박스 2개와 텍스트 4개만 있다. 목걸이 / 구슬 / 
          회전 / fixed configuration 중 어느 것도 시각화되지 않음.
  missing: [necklace circle, 4 bead circles, rotation animation, Fix(g) enumeration]
```

## 검수 대상 우선순위

Stage 1 자동 flag 결과:
1. **SCAFFOLD_ONLY** (가장 심각) - 우선 검수
2. **TOO_FEW_ELEMENTS** AND `SCAFFOLD_ONLY` 아님
3. **STATIC**
4. 나머지 (자동 PASS, sample 만 spot-check)

## 사후 처리

- **FAIL**: animation 재생성 필요 (별도 작업으로 batch)
- **NEEDS_REVISION**: 기존 구조 유지 + 시각화 element 추가 (별도 작업)
- **PASS**: 그대로 유지

## 검수 절차 (오퍼레이터)

1. `python3 scripts/score-animations.py --report` → flag 된 애니메이션 목록
2. 8-10 개 parallel agent 발사 → 각 agent 가 15-20 개 검수 → 한 줄 verdict + 근거
3. 결과 aggregate → `.private/animation-inspection-report.md` 생성
4. (선택) FAIL 항목 재생성 batch
