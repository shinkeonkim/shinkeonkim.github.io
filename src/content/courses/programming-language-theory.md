---
title: "프로그래밍 언어론: 컴파일러의 8단계 여정"
description: "언어 처리기의 전체 파이프라인을 초심자 관점에서 따라가는 학습 경로. 어휘 분석, 파싱, AST, 의미 분석, 타입 시스템, 인터프리터/컴파일러, IR/최적화/코드 생성까지 실제 언어 구현이 어떻게 작동하는지 단계별로 익힌다."
level: intermediate
duration: "약 8시간"
tags: [plt, compiler, language, foundations, ast, parser, type-system]
updated: 2026-07-07
chapters:
  - collection: wiki
    id: plt/programming-language-theory
    note: "언어 처리기의 큰 그림: Lexer → Parser → AST → Semantic → IR → Optimizer → CodeGen"
  - collection: wiki
    id: plt/plt-lexical-analysis
    note: "문자열을 토큰으로 자르는 어휘 분석. 정규식, DFA/NFA, longest-match"
  - collection: wiki
    id: plt/plt-parsing
    note: "토큰을 문법 규칙으로 조립: BNF/EBNF, recursive descent, LL vs LR, Pratt parser"
  - collection: wiki
    id: plt/plt-abstract-syntax-tree
    note: "파서의 출력물 AST: 노드 정의, 순회, visitor pattern, AST 변환"
  - collection: wiki
    id: plt/plt-semantic-analysis
    note: "이름 해석, symbol table, scope, hoisting, 제어 흐름 검사"
  - collection: wiki
    id: plt/plt-type-systems
    note: "정적/동적, 강/약, structural/nominal, inference, sound vs unsound"
  - collection: wiki
    id: plt/plt-interpreter-compiler
    note: "Tree-walking, bytecode VM, JIT, AOT, transpiler 실행 모델 비교"
  - collection: wiki
    id: plt/plt-ir-optimization-codegen
    note: "SSA, CFG, LLVM IR, 최적화 pass, register allocation, 코드 생성"
---
