---
inclusion: auto
---

# CI/CD 체크 가이드

이 프로젝트의 CI는 다음 검사를 순서대로 실행합니다. 코드 수정 후 반드시 이 검사들을 통과시켜야 합니다.

## 필수 검사 명령어

1. **Lint**: `bun run lint` (eslint)
2. **Type Check**: `bun run typecheck` (astro check)
3. **Build**: `bun run build`

## 자주 발생하는 실수와 해결법

### TypeScript / ESLint

- **`@typescript-eslint/no-explicit-any`**: `any` 타입 사용 금지. `unknown`, `Record<string, unknown>`, 또는 라이브러리가 제공하는 구체적 타입을 사용할 것.
  - Chart.js 관련: `ChartData`, `ChartOptions` 등 chart.js에서 export하는 타입을 활용.
  - 타입 단언이 필요할 때: `as unknown as TargetType` 패턴 사용 (중간에 `unknown`을 거치면 eslint와 tsc 모두 통과).
- **`@typescript-eslint/no-unused-vars`**: 사용하지 않는 변수는 `_` 접두사를 붙일 것 (예: `_entries`, `_unused`).
- **deprecated API 경고**: `ts(6385)` 경고가 뜨면 해당 API의 최신 대체 방법을 확인할 것.

### Astro 콘텐츠 설정

- **`z` import**: `import { z } from 'astro/zod'`를 사용할 것. `import { z } from 'astro:content'`는 deprecated (Astro 7에서 제거 예정).
- `defineCollection`은 여전히 `astro:content`에서 import.

### 접근성 (a11y)

- **`astro/jsx-a11y/label-has-associated-control`**: `<label>` 요소에는 반드시 `for` 속성(htmlFor)을 추가하여 연결된 input의 id와 매칭할 것.
- 또는 `<label>` 안에 input을 중첩시키는 방식도 허용됨.

### 인라인 스크립트에서 함수 사용

- Astro 파일의 `<script is:inline>` 블록 내에서 `onclick` 등 HTML 이벤트 핸들러로 호출되는 함수는 eslint가 "unused"로 감지할 수 있음.
- 이 경우 함수 위에 `// eslint-disable-next-line @typescript-eslint/no-unused-vars` 주석을 추가.

## 수정 후 검증 순서

코드를 수정한 뒤 커밋 전에 반드시 아래 순서로 실행:

```bash
bun run lint
bun run typecheck
```

두 명령 모두 exit code 0으로 통과해야 CI가 성공합니다.
