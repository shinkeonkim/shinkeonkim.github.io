# Wiki Agent Shared Instructions

## Project
- **Path**: `/Users/koa/004-Projects/0001-Resume/100-github-io`
- **Stack**: Astro + MDX. Wiki collection at `src/content/wiki/<category>/`.
- **Existing examples (READ FIRST)**: 
  - `src/content/wiki/algorithm/bubble-sort.mdx` (130 lines, structure template)
  - `src/content/wiki/algorithm/merge-sort.mdx` (209 lines, deep structure)
  - `src/content/wiki/algorithm/sorting-algorithm.mdx` (111 lines, overview style)
  - `src/content/wiki/sql/sql-join.mdx` (uses CodeWithOutput, references block)

## Frontmatter Schema (REQUIRED)

```yaml
---
title: "<English-first, Korean optional>"
aliases: ["alias1", "한글별칭", "...]
tags: [algorithm, <subcategory>, ...]
updated: 2026-06-23
references:
  - id: unknown-to-wellknown
    note: "<which section in U2W>"
  - id: koosaga-blog
    note: "<post URL or title>"
  - title: "<inline ref>"
    url: "<URL>"
    author: "<author>"
---
```

- **Already-existing source IDs** (use `id:` reference):
  - `unknown-to-wellknown`
  - `koosaga-blog`
  - `infossm-blog`
  - `jhnah917-blog`
- **Other authors** (jwvg0425, rkm0959, ainta, ahgus89, ho94949, hyperbolic, cubelover, evenharder, yclock, errichto, snowflake, jinhan814, mhy908, Baba, gina0605, imeimi, Karuna, Alessio Piergiacomi, robert1003, mango_lassi, miaowtin, errorgorn, namnamseo, cgiosy, Spheniscine, ATSTNG, upobir, lobo_prix, myungwoo, etc.) → use inline `{title, url, author}` format.

## Writing Rules (NON-NEGOTIABLE)

1. **Korean prose**, similar tone to `bubble-sort.mdx`.
2. **NO em-dash** (U+2014, the long horizontal bar). Use `:`, `,`, `/`, `-` (ASCII hyphen) instead. Build LINT will REJECT it.
3. **Wiki links** (internal cross-refs): `[[페이지명]]` or `[[페이지명|보여줄 텍스트]]`.
4. **Target length**: 60-150 lines of content.
5. **Required sections** (adapt to topic):
   - `## 정의` (Definition - 2-4 lines: what is this, who invented)
   - `## 핵심 아이디어` or `## 동작 원리` (Core idea / How it works - the meat)
   - `## 알고리즘` or `## 구현 개요` (Algorithm sketch with pseudocode in ```text fence)
   - `## 복잡도` (Complexity - markdown table)
   - `## 변형 / 활용 / 예시 문제 유형` (Optional - what variants exist, where used)
   - `## 함정 / 주의` (Optional - common pitfalls)
   - `## BOJ 연습 문제` (Practice problems table - REQUIRED if topic has BOJ problems listed)
   - `## 다른 출처 연습 문제` (Optional - Library Checker, Codeforces, AtCoder, LibreOJ - if applicable)
   - `## 참고` (References - bulleted list of related wiki pages + author links)

## BOJ Practice Problems Table

For EACH BOJ problem in the topic's list, you MUST fetch metadata from kokoa-lab:

**URL pattern**:
```
https://raw.githubusercontent.com/kokoa-lab/boj-problems/main/organize_problems/<BUCKET>/<ID>/problem.md
```

**BUCKET formula**: `floor((id-1)/100)*100+1`-`floor((id-1)/100)*100+100`... actually simpler: take id, replace last 2 digits with 00-99. 
- id=12916 → bucket `12900-12999`
- id=1763 → bucket `1700-1799`
- id=27071 → bucket `27000-27099`
- id=2844 → bucket `2800-2899`
- id=21973 → bucket `21900-21999`

From the YAML frontmatter parse `title` and `acceptance_rate`. Render:

```markdown
| 번호 | 제목 | 정답률 | 링크 |
|:---|:---|---:|:---|
| BOJ 12916 | K-Path | 43.3% | [kokoa-lab](https://github.com/kokoa-lab/boj-problems/tree/main/organize_problems/12900-12999/12916) |
```

If fetch fails (404 / network error), still include the row with `(수집 안 됨)` for title and `-` for 정답률, but keep the kokoa-lab link.

## Non-BOJ Practice Problems

For Library Checker, Codeforces, AtCoder, LibreOJ - use a separate table:

```markdown
## 다른 출처 연습 문제

| 출처 | 제목 | 링크 |
|:---|:---|:---|
| Library Checker | Find Linear Recurrence | https://judge.yosupo.jp/problem/find_linear_recurrence |
| Codeforces | Edu Round 79 F | https://codeforces.com/contest/1279/problem/F |
```

## Output

- Write files DIRECTLY to disk via Write tool.
- Output paths are given in your topic block.
- Return: list of (file_path, line_count, BOJ fetch successes/failures count).

## Quality Bar

- Each wiki entry stands on its own (someone learning the topic can grasp the gist).
- Use markdown tables for complexity / comparison.
- Use ```text fenced blocks for pseudocode.
- DO NOT invent algorithm details if uncertain. Stick to what's well-documented in the references.
- Cross-reference related wiki pages with `[[wikilink]]` (other U2W topics, existing algorithm pages).
