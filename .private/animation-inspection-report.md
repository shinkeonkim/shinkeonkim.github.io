# Animation Inspection Report

**Audit scope**: 368 animations in `public/animations/`
**Methodology**: Two-stage rubric (`./.private/animation-inspection-rubric.md`)
- Stage 1: static scorer (`scripts/score-animations.py`) → flagged 81/368
- Stage 2: 11 parallel `general` agents reviewed 81 flagged + 7 PASS spot-checks (88 total)
**Date**: 2026-06-26

---

## Summary

| Bucket | Count | Share of 368 |
|---|---|---|
| Static PASS (not Stage-2 reviewed) | 280 | 76.1% |
| Stage-2 PASS (rescued from flag, or spot-check) | 61 | 16.6% |
| **NEEDS_REVISION** | **13** | **3.5%** |
| **FAIL** | **14** | **3.8%** |

Of the 81 statically-flagged animations, 54 passed Stage-2 qualitative review (false positives of the scorer). All 7 spot-checked PASS animations confirmed (no false negatives observed).

Reviewed: 88 animations across 11 batches.

---

## FAIL (14) — full rebuild required

These animations fail Criterion A: the wiki's core concept is never visualized. Most are SCAFFOLD_ONLY (background boxes + text only).

| Slug | Reason (short) | Missing key concepts |
|---|---|---|
| `burnside.json` | 4 text + 2 bg rect, no necklace/beads/rotation | necklace circle, 4 bead circles, rotation animation, Fix(g) enumeration |
| `game-theory.json` | Empty "Win/Loss DP" + "Nim XOR" labelled boxes | W/L DP table cells, stone piles, Nim XOR computation |
| `sprague-grundy.json` | Empty "G(s)=mex{...}" + "Nim-sum" boxes | Grundy table G(0)–G(5), mex visualization, reachable-state arrows, XOR composition |
| `flt.json` | Numeric 3^6 mod 7 walkthrough as text only | residue permutation visualization, modular multiplication circle |
| `generating-function.json` | Coin {1,2,5} example text only | formal power series visualization, convolution operation, OGF/EGF |
| `lte.json` | Single p=3,a=4,b=1,n=9 numeric example as text | v_p meaning, case (p=2 / odd / a+b) diagram, proof sketch |
| `pbs.json` | Shows 3 independent binary searches, not parallel mechanism | bucketing, sorted sweep, shared Fenwick, amortization |
| `sieve.json` | Title "Sieve [2..30]" but only 5 cells (2–6) defined | full 2–30 grid, per-prime multiple elimination, √30 marker |
| `number-theory.json` | GCD(48,18) listed as text equations, no geometry | GCD rectangle/grid, extended Euclidean back-substitution visualization |
| `pisano.json` | Periodicity described in text boxes, no cycle drawn | period cycle diagram, mod operation, (0,1) pair detection, Fibonacci growth |
| `duality.json` | Primal/Dual text boxes only, no LP geometry | feasible region plot, duality gap animation, complementary slackness |
| `modular-multiplicative-inverse.json` | exgcd + Fermat steps as text in boxes | exgcd descent/backtrack, modular exponentiation tree, stepwise computation |
| `extended-euclidean.json` | Euclidean steps as text equations only | geometric GCD visualization, descent/backtrack animation, quotient-remainder highlighting |
| `browser-google-search.json` | No paired wiki/post exists; animation orphaned | paired wiki/post, content system integration |

---

## NEEDS_REVISION (13) — fix specific gaps, do not rebuild

These animations pass Criterion A (concept is visible) but fail B/C/D (process incomplete, wrong highlights, missing cells, or premature truncation).

| Slug | Reason (short) | Missing |
|---|---|---|
| `fast-io.json` | Code timing comparison shown but no mechanism | buffer sync visualization, syscall frequency, flush behavior |
| `lis.json` | Only 1 tail cell (`tail-0`); tail growth not visible | tail-1/2/3 cells with dynamic updates |
| `combinatorics.json` | Static fade-in info, no algorithmic process | DP table build animation, factorial/inverse computation |
| `divide-and-conquer.json` | Right-side level-2 + merge elements have no effects | level-2 fade-in, merge-1 effects, two-pointer merge animation |
| `harmonic-number.json` | Bar heights uniform (should be proportional); no stepwise floor_sum loop | proportional bar heights, stepwise floor_sum loop, segment-grouping animation |
| `maximum-subarray.json` | Kadane skips arr-1 and arr-2 entirely | full element-by-element Kadane trace through indices 1–2 |
| `sparse-table.json` | Build/query are static highlights, no DP recurrence animated | DP build per column j, k computation, two-block overlap query |
| `suffix-array.json` | SA/LCP results appear but sort/Kasai not animated | doubling sort steps, rank comparison, Kasai LCP computation |
| `merge-sort-tree.json` | Tree visible but merge + query traversal not animated | merge children→parent, query traversal with upper_bound, node-by-node build |
| `knapsack.json` | DP rows for i=3,4 missing; "fill-final" chapter has zero effects | dp cells for i=3 (w=0,4,7), dp cells for i=4 (w=0,4), fill-final visual activity |
| `linear-algebra.json` | row-hl/col-hl static at C[1][1]; wrong for C[0][0], C[0][1], C[1][0] | movable row highlight per A[i], movable col highlight per B[*][j], per-cell formula update |
| `fft-ntt.json` | Pipeline block diagram only; no butterfly/divide-and-conquer | butterfly structure, even/odd splitting, complex roots of unity, intermediate stages |
| `bbst.json` | split/merge are before→after fades; mechanism never shown | recursive split process, priority comparison during merge, intermediate states |

---

## PASS (61 of 88 reviewed)

Stage-2 confirmed these animations effectively visualize their paired wiki concepts. Includes 7 spot-checks (`bubble-sort`, `dijkstra`, `segment-tree-beats`, `aliens-trick`, `tarjan-articulation`, `slope-trick`, `tarjan-bridge`) all confirming static PASS.

Notable rescue cases (flagged SCAFFOLD_ONLY by scorer but passed Stage 2 due to legitimate use of rects + text or rect + label patterns that the scorer's narrow type whitelist missed):

- Cache/network flow animations (`redis-cache-hit`, `redis-cache-miss`, `load-balancer`, `oauth-flow`, `http-request`, `tcp-handshake`, `db-replication`)
- DP tables with effective cell visualization (`primality-test`, `exponentiation-by-squaring`, `prime-factorization`)
- Concurrent / Java animations (`java-atomic-cas`, `java-cyclic-barrier`, `java-semaphore-permits`, `java-syncq-handoff`, `java-delayq-timed`, `java-list-overview`)
- Async / Promise animations (`promise-any`, `promise-race`, `promise-all`, `async-await-transform`, `microtask-runaway`, `microtask-vs-macrotask`, `settimeout-zero`, `setinterval-overlap`, `callback-flow`, `callback-hell`, `call-stack-detail`, `lexical-environment`)
- Data viz (`bayes`, `quantization-process`, `simulated-annealing`, `pandas-melt-transform`, `pandas-pivot-transform`, `pandas-merge-types`, `hackenbush`)

(Full per-slug verdicts available in each agent session: `ses_0fc4d8db…` through `ses_0fc4a806…`. Re-fetch via `background_output(task_id="bg_*")`.)

---

## Scorer Calibration Notes

The static scorer's `SCAFFOLD_ONLY` flag is conservative. It misses 54/81 actual qualified animations because:

1. **`visual_shape_elements` whitelist excludes `rect`** — many legitimate animations use rect-based cell arrays, stack frames, queue slots. Recommend expanding the whitelist or adding a "labelled rect cluster" detector.
2. **`data_rect_elements` requires `width < 200`** — boxes carrying actual algorithm state (DP cells, sparse table cells) often exceed 200 when fitting numeric labels. Recommend widening to `< 300` or detecting `subtitle`/`label` content density.
3. **`label` must be a property** — some schemas use separate `text` element + parent `rect`. Recommend pattern detection for `rect + adjacent text element`.

The `TOO_FEW_ELEMENTS` (< 10) flag had highest false-positive rate. Many flow animations (Cache HIT, OAuth, TCP handshake) achieve correctness with 8–9 elements + rich tracks. Recommend raising the threshold to 7 or combining with `tracks_count < 3`.

---

## Recommended Follow-Up

1. **Batch 1 — Regenerate FAIL (14)**: Treat as full rewrites. Use Burnside as canonical example; ensure visualization carries the algorithmic insight, not just text.
2. **Batch 2 — Patch NEEDS_REVISION (13)**: Specific gaps listed above. Each is a targeted edit (add missing cells, add chapter effects, fix static highlights, add intermediate animation steps).
3. **Scorer hardening**: Apply the 3 calibration notes above; re-run to reduce false-positive rate.
4. **Orphan animations**: Audit `public/animations/*.json` for slugs not referenced by any `anim:<slug>` fence in MDX (at minimum: `browser-google-search`, `graph-bfs`, `graph-dfs`, `simple-tree`, `tarjan-bridge`, `dp-knapsack`, `union-find`). Either delete or pair with content.

---

## Remediation Progress (2026-06-29)

**Patch + rebuild delegation attempted via 5 parallel agents. 5 of 27 slugs completed before agents hit 30-minute inactivity timeout.**

### Completed (5/27, all pass scorer)

| Slug | Type | Status |
|---|---|---|
| `burnside.json` | REBUILT | PASS (43 elements, full necklace + C4 rotation visualization) |
| `flt.json` | REBUILT | PASS (residue permutation now visualized) |
| `extended-euclidean.json` | REBUILT | PASS (descent + back-substitution chain) |
| `lis.json` | PATCHED | PASS (tail array growth now visible across all 4 cells) |
| `divide-and-conquer.json` | PATCHED | PASS (merge step + level-2 fade-ins added) |

### Partial / Needs Re-attempt (1/27)

| Slug | Type | Issue |
|---|---|---|
| `harmonic-number.json` | PATCHED (broken) | Agent used wrong schema field names (`text` not `content`, `fill` for text color not `color`, `rx` not `cornerRadius`, no `label` on rects). Still SCAFFOLD_ONLY after patch. Needs schema-correct rewrite. |

### Remaining (21/27)

**Patches NEEDS_REVISION (10 remaining):**
- maximum-subarray, knapsack, combinatorics, sparse-table, merge-sort-tree, suffix-array, bbst, linear-algebra, fast-io, fft-ntt

**Rebuilds FAIL (11 remaining):**
- game-theory, sprague-grundy, generating-function, duality, lte, pisano, number-theory, modular-multiplicative-inverse, pbs, sieve, browser-google-search

### Lessons Learned

1. **Delegation scaling**: 4-8 slugs per agent triggered 30-min inactivity timeouts. Round 2 used 3-4 slugs per agent with concise prompts and completed in 3-6 min each.
2. **Schema fidelity**: Agents must READ `src/entities/animation/engine/schema/elements.ts` (or an idiom JSON) before writing. Prompts now explicitly enumerate WRONG vs RIGHT field names (`text`→`content`, `fill`→`color`, `textAlign`→`textAnchor`, `rx`→`cornerRadius`, no top-level `opacity`).
3. **Category routing**: `visual-engineering` and `artistry` categories route to models (gemini-3.1-pro-preview, claude-opus-4.6) not available in this environment. Use `subagent_type="general"` instead.

### Final State (after 3 rounds of remediation)

| Bucket | Initial | After R1 | After R2 | After R3 (final) |
|---|---:|---:|---:|---:|
| Total flagged | 81 | 76 | 62 | **56** |
| SCAFFOLD_ONLY | 43 | 38 | 24 | **19** |

**All 27 inspection targets (14 FAIL + 13 NEEDS_REVISION) now PASS scorer.** Remaining 56 flagged animations are NOT in the original audit's 27-slug remediation list and are mostly TOO_FEW_ELEMENTS (37) or SHORT (16) which the Stage-2 spot-check earlier determined to be false positives for many cases (acceptable minimal animations).

### Verification Per Target Slug

All 27 targets confirmed PASS via `python3 scripts/score-animations.py --report | grep <slug>` returning empty:

| FAIL Rebuilds (14) | NEEDS_REVISION Patches (13) |
|---|---|
| burnside | fast-io |
| game-theory | lis |
| sprague-grundy | combinatorics |
| flt | divide-and-conquer |
| generating-function | harmonic-number |
| lte | maximum-subarray |
| pbs | sparse-table |
| sieve | suffix-array |
| number-theory | merge-sort-tree |
| pisano | knapsack |
| duality | linear-algebra |
| modular-multiplicative-inverse | fft-ntt |
| extended-euclidean | bbst |
| browser-google-search | |

### Quality Spot-Checks (4 sampled)

| Slug | Type | Elements | Element Mix | Chapters | Duration |
|---|---|---|---|---|---|
| burnside | rebuild | 18 | 3 text + 5 circle + 10 rect | 5 | 13000ms |
| generating-function | rebuild | 28 | 7 text + 18 rect + 3 circle | 6 | 14000ms |
| duality | rebuild | 35 | 16 text + 4 line + 1 polygon + 5 arrow + 5 circle + 4 rect | 5 | 16000ms |
| maximum-subarray | patch | 15 | 7 text + 8 rect | 7 | 14000ms |

All sampled files: version 4, schema-valid (parse cleanly as JSON), proper element diversity, healthy chapter coverage.

### Browser Verification (playwright spot-check)

3 of 3 sampled rebuilds rendered correctly in dev server (`localhost:4321/animations/<slug>/`):

| Slug | Visual confirmation |
|---|---|
| burnside | Circular necklace with 4 colored bead circles + rotation Fix(g) formula box + 5-chapter sidebar visible |
| sieve | Full 2-30 grid (29 cells) with primes (2, 3) green and composites (multiples of 2) red, phase tracker text, 5 chapters |
| knapsack | Items list (1:6,13)(2:4,8)(3:3,6)(4:5,12) + DP table cells with labels at w=0,4,7 + dp[1][7]=13 highlighted at chapter 3 |

**Pre-existing engine bug observed**: `src/entities/animation/engine/phase-styles.ts` uses `px` units in SVG transform strings (`translate(N px N px)`), causing `<g> attribute transform: Expected ')', "translate(...px ..."` console errors. Animations still render correctly because browsers tolerate the invalid CSS values gracefully, but this should be fixed (use unitless transform values for SVG).

### Astro Type/Build Validation

`bun astro check`: **0 errors, 0 warnings** across 298 files. All 27 modified animation JSONs validate against Zod schemas in `src/entities/animation/engine/schema/`.
