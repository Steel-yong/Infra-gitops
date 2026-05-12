---
title: "Leaflet.js Next.js SSR 하이드레이션 오류 — window 참조 오류"
date: "2026-05-11"
category: "docs/solutions/ui-bugs"
module: "frontend-map"
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "ReferenceError: window is not defined (서버사이드 렌더링 중)"
  - "Hydration failed because the initial UI does not match what was rendered on the server"
  - "import 'leaflet/dist/leaflet.css' 로 인한 빌드 타임 오류"
root_cause: config_error
resolution_type: code_fix
severity: high
tags:
  - leaflet
  - nextjs
  - ssr
  - hydration
  - dynamic-import
  - react-leaflet
---

# Leaflet.js Next.js SSR 하이드레이션 오류 — window 참조 오류

## Problem

Leaflet.js(`react-leaflet`)는 `window`, `document`, `navigator` 등 브라우저 전용 API를 모듈 로드 시점에 참조한다. Next.js 14 App Router에서 서버 컴포넌트가 `MapCanvas`를 import하면 SSR 중 `window is not defined`가 발생하고, 클라이언트와 서버의 HTML이 달라 하이드레이션 오류가 이어진다.

## Symptoms

- `ReferenceError: window is not defined` — 서버 렌더링 단계
- 페이지 로드 후 콘솔에 `Hydration failed because the initial UI does not match what was rendered on the server`
- `MapContainer`, `CircleOverlay`, `LocationMarkers` 등 Leaflet 컨텍스트가 필요한 컴포넌트 전부 영향

## What Didn't Work

- `'use client'` 디렉티브만 추가 — App Router에서 `'use client'` 컴포넌트도 SSR에서 초기 렌더링됨
- `typeof window !== 'undefined'` 가드 조건 내 Leaflet 초기화 — 모듈 import 자체가 top-level에서 window 참조

## Solution

`next/dynamic`에 `{ ssr: false }` 옵션으로 Leaflet 관련 컴포넌트를 클라이언트 전용으로 로드한다.
Named export는 `.then()` 체이닝으로 default 변환이 필요하다.

```typescript
// page.tsx
import dynamic from 'next/dynamic';

const MapCanvas = dynamic(
  () => import('../components/MapCanvas'),
  { ssr: false }
);

const CircleOverlay = dynamic(
  () => import('../components/CircleOverlay').then((m) => ({ default: m.CircleOverlay })),
  { ssr: false }
);

const LocationMarkers = dynamic(
  () => import('../components/LocationMarkers').then((m) => ({ default: m.LocationMarkers })),
  { ssr: false }
);
```

`MapCanvas.tsx` 내부에서 `'use client'`와 `import 'leaflet/dist/leaflet.css'`는 유지해도 된다.

## Why This Works

`{ ssr: false }` 옵션은 해당 컴포넌트의 번들을 서버 렌더링에서 완전히 제외한다. 컴포넌트는 클라이언트 하이드레이션 이후 마운트되므로 `window`가 항상 정의된 환경에서 실행된다.

## Prevention

- 브라우저 전용 API를 사용하는 라이브러리(Leaflet, Chart.js 등)는 항상 `dynamic(..., { ssr: false })`로 임포트한다.
- Named export를 dynamic으로 감쌀 때 `.then((m) => ({ default: m.ExportName }))` 패턴을 사용한다.
- Leaflet을 사용하는 컴포넌트 JSDoc에 `SSR 비활성화 필요: next/dynamic으로 import할 것` 주석을 남긴다.

## Related Issues

- fix 커밋: `b2ad536` — SSR 하이드레이션 오류 수정
