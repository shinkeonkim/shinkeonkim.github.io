# Wiki Mass Buildout - Progress Tracking

> 모든 작업의 단일 진행 상태 문서. Session 마다 한 줄씩 업데이트.
> 규칙은 [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) 참고.

## Summary

| Phase | 토픽 수 | 완료 | 남음 |
|:---|---:|---:|---:|
| **A** Foundational | 30 | 30 ✓ | 0 |
| **B** CS Standard | 54 | 54 ✓ | 0 |
| **C** Intermediate | 72 | 72 ✓ | 0 |
| **D** Advanced + 이미 작성 | 72 | 72 ✓ | 0 |
| **Total** | **228** | **228 ✓** | **0** |

(2026-06-24 완료: Phase A/B/C/D 모두 완료. 총 228개 solved.ac 태그 wiki 문서 작성.)

진행 상태 마크: `[ ]` TODO, `[~]` IN_PROGRESS, `[x]` DONE, `[-]` SKIP (관련 토픽으로 이미 충분히 커버)

---

## Phase A: Foundational (30)

가장 기본. 모든 CS / PS 가 이걸 위에 쌓인다.

### A.1 수와 식

- [x] **math** (수학) -> `algorithm/foundation/math.mdx`
- [x] **arithmetic** (사칙연산) -> `algorithm/foundation/arithmetic.mdx`
- [x] **implementation** (구현) -> `algorithm/foundation/implementation.mdx`
- [x] **ad_hoc** (애드 혹) -> `algorithm/foundation/ad-hoc.mdx`
- [x] **constructive** (해 구성하기) -> `algorithm/foundation/constructive.mdx`
- [x] **case_work** (많은 조건 분기) -> `algorithm/foundation/case-work.mdx`

### A.2 무차별 / 시뮬레이션

- [x] **bruteforcing** (브루트포스) -> `algorithm/foundation/bruteforcing.mdx` + `public/animations/bruteforcing.json`
- [x] **simulation** (시뮬레이션) -> `algorithm/foundation/simulation.mdx` + `public/animations/simulation.json`
- [x] **recursion** (재귀) -> `algorithm/foundation/recursion.mdx` + `public/animations/recursion.json`
- [x] **backtracking** (백트래킹) -> `algorithm/foundation/backtracking.mdx`

### A.3 정렬 / 탐색

- [x] **sorting** (정렬) -> `algorithm/sorting-algorithm.mdx` (이미 완료)
- [x] **binary_search** (이분 탐색) -> `algorithm/search/binary-search.mdx` (\uc560\ub2c8\uba54\uc774\uc158: \uae30\uc874 binary-search.json \uc7ac\uc0ac\uc6a9)
- [x] **parametric_search** (매개 변수 탐색) -> `algorithm/search/parametric-search.mdx`
- [x] **ternary_search** (삼분 탐색) -> `algorithm/search/ternary-search.mdx`

### A.4 그리디 / 누적 / 슬라이딩

- [x] **greedy** (그리디 알고리즘) -> `algorithm/foundation/greedy.mdx`
- [x] **prefix_sum** (누적 합) -> `algorithm/foundation/prefix-sum.mdx` + `public/animations/prefix-sum.json`
- [x] **difference_array** (차분 배열 트릭) -> `algorithm/foundation/difference-array.mdx`
- [x] **two_pointer** (두 포인터) -> `algorithm/foundation/two-pointer.mdx` + `public/animations/two-pointer.json`
- [x] **sliding_window** (슬라이딩 윈도우) -> `algorithm/foundation/sliding-window.mdx`
- [x] **sweeping** (스위핑) -> `algorithm/foundation/sweeping.mdx`

### A.5 기본 자료구조

- [x] **stack** (스택) -> `algorithm/data-structure/stack.mdx`
- [x] **queue** (큐) -> `algorithm/data-structure/queue.mdx`
- [x] **deque** (덱) -> `algorithm/data-structure/deque.mdx`
- [x] **priority_queue** (우선순위 큐) -> `algorithm/data-structure/priority-queue.mdx`
- [x] **linked_list** (연결 리스트) -> `algorithm/data-structure/linked-list.mdx`
- [x] **set** (집합과 맵) -> `algorithm/data-structure/set.mdx` + `public/animations/set.json`
- [x] **hash_set** (해시를 사용한 집합과 맵) -> `algorithm/data-structure/hash-set.mdx` + `public/animations/hash-set.json`
- [x] **tree_set** (트리를 사용한 집합과 맵) -> `algorithm/data-structure/tree-set.mdx` + `public/animations/tree-set.json`

### A.6 비트 / 분기

- [x] **bitmask** (비트마스킹) -> `algorithm/foundation/bitmask.mdx`
- [x] **parity** (홀짝성) -> `algorithm/foundation/parity.mdx`

---

## Phase B: CS Standard (50)

표준 CS 커리큘럼에 들어가는 토픽들.

### B.1 그래프 탐색

- [x] **graph_traversal** (그래프 탐색) -> `algorithm/graph/graph-traversal.mdx`
- [x] **bfs** (너비 우선 탐색) -> `algorithm/graph/bfs.mdx`
- [x] **dfs** (깊이 우선 탐색) -> `algorithm/graph/dfs.mdx`
- [x] **0_1_bfs** (0-1 BFS) -> `algorithm/graph/0-1-bfs.mdx`
- [x] **flood_fill** (플러드 필) -> `algorithm/graph/flood-fill.mdx`
- [x] **grid_graph** (격자 그래프) -> `algorithm/graph/grid-graph.mdx`

### B.2 최단 경로 / 신장 트리

- [x] **shortest_path** (최단 경로) -> `algorithm/graph/shortest-path.mdx`
- [x] **dijkstra** (데이크스트라) -> `algorithm/graph/dijkstra.mdx`
- [x] **bellman_ford** (벨만-포드) -> `algorithm/graph/bellman-ford.mdx`
- [x] **floyd_warshall** (플로이드-워셜) -> `algorithm/graph/floyd-warshall.mdx`
- [x] **mst** (최소 스패닝 트리) -> `algorithm/graph/mst.mdx`
- [x] **disjoint_set** (분리 집합) -> `algorithm/data-structure/disjoint-set.mdx`

### B.3 그래프 응용

- [x] **topological_sorting** (위상 정렬) -> `algorithm/graph/topological-sorting.mdx`
- [x] **dag** (방향 비순환 그래프) -> `algorithm/graph/dag.mdx`
- [x] **scc** (강한 연결 요소) -> `algorithm/graph/scc.mdx`
- [x] **articulation** (단절점과 단절선) -> `algorithm/graph/articulation.mdx`
- [x] **bcc** (이중 연결 요소) -> `algorithm/graph/bcc.mdx`
- [x] **bipartite_graph** (이분 그래프) -> `algorithm/graph/bipartite-graph.mdx`
- [x] **bipartite_matching** (이분 매칭) -> `algorithm/graph/bipartite-matching.mdx`
- [x] **2_sat** (2-SAT) -> `algorithm/graph/2-sat.mdx`

### B.4 트리 기본

- [x] **trees** (트리) -> `algorithm/tree/trees.mdx`
- [x] **dp_tree** (트리 DP) -> `algorithm/tree/dp-tree.mdx`
- [x] **lca** (최소 공통 조상) -> `algorithm/tree/lca.mdx`
- [x] **tree_diameter** (트리의 지름) -> `algorithm/tree/tree-diameter.mdx`
- [x] **euler_tour_technique** (오일러 경로 테크닉) -> `algorithm/tree/euler-tour-technique.mdx`
- [x] **sparse_table** (희소 배열) -> `algorithm/data-structure/sparse-table.mdx`

### B.5 DP 기본 / 변형

- [x] **dp** (다이나믹 프로그래밍) -> `algorithm/dp/dp.mdx`
- [x] **knapsack** (배낭 문제) -> `algorithm/dp/knapsack.mdx`
- [x] **lis** (LIS) -> `algorithm/dp/lis.mdx`
- [x] **lcs** (LCS) -> `algorithm/dp/lcs.mdx`
- [x] **maximum_subarray** (최대 부분 배열) -> `algorithm/dp/maximum-subarray.mdx`
- [x] **dp_bitfield** (비트필드 DP) -> `algorithm/dp/dp-bitfield.mdx`
- [x] **dp_digit** (자릿수 DP) -> `algorithm/dp/dp-digit.mdx`

### B.6 분할 정복 / 거듭제곱

- [x] **divide_and_conquer** (분할 정복) -> `algorithm/divide/divide-and-conquer.mdx`
- [x] **exponentiation_by_squaring** (분할 정복 거듭제곱) -> `algorithm/divide/exponentiation-by-squaring.mdx`

### B.7 세그먼트 트리 가족

- [x] **segtree** (세그먼트 트리) -> `algorithm/data-structure/segtree.mdx`
- [x] **lazyprop** (느리게 갱신되는 세그먼트 트리) -> `algorithm/data-structure/lazyprop.mdx`

### B.8 문자열 알고리즘

- [x] **string** (문자열) -> `algorithm/string/string.mdx`
- [x] **kmp** (KMP) -> `algorithm/string/kmp.mdx`
- [x] **trie** (트라이) -> `algorithm/string/trie.mdx`
- [x] **hashing** (해싱) -> `algorithm/string/hashing.mdx`
- [x] **z** (Z) -> `algorithm/string/z.mdx`
- [x] **manacher** (매내처) -> `algorithm/string/manacher.mdx`
- [x] **rabin_karp** (라빈-카프) -> `algorithm/string/rabin-karp.mdx`

### B.9 정수론 기본

- [x] **number_theory** (정수론) -> `algorithm/math/number-theory.mdx`
- [x] **sieve** (에라토스테네스의 체) -> `algorithm/math/sieve.mdx`
- [x] **primality_test** (소수 판정) -> `algorithm/math/primality-test.mdx`
- [x] **prime_factorization** (소인수분해) -> `algorithm/math/prime-factorization.mdx`
- [x] **euclidean** (유클리드 호제법) -> `algorithm/math/euclidean.mdx`
- [x] **extended_euclidean** (확장 유클리드 호제법) -> `algorithm/math/extended-euclidean.mdx`
- [x] **modular_multiplicative_inverse** (모듈로 곱셈 역원) -> `algorithm/math/modular-multiplicative-inverse.mdx`

### B.10 조합 / 확률

- [x] **combinatorics** (조합론) -> `algorithm/math/combinatorics.mdx`
- [x] **probability** (확률론) -> `algorithm/math/probability.mdx`
- [x] **inclusion_and_exclusion** (포함 배제) -> `algorithm/math/inclusion-and-exclusion.mdx`

---

## Phase C: Intermediate (70)

ICPC / SCPC 정규 출제 토픽.

### C.1 자료구조 심화

- [x] **data_structures** (자료 구조 일반) -> `algorithm/data-structure/data-structures.mdx`
- [x] **multi_segtree** (다차원 세그먼트 트리) -> `algorithm/data-structure/multi-segtree.mdx`
- [x] **pst** (퍼시스턴트 세그먼트 트리) -> `algorithm/data-structure/pst.mdx`
- [x] **merge_sort_tree** (머지 소트 트리) -> `algorithm/data-structure/merge-sort-tree.mdx`
- [x] **cartesian_tree** (데카르트 트리) -> `algorithm/data-structure/cartesian-tree.mdx`
- [x] **li_chao_tree** (리-차오 트리) -> `algorithm/data-structure/li-chao-tree.mdx`
- [x] **rb_tree** (레드-블랙 트리) -> `algorithm/data-structure/rb-tree.mdx`
- [x] **rope** (로프) -> `algorithm/data-structure/rope.mdx`

### C.2 트리 심화

- [x] **hld** (Heavy-light 분할) -> `algorithm/tree/hld.mdx`
- [x] **centroid** (센트로이드) -> `algorithm/tree/centroid.mdx`
- [x] **centroid_decomposition** (센트로이드 분할) -> `algorithm/tree/centroid-decomposition.mdx`
- [x] **rerooting** (전방향 트리 DP) -> `algorithm/tree/rerooting.mdx`
- [x] **tree_isomorphism** (트리 동형 사상) -> `algorithm/tree/tree-isomorphism.mdx`
- [x] **smaller_to_larger** (small-to-large 합치기) -> `algorithm/tree/smaller-to-larger.mdx`
- [x] **eulerian_path** (오일러 경로) -> `algorithm/graph/eulerian-path.mdx`
- [x] **functional_graph** (함수형 그래프) -> `algorithm/graph/functional-graph.mdx`
- [x] **cactus** (선인장) -> `algorithm/graph/cactus.mdx`

### C.3 그래프 흐름

- [x] **flow** (최대 유량) -> `algorithm/graph/flow.mdx` *(\uace0\uae09 push-relabel \ub2e4\ub984)*
- [x] **mfmc** (Max-Flow Min-Cut) -> `algorithm/graph/mfmc.mdx`
- [x] **mcmf** (최소 비용 최대 유량) -> `algorithm/graph/mcmf.mdx`
- [x] **circulation** (서큘레이션) -> `algorithm/graph/circulation.mdx`
- [x] **hungarian** (헝가리안) -> `algorithm/graph/hungarian.mdx`
- [x] **hall** (홀의 결혼 정리) -> `algorithm/graph/hall.mdx`

### C.4 DP 심화

- [x] **dp_sum_over_subsets** (SOS DP) -> `algorithm/dp/dp-sum-over-subsets.mdx`
- [x] **dp_deque** (덱을 이용한 DP) -> `algorithm/dp/dp-deque.mdx`
- [x] **dp_connection_profile** (커넥션 프로파일 DP) -> `algorithm/dp/dp-connection-profile.mdx`
- [x] **deque_trick** (구간 최댓값 덱 트릭) -> `algorithm/dp/deque-trick.mdx`
- [x] **knuth** (크누스 최적화) -> `algorithm/dp/knuth.mdx`
- [x] **divide_and_conquer_optimization** (분할 정복 DP 최적화) -> `algorithm/dp/divide-and-conquer-optimization.mdx`
- [x] **monotone_queue_optimization** (단조 큐 최적화) -> `algorithm/dp/monotone-queue-optimization.mdx`
- [x] **cht** (Convex Hull Trick) -> `algorithm/dp/cht.mdx`

### C.5 정수론 / 수학 심화

- [x] **euler_phi** (오일러 피 함수) -> `algorithm/math/euler-phi.mdx`
- [x] **flt** (페르마의 소정리) -> `algorithm/math/flt.mdx`
- [x] **crt** (중국인의 나머지 정리) -> `algorithm/math/crt.mdx`
- [x] **lucas** (뤼카 정리) -> `algorithm/math/lucas.mdx`
- [x] **miller_rabin** (밀러-라빈) -> `algorithm/math/miller-rabin.mdx`
- [x] **pollard_rho** (폴라드 로) -> `algorithm/math/pollard-rho.mdx`
- [x] **discrete_log** (이산 로그) -> `algorithm/math/discrete-log.mdx`
- [x] **harmonic_number** (조화수) -> `algorithm/math/harmonic-number.mdx`
- [x] **pisano** (피사노 주기) -> `algorithm/math/pisano.mdx`
- [x] **lte** (지수승강 보조정리) -> `algorithm/math/lte.mdx`
- [x] **linear_algebra** (선형대수) -> `algorithm/math/linear-algebra.mdx`
- [x] **gaussian_elimination** (가우스 소거법) -> `algorithm/math/gaussian-elimination.mdx`
- [x] **xor_basis** (XOR 기저) -> `algorithm/math/xor-basis.mdx`
- [x] **calculus** (미적분학) -> `algorithm/math/calculus.mdx`
- [x] **numerical_analysis** (수치해석) -> `algorithm/math/numerical-analysis.mdx`
- [x] **linearity_of_expectation** (기댓값 선형성) -> `algorithm/math/linearity-of-expectation.mdx`
- [x] **pigeonhole_principle** (비둘기집 원리) -> `algorithm/math/pigeonhole-principle.mdx`
- [x] **statistics** (통계학) -> `algorithm/math/statistics.mdx`

### C.6 문자열 심화

- [x] **suffix_array** (접미사 배열) -> `algorithm/string/suffix-array.mdx`
- [x] **aho_corasick** (아호-코라식) -> `algorithm/string/aho-corasick.mdx`
- [x] **parsing** (파싱) -> `algorithm/string/parsing.mdx`
- [x] **regex** (정규 표현식) -> `algorithm/string/regex.mdx`
- [x] **utf8** (UTF-8 입력 처리) -> `algorithm/string/utf8.mdx`

### C.7 기하

- [x] **geometry** (기하학) -> `algorithm/geometry/geometry.mdx`
- [x] **geometry_3d** (3차원 기하학) -> `algorithm/geometry/geometry-3d.mdx`
- [x] **geometry_hyper** (4차원 이상 기하학) -> `algorithm/geometry/geometry-hyper.mdx`
- [x] **convex_hull** (볼록 껍질) -> `algorithm/geometry/convex-hull.mdx`
- [x] **rotating_calipers** (회전하는 캘리퍼스) -> `algorithm/geometry/rotating-calipers.mdx`
- [x] **half_plane_intersection** (반평면 교집합) -> `algorithm/geometry/half-plane-intersection.mdx`
- [x] **line_intersection** (선분 교차 판정) -> `algorithm/geometry/line-intersection.mdx`
- [x] **polygon_area** (다각형 넓이) -> `algorithm/geometry/polygon-area.mdx`
- [x] **point_in_convex_polygon** (볼록 다각형 내부의 점) -> `algorithm/geometry/point-in-convex-polygon.mdx`
- [x] **point_in_non_convex_polygon** (오목 다각형 내부의 점) -> `algorithm/geometry/point-in-non-convex-polygon.mdx`
- [x] **angle_sorting** (각도 정렬) -> `algorithm/geometry/angle-sorting.mdx`
- [x] **pythagoras** (피타고라스) -> `algorithm/geometry/pythagoras.mdx`
- [x] **pick** (픽의 정리) -> `algorithm/geometry/pick.mdx`
- [x] **min_enclosing_circle** (최소 외접원) -> `algorithm/geometry/min-enclosing-circle.mdx`
- [x] **geometric_boolean_operations** (도형 불 연산) -> `algorithm/geometry/geometric-boolean-operations.mdx`
- [x] **euler_characteristic** (오일러 지표) -> `algorithm/geometry/euler-characteristic.mdx`
- [x] **green** (그린 정리) -> `algorithm/geometry/green.mdx`
- [x] **planar_graph** (평면 그래프) -> `algorithm/geometry/planar-graph.mdx`

---

## Phase D: Advanced + Niche (79)

### D.1 이미 작성된 토픽 (30)

solved.ac 태그와 직접 매핑되는 기존 wiki:

- [x] **sorting** -> `algorithm/sorting-algorithm.mdx`
- [x] **fft** -> `algorithm/math/fft-ntt.mdx`
- [x] **berlekamp_massey** -> `algorithm/dp/berlekamp-massey.mdx`
- [x] **alien** (Aliens Trick) -> `algorithm/dp/aliens-trick.mdx`
- [x] **slope_trick** -> `algorithm/dp/slope-trick.mdx`
- [x] **beats** (Segment Tree Beats) -> `algorithm/data-structure/segment-tree-beats.mdx`
- [x] **kinetic_segtree** -> `algorithm/data-structure/kinetic-segment-tree.mdx`
- [x] **splay_tree** -> `algorithm/data-structure/bbst.mdx`
- [x] **link_cut_tree** -> `algorithm/data-structure/dynamic-tree.mdx`
- [x] **top_tree** -> `algorithm/data-structure/dynamic-tree.mdx` (\uacb9\uce58)
- [x] **dominator_tree** -> `algorithm/graph/dominator-tree.mdx`
- [x] **directed_mst** -> `algorithm/graph/directed-mst.mdx`
- [x] **dual_graph** -> `algorithm/graph/dual-of-planar-graph.mdx`
- [x] **offline_dynamic_connectivity** -> `algorithm/graph/offline-incremental-scc.mdx`
- [x] **chordal_graph** -> `algorithm/graph/chordal-graph.mdx`
- [x] **tree_decomposition** -> `algorithm/graph/tree-decomposition.mdx`
- [x] **treewidth** -> `algorithm/graph/tree-decomposition.mdx` (\uacb9\uce58)
- [x] **general_matching** -> `algorithm/graph/general-graph-matching.mdx`
- [x] **palindrome_tree** -> `algorithm/string/palindrome-tree.mdx`
- [x] **suffix_tree** -> `algorithm/string/suffix-automaton.mdx` (\uacb9\uce58)
- [x] **kitamasa** -> `algorithm/math/polynomial-division-kitamasa.mdx`
- [x] **multipoint_evaluation** -> `algorithm/math/multipoint-evaluation.mdx`
- [x] **polynomial_interpolation** -> `algorithm/math/polynomial-interpolation.mdx`
- [x] **generating_function** -> `algorithm/math/generating-function.mdx`
- [x] **mobius_inversion** -> `algorithm/math/mobius-function.mdx`
- [x] **matroid** -> `algorithm/math/matroid.mdx`
- [x] **lgv** -> `algorithm/math/lgv-theorem.mdx`
- [x] **voronoi** -> `algorithm/geometry/voronoi-diagram.mdx`
- [x] **delaunay** -> `algorithm/geometry/voronoi-diagram.mdx` (\uacb9\uce58)
- [x] **bulldozer** -> `algorithm/problem-type/bulldozer-trick.mdx`
- [x] **bitset** -> `algorithm/optimization/bitset-optimization.mdx`

### D.2 게임 이론 (5)

- [x] **game_theory** (게임 이론) -> `algorithm/game/game-theory.mdx`
- [x] **sprague_grundy** (스프라그-그런디) -> `algorithm/game/sprague-grundy.mdx`
- [x] **burnside** (번사이드 보조정리) -> `algorithm/game/burnside.mdx`
- [x] **hackenbush** (하켄부시) -> `algorithm/game/hackenbush.mdx`
- [x] **stable_marriage** (안정 결혼) -> `algorithm/game/stable-marriage.mdx`

### D.3 확률 / 통계 심화 (3)

- [x] **bayes** (베이즈 정리) -> `algorithm/math/bayes.mdx`
- [x] **birthday** (생일 문제) -> `algorithm/math/birthday.mdx`
- [x] **randomization** (무작위화) -> `algorithm/math/randomization.mdx`

### D.4 쿼리 / 오프라인 (8)

- [x] **offline_queries** (오프라인 쿼리) -> `algorithm/query/offline-queries.mdx`
- [x] **mo** (Mo's algorithm) -> `algorithm/query/mo.mdx`
- [x] **sqrt_decomposition** (제곱근 분할법) -> `algorithm/query/sqrt-decomposition.mdx`
- [x] **cdq** (CDQ 분할 정복) -> `algorithm/query/cdq.mdx`
- [x] **pbs** (병렬 이분 탐색) -> `algorithm/query/pbs.mdx`
- [x] **traceback** (역추적) -> `algorithm/query/traceback.mdx`
- [x] **coordinate_compression** (값/좌표 압축) -> `algorithm/query/coordinate-compression.mdx`
- [x] **precomputation** (런타임 전 전처리) -> `algorithm/query/precomputation.mdx`

### D.5 검색 / 최적화 (8)

- [x] **mitm** (중간에서 만나기) -> `algorithm/search/mitm.mdx`
- [x] **bidirectional_search** (양방향 탐색) -> `algorithm/search/bidirectional-search.mdx`
- [x] **a_star** (A*) -> `algorithm/search/a-star.mdx`
- [x] **dial** (다이얼) -> `algorithm/search/dial.mdx`
- [x] **tsp** (외판원 순회) -> `algorithm/optimization/tsp.mdx`
- [x] **heuristics** (휴리스틱) -> `algorithm/optimization/heuristics.mdx`
- [x] **simulated_annealing** (담금질) -> `algorithm/optimization/simulated-annealing.mdx`
- [x] **gradient_descent** (경사 하강법) -> `algorithm/optimization/gradient-descent.mdx`

### D.6 특수 / 응용 (12)

- [x] **arbitrary_precision** (큰 수 연산) -> `algorithm/math/arbitrary-precision.mdx`
- [x] **discrete_sqrt** (이산 제곱근) -> `algorithm/math/discrete-sqrt.mdx`
- [x] **discrete_kth_root** (이산 k제곱근) -> `algorithm/math/discrete-kth-root.mdx`
- [x] **floor_sum** (floor sum) -> `algorithm/math/floor-sum.mdx`
- [x] **linear_programming** (선형 계획법) -> `algorithm/math/linear-programming.mdx`
- [x] **duality** (쌍대성) -> `algorithm/math/duality.mdx`
- [x] **invariant** (불변량 찾기) -> `algorithm/foundation/invariant.mdx` + `public/animations/invariant.json`
- [x] **permutation_cycle_decomposition** (순열 사이클 분해) -> `algorithm/foundation/permutation-cycle-decomposition.mdx` + `public/animations/permutation-cycle-decomposition.json`
- [x] **degree_sequence** (차수열) -> `algorithm/graph/degree-sequence.mdx` + `public/animations/degree-sequence.json`
- [x] **majority_vote** (보이어-무어 다수결) -> `algorithm/foundation/majority-vote.mdx`
- [x] **physics** (물리학) -> `algorithm/math/physics.mdx`
- [x] **differential_cryptanalysis** (차분 공격) -> `algorithm/math/differential-cryptanalysis.mdx`

### D.7 트리 압축 / 응용 (3)

- [x] **tree_compression** (트리 압축) -> `algorithm/tree/tree-compression.mdx`
- [x] **stoer_wagner** (Stoer-Wagner 최소 컷) -> `algorithm/graph/stoer-wagner.mdx`
- [x] **knuth_x** (Knuth X 알고리즘) -> `algorithm/search/knuth-x.mdx`

### D.8 댄싱 링크 / 응용 (1)

- [x] **dancing_links** (춤추는 링크) -> `algorithm/search/dancing-links.mdx`

### D.9 LCS 최적화 (2)

- [x] **bitset_lcs** (비트셋 LCS) -> `algorithm/dp/bitset-lcs.mdx`
- [x] **hirschberg** (히르쉬버그) -> `algorithm/dp/hirschberg.mdx`

### D.10 이전에 작성된 추가 (custom)

이미 작성된 wiki 가 있지만 solved.ac 태그와 1:1 매칭은 아닌 것:

- [x] **bubble-sort, insertion-sort, selection-sort, quick-sort, merge-sort, heap-sort, external-merge-sort** -> `algorithm/*.mdx`
- [x] **stern-brocot-tree** -> `algorithm/data-structure/stern-brocot-tree.mdx`
- [x] **permutation-tree** -> `algorithm/data-structure/permutation-tree.mdx`
- [x] **suffix-automaton (SAM)** -> `algorithm/string/suffix-automaton.mdx`
- [x] **run-enumerate** -> `algorithm/string/run-enumerate.mdx`
- [x] **fwht** -> `algorithm/math/fwht.mdx`
- [x] **young-tableau** -> `algorithm/math/young-tableau.mdx`
- [x] **push-relabel** -> `algorithm/graph/push-relabel.mdx`
- [x] **minkowski-sum-dp, regions-trick, sqrt-query-bucket, segment-tree-graph, convex-tangent-optimization, tree-exchange-argument** -> `algorithm/problem-type/*.mdx`
- [x] **fast-io, simd, barrett-reduction** -> `algorithm/optimization/*.mdx`

---

## Session Log

각 세션 종료시 한 줄 추가. 형식: `YYYY-MM-DD | session-id | 진행한 토픽들 | 완료 상태`.

| 날짜 | Session 요약 | 진행 토픽 | 완료 |
|:---|:---|:---|:---|
| 2026-06-23 | Setup: INSTRUCTIONS + PROGRESS 문서화 | - | 31/229 (기존 작성된 토픽 인벤토리) |
| 2026-06-24 | Phase A 시작: binary_search + prefix_sum + two_pointer 3 토픽 (MDX + CodeWithOutput 3-lang + 애니메이션 2 신규 + 기존 1 재사용) | binary_search, prefix_sum, two_pointer | 34/229. NOTE: pre-existing `src/pages/search.astro` astro 에러 2 개 (untracked 파일, 본 작업과 무관) |
| 2026-06-24 | Phase A 완료: 26 토픽 추가 (8 parallel agent × 3 토픽 + 2 수동 bitmask/parity). 모두 MDX + 애니메이션 JSON. em-dash 린트 1135 파일 클린. | math, arithmetic, implementation, ad_hoc, constructive, case_work, bruteforcing, simulation, recursion, backtracking, parametric_search, ternary_search, greedy, difference_array, sliding_window, sweeping, stack, queue, deque, priority_queue, linked_list, set, hash_set, tree_set, bitmask, parity | 60/229 (Phase A 30/30 ✓) |
| 2026-06-24 | Phase B 완료: 54 토픽 (18 agent ROUND 1 실패 → 8 agent × 2 round 성공 + 수동 articulation.json). 그래프 탐색/최단경로/MST/트리/DP/문자열/정수론/조합론 표준 토픽. | graph_traversal, bfs, dfs, 0_1_bfs, flood_fill, grid_graph, shortest_path, dijkstra, bellman_ford, floyd_warshall, mst, disjoint_set, topological_sorting, dag, scc, articulation, bcc, bipartite_graph, bipartite_matching, 2_sat, trees, dp_tree, lca, tree_diameter, euler_tour_technique, sparse_table, dp, knapsack, lis, lcs, maximum_subarray, dp_bitfield, dp_digit, divide_and_conquer, exponentiation_by_squaring, segtree, lazyprop, string, kmp, trie, hashing, z, manacher, rabin_karp, number_theory, sieve, primality_test, prime_factorization, euclidean, extended_euclidean, modular_multiplicative_inverse, combinatorics, probability, inclusion_and_exclusion | 114/229 (Phase B 54/54 ✓) |
| 2026-06-24 | Phase C 완료: 72 토픽 (4 round × 6-8 agent + 수동 monotone_queue_optimization, cht). 자료구조 심화/트리 심화/그래프 흐름/DP 최적화/정수론 심화/문자열 심화/기하. | data_structures, multi_segtree, pst, merge_sort_tree, cartesian_tree, li_chao_tree, rb_tree, rope, hld, centroid, centroid_decomposition, rerooting, tree_isomorphism, smaller_to_larger, eulerian_path, functional_graph, cactus, flow, mfmc, mcmf, circulation, hungarian, hall, dp_sum_over_subsets, dp_deque, dp_connection_profile, deque_trick, knuth, divide_and_conquer_optimization, monotone_queue_optimization, cht, euler_phi, flt, crt, lucas, miller_rabin, pollard_rho, discrete_log, harmonic_number, pisano, lte, linear_algebra, gaussian_elimination, xor_basis, calculus, numerical_analysis, linearity_of_expectation, pigeonhole_principle, statistics, suffix_array, aho_corasick, parsing, regex, utf8, geometry, geometry_3d, geometry_hyper, convex_hull, rotating_calipers, half_plane_intersection, line_intersection, polygon_area, point_in_convex_polygon, point_in_non_convex_polygon, angle_sorting, pythagoras, pick, min_enclosing_circle, geometric_boolean_operations, euler_characteristic, green, planar_graph | 186/229 (Phase C 72/72 ✓) |
| 2026-06-24 | Phase D 완료: 42 토픽 (2 round × 6-8 agent). 게임 이론, 확률 심화, 쿼리/오프라인, 검색/최적화, 특수 응용. | game_theory, sprague_grundy, burnside, hackenbush, stable_marriage, bayes, birthday, randomization, offline_queries, mo, sqrt_decomposition, cdq, pbs, traceback, coordinate_compression, precomputation, mitm, bidirectional_search, a_star, dial, tsp, heuristics, simulated_annealing, gradient_descent, arbitrary_precision, discrete_sqrt, discrete_kth_root, floor_sum, linear_programming, duality, invariant, permutation_cycle_decomposition, degree_sequence, majority_vote, physics, differential_cryptanalysis, tree_compression, stoer_wagner, knuth_x, dancing_links, bitset_lcs, hirschberg | 228/228 ✓ COMPLETE. lint: 1483 파일 클린, astro: 0 errors |

---

## 다음 진행 (TODO)

1. **Phase A 시작**: 위 Phase A 의 `[ ]` 항목 중 처음부터 진행.
2. 각 토픽 완료 후:
   - PROGRESS.md 의 해당 항목 `[ ]` -> `[x]` 로 마크
   - Session Log 에 진행 내역 추가
3. Phase A 끝나면 Phase B, C, D 순서로.

## 우선순위 가이드 (Phase 내)

Phase A 내에서도 우선순위가 있다:
1. **가장 기초**: math, arithmetic, implementation, recursion
2. **자료구조**: stack, queue, deque, priority_queue, set, hash_set, tree_set
3. **탐색**: binary_search, parametric_search, ternary_search
4. **그리디 / 누적**: greedy, prefix_sum, difference_array, two_pointer, sliding_window, sweeping
5. **나머지**: bruteforcing, simulation, backtracking, bitmask, ad_hoc, constructive, case_work, parity, linked_list

Phase B 내에서:
1. **그래프 기초**: graph_traversal, bfs, dfs
2. **최단경로**: shortest_path, dijkstra, bellman_ford, floyd_warshall, mst, disjoint_set
3. **그래프 응용**: topological_sorting, dag, scc, articulation
4. **트리**: trees, dp_tree, lca, tree_diameter, euler_tour_technique, sparse_table
5. **DP**: dp, knapsack, lis, lcs
6. **자료구조**: segtree, lazyprop
7. **문자열**: string, kmp, trie, hashing
8. **정수론**: number_theory, sieve, euclidean
9. **나머지**: 위에 안 들어가는 것들

---

## Session Log

| Date | Completed Topics | Notes |
|:---|:---|:---|
| 2026-06-24 | bruteforcing, simulation, recursion | Phase A.2 (3/4 complete). MDX 각 150~280줄, JSON 각 50~80줄. 모든 validation 통과.
| 2026-06-24 | set, hash_set, tree_set | Phase A.5 (3/8 complete). 집합/맵 3종 (추상/해시/트리). 각 MDX 230~280줄, JSON 50~80줄. em-dash 0건, validation 통과.
| 2026-06-25 | functional_graph, cactus, dp_sum_over_subsets | Phase C.2 + C.4. 3 토픽 모두 기존 파일 존재 확인. 각 MDX 198~283줄, JSON 123~418줄. em-dash 기존 파일 1건 (zero-downtime-deployment, 본 작업 무관). PROGRESS 3건 [x] 마크.
| 2026-06-25 | linear_algebra, gaussian_elimination, xor_basis | Phase C.5. 3 토픽 신규 작성 (MDX + 애니메이션 JSON). linear-algebra.mdx 191줄, gaussian-elimination.mdx 177줄, xor-basis.mdx 188줄. JSON 각 62~64줄. validation 통과.
| 2026-06-25 | geometry_hyper, convex_hull, rotating_calipers | Phase C.7. 3 토픽 신규 작성. geometry-hyper.mdx 240줄, convex-hull.mdx 287줄, rotating-calipers.mdx 276줄. JSON 각 53/64/78줄. animation: 4D 초평면/tesseract, Andrew monotone chain 9점, rotating calipers 5점 hull. em-dash 0, JSON valid, astro check 0 errors. validation 통과.
| 2026-06-25 | birthday, randomization, offline_queries | Phase D.3 + D.4. 3 토픽 신규 작성. birthday.mdx, randomization.mdx, offline-queries.mdx. JSON 각 50~80줄. query 디렉토리 신규 생성. em-dash 0, JSON valid, astro check 0 errors. validation 통과.
| 2026-06-25 | mo, sqrt_decomposition, cdq | Phase D.4. 3 토픽 신규 작성. mo.mdx 194줄, sqrt-decomposition.mdx 177줄, cdq.mdx 226줄. JSON 각 74/76/73줄. em-dash 0, JSON valid, astro check 0 errors. validation 통과.
| 2026-06-25 | game_theory, sprague_grundy, burnside | Phase D.2. 3 토픽 신규 작성 (MDX + 애니메이션 JSON). game-theory.mdx 236줄, sprague-grundy.mdx 280줄, burnside.mdx 280줄. JSON 각 63/63/65줄. CodeWithOutput 3-lang (C++/Python/Java). em-dash 0, JSON valid. validation 통과.
| 2026-06-25 | pbs, traceback, coordinate_compression | Phase D.4. 3 토픽 신규 작성. pbs.mdx 206줄, traceback.mdx 211줄, coordinate-compression.mdx 212줄. JSON 각 77/69/76줄. CodeWithOutput C++/Python (pbs, traceback), C++/Python/Java (coord). query 디렉토리 추가. em-dash 0, JSON valid, astro check 0 errors. validation 통과.
| 2026-06-25 | dancing_links, bitset_lcs, hirschberg | Phase D.8-D.9. 3 토픽 신규 작성 (MDX + JSON). dancing-links.mdx 334줄, bitset-lcs.mdx 241줄, hirschberg.mdx 300줄. JSON 각 42/46/53줄. CodeWithOutput C++/Python (dancing-links, hirschberg), C++/Python/Java (bitset-lcs). em-dash 0, JSON valid, astro check 0 errors. D.8/D.9 완료.
| 2026-06-25 | invariant, permutation_cycle_decomposition, degree_sequence | Phase D.6. 3 토픽 신규 작성. invariant.mdx 179줄, permutation-cycle-decomposition.mdx 223줄, degree-sequence.mdx 225줄. JSON 각 74/104/122줄. CodeWithOutput 3-lang (C++/Python/Java) for all. em-dash 0, JSON valid. validation 통과.
| 2026-06-25 | floor_sum, linear_programming, duality | Phase D.6. 3 토픽 신규 작성. floor-sum.mdx 218줄, linear-programming.mdx 261줄, duality.mdx 209줄. JSON 각 50줄. CodeWithOutput C++/Python, duality C++/Python (Java 제외). em-dash 0, JSON valid, astro check 0 errors. validation 통과.
