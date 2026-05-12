---
title: "pnpm workspace shared 패키지 — 타입 익스포트 경로 오류"
date: "2026-05-11"
category: "docs/solutions/integration-issues"
module: "packages-shared"
problem_type: integration_issue
component: tooling
symptoms:
  - "Module '@pubg-helper/shared' has no exported member 'LocationTier'"
  - "타입이 존재하는 파일과 다른 파일에서 익스포트되어 import 실패"
  - "빌드는 통과하지만 런타임에 undefined 반환"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags:
  - pnpm-workspace
  - monorepo
  - shared-types
  - export-path
  - typescript
---

# pnpm workspace shared 패키지 — 타입 익스포트 경로 오류

## Problem

`packages/shared/src/index.ts`에서 `LocationTier` 타입을 잘못된 파일(`types/map.ts`)에서 익스포트하고 있어 `@pubg-helper/shared`에서 import 시 `has no exported member 'LocationTier'` 오류 발생.

## Symptoms

- TypeScript 오류: `Module '@pubg-helper/shared' has no exported member 'LocationTier'`
- `apps/frontend`나 `apps/services/location`에서 `import type { LocationTier } from '@pubg-helper/shared'` 실패

## What Didn't Work

- `index.ts`에 재익스포트 추가 (`export type { LocationTier } from './types/map'`) — `map.ts`에 실제로 없는 타입이라 의미 없음
- `tsconfig`의 `paths` 설정 조정 — 패키지 내부 파일 구조 문제라 paths 수정으로 해결 불가

## Solution

타입이 실제로 정의된 파일에서 익스포트하도록 `index.ts` 수정:

```typescript
// packages/shared/src/index.ts — 수정 전
export type { MapType, LocationTier } from './types/map';      // ❌ LocationTier는 map.ts에 없음
export type { LocationData } from './types/location';

// packages/shared/src/index.ts — 수정 후
export type { MapType } from './types/map';
export type { LocationData, LocationTier } from './types/location';  // ✅ location.ts에 정의됨
```

## Why This Works

`LocationTier`는 `location.ts`에 정의된 타입이다. `index.ts`에서 `map.ts`를 통해 재익스포트하면 TypeScript가 해당 심볼을 찾지 못한다. 정의 파일과 익스포트 파일을 일치시키면 해결된다.

## Prevention

- `packages/shared`에 새 타입을 추가할 때 반드시 해당 타입이 정의된 파일에서 익스포트한다.
- 타입 추가 후 `packages/shared`를 import하는 서비스에서 빌드 체크: `pnpm --filter @pubg-helper/shared build && pnpm --filter apps/frontend typecheck`
- `index.ts`를 편집할 때 파일명과 익스포트 심볼을 교차 확인한다 (`types/map.ts` → MapType 관련, `types/location.ts` → Location 관련).

## Related

- fix 커밋: `db23048` — shared LocationTier 익스포트 경로 수정
- 관련 파일: `packages/shared/src/index.ts`, `packages/shared/src/types/location.ts`
