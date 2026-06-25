# Wiki Enhancement Instructions (Round 2)

## Goal

Enhance the existing 42 wiki entries written for Unknown-To-Wellknown topics. Add depth to match the user's three requirements:

1. **Real working algorithm code** (C++, the PS standard). Must be syntactically correct and reflect the algorithm's actual time complexity.
2. **Animation hook**: insert ` ```anim:<slug> {} ``` ` placeholder near the algorithm section. JSON content can be filled later.
3. **Deepened problem context and idea**: explain *what problem the algorithm solves*, *what naive solution fails*, and *what insight makes the algorithm work*.

## Project

- Path: `/Users/koa/004-Projects/0001-Resume/100-github-io`
- Wiki collection: `src/content/wiki/algorithm/<sub>/*.mdx`
- Build: `bun astro check`, `bun run lint:no-em-dash`

## Hard rules (DO NOT VIOLATE)

1. **PRESERVE everything that already exists** in the file. Frontmatter, BOJ problem tables, 참고 section, wikilinks: all must remain unchanged unless explicitly enhancing.
2. **No em-dash** (U+2014). Lint rejects. Use `,`, `:`, `/`, `-` (ASCII hyphen) instead.
3. **Korean prose**, same tone as `src/content/wiki/algorithm/bubble-sort.mdx` and `merge-sort.mdx`.
4. **Wikilinks** for internal references: `[[Page Name]]`.
5. **NO HALLUCINATION**: if you are not confident about a code detail or algorithm step, prefer pseudocode in ` ```text ` fence over invented C++. Better to be honest than wrong.

## What to ADD

### A. Animation placeholder

Insert near the algorithm section (`## 알고리즘` or `## 핵심 아이디어`):

```
## 시각화

` ``anim:<file-slug>
{}
` ``
```

`<file-slug>` = the file name without `.mdx`. Example: file `slope-trick.mdx` -> `anim:slope-trick`.

### B. Strengthened "문제 상황과 동기" or similar section

If the file does NOT already have a strong motivation section, add one near the top (right after `## 정의`):

```
## 문제 상황과 동기

(2-4 paragraphs covering)
- What problem do we want to solve?
- What does the naive approach look like and why is it not enough? (give concrete bound)
- What is the key insight that allows speedup? (one-sentence idea)
- Where does this commonly show up in practice / PS?
```

If a comparable section already exists, simply enhance it with concrete bounds and the insight statement.

### C. Real C++ implementation

Add a `## 구현` section (or extend an existing `## 알고리즘`) with a **C++ implementation** that compiles. Use ` ```cpp ` fence. Include:

- `#include`s
- Function signature
- Realistic data types (int, long long, vector, etc.)
- Brief inline comments (Korean OK)
- A line or two at the top declaring the time/space complexity it achieves

Example:

```cpp
// O(N log N), O(N) memory. (n^2 보다 빠른 분할정복 정렬)
#include <vector>
void merge_sort(std::vector<int>& a, int lo, int hi) {
    if (hi - lo <= 1) return;
    int mid = (lo + hi) / 2;
    merge_sort(a, lo, mid);
    merge_sort(a, mid, hi);
    // ... merge step
}
```

**Verify mentally that the code is correct.** If unsure, fall back to ` ```text ` pseudocode rather than wrong C++.

### D. Deepened "핵심 아이디어" / "알고리즘" sections

Don't just describe symbols. Walk the reader through:

- The *invariant* the algorithm maintains
- The *amortization or potential function* if applicable
- *Why the bound holds* (1-2 sentences)
- A short *step trace* on a tiny example using ` ```text ` ASCII art if natural

### E. Implementation tips (optional)

For algorithms with infamous pitfalls (like LCT's `access`, blossom expansion), add a short `### 구현 팁` block listing the 2-3 most common bugs to watch for.

## What to KEEP unchanged

- `---` frontmatter (title, aliases, tags, updated, references)
- `## BOJ 연습 문제` table and `## 다른 출처 연습 문제` table
- `## 참고` section
- All existing `[[wikilinks]]` (keep them, add more if helpful)

## Length budget

Target each file to grow from ~100 lines to **180-280 lines**. Do not balloon beyond 350 lines.

## Verification before writing

1. Re-read the file you produced and ask: does it still match the project tone?
2. Search for em-dash (U+2014 long horizontal bar character) and remove.
3. Make sure all section ordering still makes sense.

## Reporting back

When done with your batch:

```
File 1: path -> X lines, added: [code, animation, problem-section, step-trace]
File 2: ...
```

NO file contents in your reply. Just paths and one-line per change.
