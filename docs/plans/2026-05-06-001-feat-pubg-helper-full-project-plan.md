---
title: "feat: PUBG Helper 전체 프로젝트 구현 계획 (Phase 0~3 + CI/CD + 배포 + 모니터링 + AI)"
type: feat
status: active
date: 2026-05-06
---

# feat: PUBG Helper 전체 프로젝트 구현 계획 (Phase 0~3 + CI/CD + 배포 + 모니터링 + AI)

## Summary

배틀그라운드 게임 보조 웹서비스를 처음부터 구현한다. 인프라(K8s/ArgoCD/Harbor/Vault)는 이미 구축되어 있으며, 이 계획은 앱 코드 전체가 비어있는 상태에서 시작한다.

**진행 순서:** 로컬 개발 환경 세팅 → 핵심 기능 구현 및 테스트 → CI/CD 파이프라인 → K8s 배포 연결. 기능과 테스트가 완전히 검증된 후 배포 인프라를 붙인다. 기능이 돌아가지도 않는 상태에서 인프라를 연결하면 어디서 문제가 생기는지 알 수 없다.

---

## Problem Frame

현재 레포에는 K8s 매니페스트와 ArgoCD AppSet만 존재하며 앱 코드가 전혀 없다. `pnpm-workspace.yaml`은 설정되어 있으나 `apps/`, `packages/` 내부는 모두 비어있다. 화면공유 기반 자기장 분석 + 프로 위치 추천 + 알림 기능을 제공하는 웹서비스를 단계적으로 구현해야 한다.

---

## Requirements

- R1. pnpm 모노레포 워크스페이스가 올바르게 동작하고 패키지 간 공유 타입을 사용할 수 있어야 한다.
- R2. TypeScript strict mode + any 금지 + 95% 커버리지 조건을 CI가 강제해야 한다.
- R3. 화면공유(getDisplayMedia)를 통해 캡처한 프레임에서 자기장 원(중심 x,y + 반경 r)을 추출할 수 있어야 한다.
- R4. 자기장 원 데이터를 기반으로 DB에서 프로 추천 위치를 조회하고 등급별로 반환해야 한다.
- R5. 미니맵 타이머 OCR로 자기장 잔여 시간을 파악하고 30/20/10초에 브라우저 알림을 발송해야 한다.
- R6. Leaflet.js 지도에 자기장 원 오버레이와 프로 위치 마커를 실시간으로 표시해야 한다.
- R7. 모든 서비스가 ArgoCD GitOps를 통해 K8s 클러스터에 자동 배포되어야 한다.
- R8. 하드코딩된 시크릿이 없으며 Vault + ESO로 DB 패스워드/API 키를 관리해야 한다.

---

## Scope Boundaries

- Phase 4(K8s 배포 심화), Phase 5(모니터링), Phase 6(AI 위치 학습)는 이 계획의 범위 밖이다.
- **v1 지원 맵: 에란겔 + 태이고 2종.** 비슷한 녹색 계열 맵을 정확히 구분할 수 있는지 검증 후 미라마/론도로 확장한다.
- 프로 위치 DB 시드 데이터 수집/정제는 별도 작업이다. 이 계획은 스키마와 API만 구현한다.
- 모바일 지원은 범위 밖이다.

### Deferred to Follow-Up Work

- Phase 5 OTel/Grafana/GA/Mixpanel 모니터링: Phase 4(배포) 완료 후 별도 계획
- Phase 6 Python FastAPI AI 위치 학습 파이프라인: Phase 5(모니터링) 완료 후 별도 계획
- Phase 4 K8s Rollouts(카나리 배포): Phase 6(AI) 이후 서비스 안정화 단계에서 별도 계획
- 미라마/론도 맵 추가: 에란겔+태이고 v1 검증 후 별도 이슈
- 프로 위치 시드 데이터 수집 스크립트: DB 스키마 확정 후 별도 이슈

---

## Context & Research

### Relevant Code and Patterns

- ArgoCD AppSet 패턴: `applicationsets/onprem-dev/10-harbor-appset.yaml` (git generator, Sync-Wave, Helm values)
- HTTPRoute 패턴: `clusters/onprem-dev/harbor/httproute.yaml` (Envoy Gateway, `*.yongun.shop`)
- External Secret 패턴: `clusters/onprem-dev/harbor/external-secret-admin.yaml`
- 도메인: `yongun.shop` / K8s GitHub repo: `https://github.com/Steel-yong/Infra-gitops`
- ArgoCD target branch: 기존 인프라는 `onprem-dev-test`, 앱용 새 AppSet은 `main` 브랜치 참조

### Institutional Learnings

- Sync-Wave: 인프라 레이어는 음수(-10~0), 앱은 양수(50+) 사용
- Harbor 이미지 레지스트리: `harbor.yongun.shop/pubg-helper/{service}:{tag}`
- ignoreDifferences 패턴: 체크섬 OOSync 방지용 (Harbor AppSet 참고)
- ESO SecretStore는 이미 구성되어 있음 — ExternalSecret 리소스만 추가하면 된다.

---

## Key Technical Decisions

- **개발 우선, 인프라 나중**: 로컬에서 기능 구현 및 테스트 통과 → CI/CD → K8s 배포 순서. 기능 검증 전에 배포 파이프라인을 붙이면 문제 원인 파악이 어렵다.
- **모노레포 패키지 공유**: `packages/shared`에서 타입/DTO를 export하고 각 서비스는 `@pubg-helper/shared`로 import한다.
- **Web Worker 분리**: 화면캡처(captureWorker)와 OCR(ocrWorker)를 별도 Web Worker로 분리해 메인 스레드 블락 방지.
- **자기장 원 추출**: 프레임은 브라우저 Web Worker에서 Canvas로 캡처 후 base64로 capture-service에 전송. 서버에서 Sharp 전처리 + Hough Circle Transform.
- **실시간 통신**: Socket.io (NestJS WebSocket Gateway) — 프레임 전송과 분석 결과 수신 모두 동일 소켓 커넥션.
- **DB**: location-service만 PostgreSQL + Prisma 사용.
- **CI 커버리지 게이트**: 95% 미달 시 PR 블락. CI는 기능 구현이 완료된 후 추가.
- **CD 흐름**: main 브랜치 push → Docker 빌드 → Harbor push → ArgoCD 자동 Sync.
- **K8s 네임스페이스**: `pubg-helper` 신규 생성.

---

## Open Questions

### Resolved During Planning

- **개발 순서**: 기능 구현 → 테스트 통과 → CI/CD → K8s 배포. 인프라 연결은 맨 마지막.
- **DB 호스팅**: K8s 클러스터 내 PostgreSQL (Bitnami Helm chart) + Longhorn PVC.
- **서비스 포트**: capture 3001, location 3002, alert 3003, frontend 3000.
- **로컬 DB**: 개발 중에는 Docker Compose로 PostgreSQL 로컬 실행.

### Deferred to Implementation

- **Hough Circle Transform 라이브러리**: OpenCV.js vs 직접 구현 — 프로토타입 후 결정.
- **프로 위치 좌표 정규화**: 맵별 픽셀-좌표 매핑 테이블은 실제 게임 화면 캡처 후 보정.
- **빨간 느낌표 픽셀 임계값**: 실제 게임 화면으로 캘리브레이션.
- **Tesseract.js 언어 모델**: 숫자+콜론 whitelist로 충분한지 구현 후 판단.

---

## Output Structure

```
apps/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── src/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       └── workers/
│           ├── captureWorker.ts
│           └── ocrWorker.ts
├── services/
│   ├── capture/
│   │   ├── package.json
│   │   └── src/
│   │       └── capture/
│   ├── location/
│   │   ├── package.json
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       └── location/
│   └── alert/
│       ├── package.json
│       └── src/
│           └── alert/
packages/
└── shared/
    └── src/types/
docker-compose.yml          ← 로컬 개발용 PostgreSQL
.github/
└── workflows/
    ├── ci.yml              ← 기능 구현 완료 후 추가
    └── cd.yml
clusters/
└── onprem-dev/
    └── pubg-helper/        ← CI/CD 완성 후 추가
applicationsets/
└── onprem-dev/
    └── 11-pubg-helper-appset.yaml
```

---

## High-Level Technical Design

> *이 다이어그램은 의도한 접근 방식을 설명하는 방향성 가이드이며, 구현 사양이 아니다.*

```
브라우저 (Next.js)
  └── captureWorker (Web Worker)
        ├── getDisplayMedia() → Canvas 프레임 추출
        └── Socket.io emit('frame', base64) → capture-service:3001

  └── ocrWorker (Web Worker)
        ├── 미니맵 영역 크롭 (해상도별 좌표)
        ├── Tesseract.js OCR → "1:38" → 98초
        └── 빨간 느낌표 픽셀 감지

capture-service (NestJS WebSocket)
  ├── 프레임 수신 → 파란색 비율 분석 (전체맵 감지)
  ├── Sharp 전처리 → Hough Circle → CircleData{x,y,r}
  └── Socket.io emit('circle', CircleData) → 브라우저

location-service (NestJS REST)
  ├── POST /locations/recommend { circle: CircleData, mapType }
  ├── PostgreSQL: 원 안의 위치 필터링 + 거리순 정렬
  └── LocationData[] 반환

브라우저 Leaflet.js
  ├── 자기장 원 오버레이 (CircleData → L.Circle)
  ├── 프로 위치 마커 (LocationData → L.Marker)
  └── 알림 설정 → Web Notifications API

개발 완료 후 CI/CD:
  GitHub Actions → Docker Build → Harbor Push
  ArgoCD → K8s Deployment (자동 Sync)
```

---

## Implementation Units

---

### U1. pnpm 모노레포 루트 설정

**Goal:** 모노레포 공통 도구 설정 — package.json, TypeScript base config, ESLint, Prettier, .nvmrc 세팅

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `.eslintrc.js`
- Create: `.prettierrc`
- Create: `.nvmrc`
- Create: `docker-compose.yml` (로컬 개발용 PostgreSQL)

**Approach:**
- root package.json: `private: true`, `scripts: { lint, test, build }`, devDependencies에 eslint/prettier/typescript
- tsconfig.base.json: `strict: true`, `noImplicitAny: true`, `paths`에 `@pubg-helper/shared` 등록
- ESLint: `@typescript-eslint/no-explicit-any` error, `no-console` warn
- docker-compose.yml: PostgreSQL 15 + 포트 5432, 로컬 개발 시 `docker compose up -d`로 DB 실행

**Test scenarios:**
- Happy path: `pnpm install` 후 각 워크스페이스가 올바르게 링크됨
- Happy path: `pnpm lint` 실행 시 any 타입 사용 코드에서 에러 발생
- Edge case: `@pubg-helper/shared` import가 타입 에러 없이 해결됨

**Verification:**
- `pnpm install`이 에러 없이 완료된다.
- `docker compose up -d`로 PostgreSQL이 localhost:5432에서 접근 가능하다.

---

### U2. packages/shared 공통 타입 패키지

**Goal:** 프론트/백엔드가 공유하는 CircleData, MapType, LocationData, TimerState, 소켓 이벤트 타입 정의

**Requirements:** R1, R3, R4, R5

**Dependencies:** U1

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/circle.ts`
- Create: `packages/shared/src/types/map.ts`
- Create: `packages/shared/src/types/location.ts`
- Create: `packages/shared/src/types/timer.ts`
- Create: `packages/shared/src/types/socket-events.ts`
- Create: `packages/shared/src/__tests__/types.test.ts`

**Approach:**
- `CircleData`: `{ x: number; y: number; r: number }` — 0~1 정규화 좌표
- `MapType`: `'erangel' | 'taego'  // v1: 2종, 이후 'miramar' | 'rondo' 확장` union type
- `LocationData`: `{ id: string; coordX: number; coordY: number; tier: 'S' | 'A' | 'B'; proTeamNames: string[]; usageCount: number; mapType: MapType }`
- `TimerState`: `{ remainingSeconds: number; isShrinking: boolean; phase: number }`
- `SocketEvents`: `const enum` — `FRAME_UPLOAD`, `CIRCLE_RESULT`, `NO_MAP`, `TIMER_UPDATE`

**Test scenarios:**
- Happy path: `CircleData` 객체 생성 시 x/y/r이 모두 number 타입으로 추론됨
- Edge case: `MapType`에 정의되지 않은 문자열 할당 시 TypeScript 컴파일 에러 발생
- Happy path: `index.ts`에서 모든 타입이 re-export되어 `@pubg-helper/shared`로 import 가능

**Verification:**
- 다른 워크스페이스에서 `import { CircleData } from '@pubg-helper/shared'`가 에러 없이 동작.
- 단위 테스트 통과.

---

### U3. capture-service NestJS 스캐폴드

**Goal:** capture-service의 NestJS 기본 구조 생성 — 모듈, 의존성, 테스트 설정

**Requirements:** R1, R2

**Dependencies:** U1, U2

**Files:**
- Create: `apps/services/capture/package.json`
- Create: `apps/services/capture/tsconfig.json`
- Create: `apps/services/capture/src/main.ts`
- Create: `apps/services/capture/src/app.module.ts`
- Create: `apps/services/capture/src/capture/capture.module.ts`
- Create: `apps/services/capture/vitest.config.ts`
- Create: `apps/services/capture/src/__tests__/health.spec.ts`

**Approach:**
- NestJS 10.x, `@nestjs/platform-express`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `sharp`
- 포트: 3001 (환경변수 `PORT`로 오버라이드 가능)
- `/health` 엔드포인트: `{ status: 'ok' }` 반환
- Vitest: `@vitest/coverage-v8`, 임계값 95%

**Test scenarios:**
- Happy path: NestJS 앱이 3001 포트에서 정상 시작됨
- Happy path: `GET /health` → `{ status: 'ok' }` 응답

**Verification:**
- `pnpm --filter capture dev` 실행 시 3001 포트 서버 시작.
- `pnpm --filter capture test:coverage` 커버리지 95% 달성.

---

### U4. location-service NestJS 스캐폴드 + Prisma 초기 연결

**Goal:** location-service의 NestJS 기본 구조 + Prisma 클라이언트 초기 연결 설정

**Requirements:** R1, R2, R4

**Dependencies:** U1, U2

**Files:**
- Create: `apps/services/location/package.json`
- Create: `apps/services/location/tsconfig.json`
- Create: `apps/services/location/src/main.ts`
- Create: `apps/services/location/src/app.module.ts`
- Create: `apps/services/location/prisma/schema.prisma` (빈 스키마)
- Create: `apps/services/location/src/prisma/prisma.service.ts`
- Create: `apps/services/location/src/prisma/prisma.module.ts`
- Create: `apps/services/location/vitest.config.ts`
- Create: `apps/services/location/src/__tests__/health.spec.ts`

**Approach:**
- 포트: 3002
- `PrismaService`: `OnModuleInit` 구현 → `$connect()` 호출
- `.env.local` 파일에 `DATABASE_URL=postgresql://postgres:password@localhost:5432/pubghelper`
- `/health` 엔드포인트: DB 연결 상태 포함

**Test scenarios:**
- Happy path: Prisma mock으로 `PrismaService.$connect()` 호출 시 에러 없음
- Happy path: `GET /health` → `{ status: 'ok', db: 'connected' }` 반환
- Error path: DB 연결 실패 시 `/health`가 503 반환

**Verification:**
- `docker compose up -d` 후 `pnpm --filter location dev` 실행 시 3002 포트 서버 시작.
- DB 연결 성공 로그 출력.

---

### U5. alert-service NestJS 스캐폴드

**Goal:** alert-service의 NestJS 기본 구조 생성

**Requirements:** R1, R2

**Dependencies:** U1, U2

**Files:**
- Create: `apps/services/alert/package.json`
- Create: `apps/services/alert/tsconfig.json`
- Create: `apps/services/alert/src/main.ts`
- Create: `apps/services/alert/src/app.module.ts`
- Create: `apps/services/alert/src/alert/alert.module.ts`
- Create: `apps/services/alert/vitest.config.ts`
- Create: `apps/services/alert/src/__tests__/health.spec.ts`

**Approach:**
- 포트: 3003
- `/health` 엔드포인트: `{ status: 'ok' }` 반환
- capture-service와 동일 구조 패턴

**Test scenarios:**
- Happy path: 앱이 3003 포트에서 정상 시작됨
- Happy path: `GET /health` → `{ status: 'ok' }` 반환

**Verification:**
- `pnpm --filter alert dev` 실행 시 3003 포트 서버 시작.

---

### U6. Next.js 14 frontend 스캐폴드

**Goal:** Next.js 14 App Router 기반 프론트엔드 기본 구조 생성

**Requirements:** R1, R2

**Dependencies:** U1, U2

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/frontend/next.config.js`
- Create: `apps/frontend/src/app/layout.tsx`
- Create: `apps/frontend/src/app/page.tsx`
- Create: `apps/frontend/src/app/globals.css`
- Create: `apps/frontend/vitest.config.ts`
- Create: `apps/frontend/src/__tests__/page.test.tsx`

**Approach:**
- Next.js 14, App Router, TypeScript strict
- `next.config.js`에 `transpilePackages: ['@pubg-helper/shared']`
- 메인 페이지: placeholder "PUBG Helper" 텍스트만 표시
- Vitest + `@testing-library/react`

**Test scenarios:**
- Happy path: 홈 페이지 렌더링 시 "PUBG Helper" 텍스트 노출
- Happy path: `next build`가 TypeScript 에러 없이 완료됨

**Verification:**
- `pnpm --filter frontend dev` 실행 시 localhost:3000에서 페이지 로딩.

---

### U7. Screen Capture Web Worker (프레임 캡처)

**Goal:** 브라우저에서 `getDisplayMedia`로 화면을 공유하고 Web Worker 내에서 주기적으로 프레임을 Canvas에 그려 base64 이미지로 추출

**Requirements:** R3

**Dependencies:** U6

**Files:**
- Create: `apps/frontend/src/workers/captureWorker.ts`
- Create: `apps/frontend/src/hooks/useScreenCapture.ts`
- Create: `apps/frontend/src/__tests__/captureWorker.test.ts`
- Create: `apps/frontend/src/__tests__/useScreenCapture.test.ts`

**Approach:**
- `captureWorker.ts`: `OffscreenCanvas`로 프레임 렌더링 → `toDataURL('image/jpeg', 0.7)`
- 캡처 주기: 500ms
- `useScreenCapture` hook: `getDisplayMedia` 호출, 워커 시작/중지 관리, 에러 상태 노출
- 권한 거부 시 `{ error: 'permission-denied' }` 반환

**Test scenarios:**
- Happy path: `getDisplayMedia` 성공 → 500ms 간격으로 base64 프레임 emit
- Error path: 사용자 화면공유 거부 시 `{ error: 'permission-denied' }` 반환
- Edge case: 화면공유 스트림 종료 시 워커 자동 중지
- Edge case: 워커 중지 후 재시작 시 새 스트림으로 재연결

**Verification:**
- `useScreenCapture`를 사용한 컴포넌트에서 프레임 emit이 주기적으로 발생한다.
- 커버리지 95% 달성.

---

### U8. capture-service WebSocket Gateway

**Goal:** 프론트에서 프레임을 수신하고 분석 결과(CircleData)를 다시 전송하는 WebSocket Gateway 구현

**Requirements:** R3

**Dependencies:** U3, U2

**Files:**
- Create: `apps/services/capture/src/capture/capture.gateway.ts`
- Create: `apps/services/capture/src/capture/capture.gateway.spec.ts`
- Create: `apps/services/capture/src/capture/capture.service.ts`
- Create: `apps/services/capture/src/capture/capture.service.spec.ts`

**Approach:**
- `@WebSocketGateway({ cors: true })` 데코레이터
- `@SubscribeMessage('frame')` 핸들러: base64 수신 → `CaptureService.analyzeFrame()` 호출
- `CaptureService.analyzeFrame(base64: string): Promise<CircleData | null>` 인터페이스 정의 (로직은 U9, U10에서)
- null 반환 시 'no-map' 이벤트, 에러 시 'error' 이벤트 전송

**Test scenarios:**
- Happy path: 유효한 base64 프레임 수신 시 `analyzeFrame()` 호출됨 (mock)
- Happy path: `CircleData` 반환 시 'circle' 이벤트 emit
- Happy path: null 반환 시 'no-map' 이벤트 emit
- Error path: `analyzeFrame()` throw 시 'error' 이벤트 emit
- Integration: 소켓 클라이언트가 'frame' 이벤트 전송 후 응답 이벤트 수신

**Verification:**
- WebSocket 클라이언트로 'frame' 이벤트 전송 시 응답 이벤트를 수신한다.
- 커버리지 95% 달성.

---

### U9. 전체맵 열림 감지 로직

**Goal:** 캡처 프레임 중앙 파란색 픽셀 비율이 30% 초과 시 전체맵이 열린 것으로 판단

**Requirements:** R3

**Dependencies:** U8

**Files:**
- Create: `apps/services/capture/src/capture/map-detection.service.ts`
- Create: `apps/services/capture/src/capture/map-detection.service.spec.ts`

**Approach:**
- Sharp로 base64 디코딩 → 중앙 30% 영역 크롭 → 픽셀 RGB 분석
- 파란색 기준: `b > 150 && b > r * 1.5 && b > g * 1.5`
- 임계값 30% 초과 시 `true`, 이하 시 `false`
- `isMapOpen(base64: string): Promise<boolean>` 인터페이스

**Test scenarios:**
- Happy path: 파란색 비율 35% 이미지 → `true` 반환
- Happy path: 파란색 비율 20% 이미지 → `false` 반환
- Edge case: 정확히 30% → `false` (초과 조건, 경계 미포함)
- Edge case: 빈 이미지 입력 → `false` 또는 에러 throw
- Error path: 유효하지 않은 base64 → Sharp 에러 throw

**Verification:**
- 실제 게임 전체맵 스크린샷으로 `isMapOpen` 호출 시 `true` 반환.
- 커버리지 95% 달성.

---

### U10. 자기장 원 추출 (Hough Circle Transform)

**Goal:** 전체맵 프레임에서 흰색 테두리 픽셀 마스킹 + Hough Circle Transform으로 자기장 원의 중심(x,y) + 반경(r)을 추출해 0~1 정규화

**Requirements:** R3

**Dependencies:** U9, U2

**Files:**
- Create: `apps/services/capture/src/capture/circle.service.ts`
- Create: `apps/services/capture/src/capture/circle.service.spec.ts`

**Approach:**
- Sharp로 흑백 변환 → 흰색 픽셀 임계값 마스킹
- Hough Circle Transform: 직접 구현 또는 경량 라이브러리 (구현 시 결정)
- 결과 픽셀 좌표를 이미지 width/height로 나눠 0~1 정규화
- `extractCircle(base64: string): Promise<CircleData | null>` 인터페이스

**Execution note:** Hough Circle 라이브러리 선택은 프로토타입 후 결정. OpenCV.js와 직접 구현 성능 비교.

**Test scenarios:**
- Happy path: 명확한 원이 있는 테스트 이미지 → `CircleData` 반환, x/y/r이 0~1 범위
- Happy path: 원이 없는 이미지 → `null` 반환
- Edge case: 매우 작은 원(r < 0.05) → `null` 반환 (노이즈 필터)
- Error path: 깨진 이미지 데이터 → 에러 throw

**Verification:**
- 실제 게임 전체맵 자기장 스크린샷으로 `extractCircle` 호출 시 합리적인 CircleData 반환.
- 커버리지 95% 달성.

---

### U11. OCR Web Worker (타이머 인식 + 알림 트리거)

**Goal:** 미니맵 위 타이머 영역을 크롭하여 Tesseract.js OCR로 잔여 시간을 파싱하고, 빨간 느낌표 픽셀 감지로 자기장 상태를 구분해 30/20/10초 알림 트리거

**Requirements:** R5

**Dependencies:** U6, U2

**Files:**
- Create: `apps/frontend/src/workers/ocrWorker.ts`
- Create: `apps/frontend/src/hooks/useAlertTimer.ts`
- Create: `apps/frontend/src/__tests__/ocrWorker.test.ts`
- Create: `apps/frontend/src/__tests__/useAlertTimer.test.ts`

**Approach:**
- `ocrWorker.ts`: 해상도별 타이머 영역 크롭
  ```
  TIMER_REGIONS = {
    '1920x1080': { x: 1680, y: 820, w: 180, h: 35 },
    '2560x1440': { x: 2240, y: 1095, w: 240, h: 46 },
    '3840x2160': { x: 3360, y: 1640, w: 360, h: 70 },
  }
  ```
- Tesseract.js: `whitelist: '0123456789:'`, `"1:38"` → 98초 변환
- 빨간 느낌표 감지: 타이머 좌측 영역 `r > 200 && g < 80 && b < 80` 픽셀 비율
- `useAlertTimer` hook: 설정된 임계값 도달 시 `'alert'` 이벤트 emit, 중복 발송 방지

**Test scenarios:**
- Happy path: `"1:38"` 파싱 → 98초 반환
- Happy path: `"0:10"` + 느낌표 있음 → 10초 알림 트리거
- Edge case: `"2:00"` → 120초 반환
- Edge case: 동일 초에 여러 프레임 처리 시 알림 1회만 발송
- Error path: OCR 결과 파싱 불가(`"1:3X"`) → `null` 반환, 알림 발송 안 함
- Happy path: 느낌표 없음 → 타이머 표시만, 알림 없음

**Verification:**
- 타이머 "0:30" + 느낌표 있는 테스트 이미지로 30초 알림이 정확히 1회 트리거.
- 커버리지 95% 달성.

---

### U12. Prisma DB 스키마 + 마이그레이션

**Goal:** maps, locations, circle_phases, sessions 테이블 스키마 정의 및 초기 마이그레이션 생성

**Requirements:** R4

**Dependencies:** U4, U1

**Files:**
- Modify: `apps/services/location/prisma/schema.prisma`
- Create: `apps/services/location/prisma/migrations/` (자동 생성)
- Create: `apps/services/location/prisma/seed.ts`
- Create: `apps/services/location/src/prisma/prisma.service.spec.ts`

**Approach:**
- `maps`: `id`, `type (MapType enum)`, `name`, `createdAt`
- `locations`: `id`, `mapId (FK)`, `coordX`, `coordY`, `tier (S/A/B enum)`, `proTeamNames (String[])`, `usageCount`
- `circle_phases`: `id`, `mapId (FK)`, `phaseNumber`, `waitSeconds`, `shrinkSeconds`
- `sessions`: `id`, `mapType`, `startedAt`, `endedAt`
- `seed.ts`: 에란겔 + 태이고 2개 맵 기본 데이터 삽입 (v1)
- 로컬 DB: `docker compose up -d` 후 `prisma migrate dev`

**Test scenarios:**
- Happy path: `prisma migrate dev` 에러 없이 완료
- Happy path: `prisma db seed` 후 maps 테이블에 2개 행(에란겔, 태이고) 존재
- Happy path: Prisma 클라이언트로 `findMany` 호출 시 타입 안전 쿼리 동작

**Verification:**
- `psql`로 직접 접속 시 모든 테이블 생성 확인.
- seed 후 `SELECT * FROM maps;` 에서 2개 행 확인.

---

### U13. location-service 프로 위치 조회 API

**Goal:** 자기장 원(CircleData) + 맵 타입을 받아 원 안의 프로 위치를 필터링하고 자기장 중심 거리순으로 정렬해 반환하는 REST API

**Requirements:** R4

**Dependencies:** U12, U2

**Files:**
- Create: `apps/services/location/src/location/location.module.ts`
- Create: `apps/services/location/src/location/location.controller.ts`
- Create: `apps/services/location/src/location/location.service.ts`
- Create: `apps/services/location/src/location/location.controller.spec.ts`
- Create: `apps/services/location/src/location/location.service.spec.ts`
- Create: `apps/services/location/src/location/dto/recommend-locations.dto.ts`

**Approach:**
- `POST /locations/recommend` — Body: `{ circle: CircleData, mapType: MapType }`
- 원 내부 필터링: 유클리드 거리 `sqrt((x-cx)² + (y-cy)²) <= r`
- 자기장 중심 거리 오름차순 정렬, 최대 20개 반환
- `class-validator` DTO 입력 검증

**Test scenarios:**
- Happy path: 원 내부 3개 위치 → 거리순 정렬된 3개 LocationData 반환
- Happy path: 원 내부 위치 없음 → 빈 배열 반환
- Edge case: 원 경계선 위의 위치(거리 정확히 r) → 포함됨
- Edge case: mapType 누락 시 400 Bad Request
- Error path: DB 연결 실패 시 500 Internal Server Error
- Integration: 실제 Prisma로 조회 시 올바른 맵의 위치만 필터링됨

**Verification:**
- curl로 유효한 circle + mapType 전송 시 거리순 위치 목록 반환.
- 커버리지 95% 달성.

---

### U14. alert-service WebSocket Gateway

**Goal:** 프론트에서 타이머 상태를 수신하고 알림 임계값 도달 시 이벤트 emit하는 WebSocket Gateway

**Requirements:** R5

**Dependencies:** U5, U2, U11

**Files:**
- Create: `apps/services/alert/src/alert/alert.gateway.ts`
- Create: `apps/services/alert/src/alert/alert.gateway.spec.ts`
- Create: `apps/services/alert/src/alert/timer-state.service.ts`
- Create: `apps/services/alert/src/alert/timer-state.service.spec.ts`

**Approach:**
- `@SubscribeMessage('timer-state')`: `TimerState` 수신
- `TimerStateService`: 30/20/10초 임계값 도달 시 'alert' 이벤트 emit
- 실제 브라우저 알림은 프론트(U18)에서 처리, 서버는 상태 집계/로깅 담당
- 중복 알림 방지: 세션별 `alreadyNotified` 세트 관리

**Test scenarios:**
- Happy path: `{ remainingSeconds: 30, isShrinking: true }` 수신 시 'alert-30' 이벤트 emit
- Happy path: `isShrinking: false` 수신 시 알림 이벤트 없음
- Edge case: 같은 세션에서 30초 도달 후 재진입 시 재발송 없음
- Error path: 유효하지 않은 TimerState 형식 수신 시 에러 이벤트

**Verification:**
- 커버리지 95% 달성.

---

### U15. 맵 선택 UI + Leaflet.js 기본 렌더링

**Goal:** 4개 맵 선택 UI와 선택된 맵 이미지를 Leaflet.js로 렌더링하는 컴포넌트

**Requirements:** R6

**Dependencies:** U6

**Files:**
- Create: `apps/frontend/src/components/MapSelector.tsx`
- Create: `apps/frontend/src/components/MapCanvas.tsx`
- Create: `apps/frontend/src/components/MapCanvas.module.css`
- Create: `apps/frontend/src/__tests__/MapSelector.test.tsx`
- Create: `apps/frontend/src/__tests__/MapCanvas.test.tsx`
- Create: `apps/frontend/public/maps/` (에란겔/미라마/태이고/론도 이미지 placeholder)

**Approach:**
- `MapSelector`: 에란겔/태이고 2개 버튼, 선택된 맵 강조 (v1)
- `MapCanvas`: `react-leaflet` + `CRS.Simple` (이미지 좌표계)
- Leaflet SSR 이슈: `dynamic(() => import('react-leaflet'), { ssr: false })`
- 기본 맵: 에란겔
- **좌표 일관성**: CRS.Simple + 0~1 정규화 좌표계로 마우스 휠 줌/드래그에 무관하게 위치 고정

**Test scenarios:**
- Happy path: 에란겔 버튼 클릭 시 `MapCanvas`에 에란겔 이미지 로딩
- Happy path: 태이고 버튼 클릭 시 태이고 이미지로 전환, 기존 마커 초기화
- Edge case: 첫 진입 시 에란겔 기본 선택됨
- Edge case: SSR 환경에서 Leaflet import 에러 없음
- Edge case: 줌 레벨 변경 시 CircleOverlay와 LocationMarker 위치가 고정된 좌표 기준으로 유지됨

**Verification:**
- 브라우저에서 맵 선택 시 해당 맵 이미지가 Leaflet 캔버스에 렌더링됨.
- 커버리지 95% 달성.

---

### U16. 자기장 원 오버레이

**Goal:** WebSocket으로 수신한 CircleData를 Leaflet 지도 위에 실시간 원으로 오버레이 렌더링

**Requirements:** R6, R3

**Dependencies:** U15, U8, U2

**Files:**
- Create: `apps/frontend/src/components/CircleOverlay.tsx`
- Create: `apps/frontend/src/hooks/useCaptureSocket.ts`
- Create: `apps/frontend/src/__tests__/CircleOverlay.test.tsx`
- Create: `apps/frontend/src/__tests__/useCaptureSocket.test.ts`

**Approach:**
- `useCaptureSocket` hook: capture-service 소켓 연결 관리, `CircleData` 상태 관리
- `CircleOverlay`: `react-leaflet`의 `Circle` 컴포넌트, 반투명 파란색
- CircleData 0~1 좌표 → Leaflet CRS.Simple 픽셀 좌표 변환
- 새 원 수신 시 이전 원 교체

**Test scenarios:**
- Happy path: `CircleData { x: 0.5, y: 0.5, r: 0.2 }` 수신 시 맵 중앙에 원 렌더링
- Happy path: 새 CircleData 수신 시 기존 원 교체됨
- Edge case: WebSocket 연결 끊김 시 마지막 원 유지
- Edge case: 'no-map' 이벤트 수신 시 원 숨김

**Verification:**
- 로컬에서 화면공유 시작 후 전체맵 열면 Leaflet 지도 위에 자기장 원 표시됨.
- 커버리지 95% 달성.

---

### U17. 프로 위치 마커 + 등급별 표시 + 랭킹

**Goal:** 자기장 원 감지 시 location-service에서 프로 추천 위치를 조회하고 S/A/B 등급별 색상 마커와 사이드패널로 표시

**Requirements:** R6, R4

**Dependencies:** U16, U13

**Files:**
- Create: `apps/frontend/src/components/LocationMarkers.tsx`
- Create: `apps/frontend/src/components/LocationPanel.tsx`
- Create: `apps/frontend/src/components/LocationPanel.module.css`
- Create: `apps/frontend/src/hooks/useLocations.ts`
- Create: `apps/frontend/src/__tests__/LocationMarkers.test.tsx`
- Create: `apps/frontend/src/__tests__/useLocations.test.ts`

**Approach:**
- `useLocations` hook: CircleData + mapType 변경 시 `POST /locations/recommend` 호출
- 마커 색상: S=금색, A=은색, B=동색
- `LocationPanel`: 오른쪽 사이드바, 거리순 리스트, 팀명/등급/거리 표시

**Test scenarios:**
- Happy path: CircleData 수신 시 API 호출 → 마커 렌더링
- Happy path: S=금색, A=은색, B=동색 마커 표시
- Happy path: 사이드패널 거리 오름차순 위치 목록
- Edge case: API 빈 배열 응답 → 마커 없음, "추천 위치 없음" 표시
- Error path: API 호출 실패 → 에러 토스트 표시

**Verification:**
- 전체맵 자기장 원 감지 후 2초 이내 마커가 지도에 표시됨.
- 커버리지 95% 달성.

---

### U18. 알림 설정 UI + Web Notifications API

**Goal:** 30/20/10초 알림 체크박스 설정 UI와 Web Notifications API를 통한 브라우저 알림 발송

**Requirements:** R5

**Dependencies:** U11, U6

**Files:**
- Create: `apps/frontend/src/components/AlertSettings.tsx`
- Create: `apps/frontend/src/hooks/useWebNotifications.ts`
- Create: `apps/frontend/src/__tests__/AlertSettings.test.tsx`
- Create: `apps/frontend/src/__tests__/useWebNotifications.test.ts`

**Approach:**
- `AlertSettings`: 30/20/10초 체크박스 3개 (독립 선택)
- `useWebNotifications` hook: `Notification.requestPermission()` 처리, 임계값 도달 시 `new Notification(...)` 발송
- 권한 거부 시 UI 경고 배너

**Test scenarios:**
- Happy path: 30초 체크박스 활성화 + 타이머 30초 도달 시 Notification 발송
- Happy path: 10초 체크박스만 활성화 시 10초에만 알림
- Edge case: 권한 거부 시 알림 발송 안 하고 경고 표시
- Edge case: 동일 타이밍에 2프레임 도달해도 알림 1회만 발송
- Edge case: 체크박스 비활성화 후 해당 초 알림 없음

**Verification:**
- 브라우저에서 30초 체크박스 활성화 + 타이머 30초 도달 시 OS 알림 표시.
- 커버리지 95% 달성.

---

### U19. 전체 통합 — 메인 페이지 조립

**Goal:** 모든 컴포넌트를 메인 페이지에 통합하고 데이터 흐름을 연결. 로컬에서 전체 플로우가 동작함을 확인.

**Requirements:** R3, R4, R5, R6

**Dependencies:** U7, U11, U15, U16, U17, U18

**Files:**
- Modify: `apps/frontend/src/app/page.tsx`
- Create: `apps/frontend/src/components/ScreenShareButton.tsx`
- Create: `apps/frontend/src/components/MainLayout.tsx`
- Create: `apps/frontend/src/__tests__/MainLayout.test.tsx`

**Approach:**
- `ScreenShareButton`: 화면공유 시작/중지, `useScreenCapture` hook 연결
- `MainLayout`: 좌측 지도 + 우측 패널 레이아웃
- 전역 상태: `mapType`, `circleData`, `timerState` — React Context 또는 Zustand
- 데이터 흐름: captureWorker → 소켓 → CircleData → CircleOverlay + useLocations → LocationMarkers

**Test scenarios:**
- Happy path: 화면공유 시작 버튼 클릭 시 `getDisplayMedia` 호출됨
- Integration: capture-service mock으로 CircleData emit 시 원과 마커가 동시 표시됨
- Edge case: 화면공유 중단 시 모든 오버레이 초기화

**Verification:**
- 로컬에서 전체 플로우(화면공유 → 전체맵 → 원 표시 → 위치 마커 → 알림)가 동작.
- `pnpm test:coverage` 전 서비스 95% 달성.

---

### U20. GitHub Actions CI 파이프라인

**Goal:** PR마다 lint, 타입체크, 단위테스트, 커버리지 95% 게이트를 자동 실행. 기능 구현 완료 후 추가.

**Requirements:** R2

**Dependencies:** U19 (전체 기능 구현 완료 후)

**Files:**
- Create: `.github/workflows/ci.yml`

**Approach:**
- trigger: `pull_request` to `main`, `develop`
- jobs: `lint` → `typecheck` → `test` (워크스페이스별 병렬) → `coverage-gate`
- pnpm 캐시 활용
- 커버리지 95% 미달 시 step fail
- Node 20, ubuntu-latest

**Test scenarios:**
- Test expectation: none — GitHub Actions 실행으로 검증.

**Verification:**
- PR 오픈 시 CI 자동 트리거.
- any 타입 코드 포함 PR → lint job 실패.
- 커버리지 95% 미달 PR → coverage-gate job 실패.

---

### U21. Docker 빌드 + GitHub Actions CD (Harbor push)

**Goal:** main 브랜치 push 시 각 서비스 Docker 이미지를 빌드하여 Harbor에 push

**Requirements:** R7

**Dependencies:** U20

**Files:**
- Create: `.github/workflows/cd.yml`
- Create: `apps/services/capture/Dockerfile`
- Create: `apps/services/location/Dockerfile`
- Create: `apps/services/alert/Dockerfile`
- Create: `apps/frontend/Dockerfile`

**Approach:**
- trigger: `push` to `main`
- Docker multi-stage: `builder` → `runner`
- 이미지 태그: `harbor.yongun.shop/pubg-helper/{service}:${GITHUB_SHA::8}`
- GitHub Secret: `HARBOR_USERNAME`, `HARBOR_PASSWORD`
- Next.js Dockerfile: `standalone` 출력 모드

**Test scenarios:**
- Test expectation: none — CD 실행 결과로 검증.

**Verification:**
- main push 시 Harbor에 4개 서비스 이미지 push됨.
- Harbor UI에서 `harbor.yongun.shop/pubg-helper/capture:latest` 확인.

---

### U22. K8s 매니페스트 + ArgoCD AppSet (pubg-helper 앱 배포)

**Goal:** pubg-helper 네임스페이스 + 4개 서비스 K8s Deployment/Service/HTTPRoute + PostgreSQL + ArgoCD AppSet 생성

**Requirements:** R7, R8

**Dependencies:** U21

**Files:**
- Modify: `clusters/onprem-dev/namespaces/namespace.yaml` (pubg-helper 추가)
- Create: `clusters/onprem-dev/pubg-helper/postgresql/` (deployment, service, pvc, kustomization)
- Create: `clusters/onprem-dev/pubg-helper/capture/` (deployment, service, kustomization)
- Create: `clusters/onprem-dev/pubg-helper/location/` (deployment, service, kustomization)
- Create: `clusters/onprem-dev/pubg-helper/alert/` (deployment, service, kustomization)
- Create: `clusters/onprem-dev/pubg-helper/frontend/` (deployment, service, httproute, kustomization)
- Create: `applicationsets/onprem-dev/11-pubg-helper-appset.yaml`

**Approach:**
- 네임스페이스: `pubg-helper`
- PostgreSQL: Bitnami 이미지 + Longhorn PVC
- HTTPRoute: `app.yongun.shop` → frontend:3000
- AppSet: `sync-wave: "50"`, `main` 브랜치 참조
- 환경변수: ExternalSecret(U23)으로 주입

**Test scenarios:**
- Test expectation: none — ArgoCD/kubectl로 검증.

**Verification:**
- ArgoCD UI에서 pubg-helper 앱 Synced/Healthy 상태.
- `https://app.yongun.shop`에서 프론트엔드 접근 가능.

---

### U23. Vault 시크릿 + ESO ExternalSecret 설정

**Goal:** DB 패스워드를 Vault에 저장하고 ESO ExternalSecret으로 K8s Secret에 주입

**Requirements:** R8

**Dependencies:** U22

**Files:**
- Create: `clusters/onprem-dev/pubg-helper/location/external-secret-db.yaml`
- Create: `clusters/onprem-dev/pubg-helper/postgresql/external-secret-postgres.yaml`

**Approach:**
- 기존 `clusters/onprem-dev/harbor/external-secret-admin.yaml` 패턴 그대로 따름
- Vault path: `secret/pubg-helper/db`
- K8s Secret으로 `DATABASE_URL`, `POSTGRES_PASSWORD` 주입

**Test scenarios:**
- Test expectation: none — kubectl describe ExternalSecret으로 검증.

**Verification:**
- `kubectl get secret -n pubg-helper`에서 DB 시크릿 생성 확인.
- location-service 파드가 DB 연결에 성공한다.

---

## System-Wide Impact

- **Interaction graph:** captureWorker → capture-service 소켓 → CircleData → location-service REST → LocationData → Leaflet 마커. ocrWorker → useAlertTimer → Web Notifications.
- **Error propagation:** 각 서비스 장애는 해당 기능만 중단. capture 장애 시 원/마커 불가, location 장애 시 마커 불가, 브라우저 알림은 독립적으로 동작.
- **State lifecycle risks:** WebSocket 재연결 시 마지막 CircleData 복구 필요. 타이머 알림 중복 방지 `alreadyNotified` 세트 관리.
- **Unchanged invariants:** 기존 K8s 인프라(ArgoCD, Harbor, Vault, Envoy Gateway)는 수정하지 않는다. 새 AppSet만 추가된다.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Hough Circle Transform Node.js 구현 복잡도 | 프로토타입에서 OpenCV.js, 직접 구현 비교 후 가장 단순한 방법 선택 |
| 게임 화면 해상도 다양성 | TIMER_REGIONS 3종 하드코딩, 나머지는 가장 가까운 값으로 fallback |
| Tesseract.js OCR 인식률 | whitelist 숫자+콜론 제한 + 전처리(대비 강화) |
| Web Worker Next.js 14 App Router 호환 | `dynamic import + { ssr: false }` 패턴, 빌드 시 검증 |
| PostgreSQL 시드 데이터 미확보 | 스키마/API 구현 후 별도 이슈로 수집 진행 (v1은 에란겔+태이고 2개 맵) |
| 에란겔↔태이고 맵 구분 오분류 | 색상/지형 특징값 임계값 튜닝으로 보완, 오분류율 측정 후 판단 |
| Harbor 프로젝트 미생성 | CD 연결 전에 Harbor UI에서 `pubg-helper` 프로젝트 수동 생성 필요 |

---

## Phased Delivery

### Phase 0: 로컬 개발 환경 세팅 (U1~U6)
pnpm 모노레포, 공유 타입 (에란겔+태이고), 4개 서비스 스캐폴드  
**완료 기준:** `pnpm install` 성공, 각 서비스 로컬 실행 가능, `/health` 응답 정상

### Phase 1: 화면 인식 엔진 (U7~U11)
captureWorker, WebSocket Gateway, 전체맵 감지, 자기장 원 추출, OCR 타이머  
**완료 기준:** 실제 게임 화면에서 CircleData가 소켓으로 수신됨, OCR 타이머 파싱 동작

### Phase 2: 백엔드 API (U12~U14)
DB 스키마 (에란겔+태이고 2개 맵), 위치 조회 API, alert-service Gateway  
**완료 기준:** `/locations/recommend` API가 curl에서 정상 응답

### Phase 3: 프론트엔드 UI + 전체 통합 (U15~U19)
Leaflet 지도 (에란겔+태이고 선택), 자기장 원, 위치 마커, 알림 설정, 전체 조립  
**완료 기준:** 로컬 브라우저에서 전체 플로우 동작, 에란겔↔태이고 맵 전환 정확, 모든 서비스 커버리지 95% 달성

### Phase 4: CI/CD 파이프라인 (U20~U21)
GitHub Actions lint/test/coverage + Docker CD + Harbor push  
**완료 기준:** main 브랜치 push 시 Harbor에 이미지 자동 push됨

### Phase 5: K8s 배포 (U22~U23)
K8s 매니페스트, ArgoCD AppSet, Vault 시크릿  
**완료 기준:** ArgoCD UI Synced/Healthy, `https://app.yongun.shop` 접근 가능

### Phase 6: 모니터링 (별도 계획)
OTel, Grafana, GA, Mixpanel — Phase 5 완료 후 별도 계획서 작성

### Phase 7: AI 위치 학습 파이프라인 (별도 계획)
프로 영상 분석 파이프라인 (Python FastAPI):  
- 대회 방송 줌인 맵뷰 분석 — 자기장이 줄수록 방송이 줌인되는 그 맵뷰에서 격자(A4, B3...) + 지역명("Pochinki" 등) 기준점으로 좌표 역산  
- Phase 2~6 수축 구간 자동 추출 (30초 간격, 경기당 약 600프레임)  
- 자기장 원 중심 + 팀 포지션 → DB 저장 → 통계 기반 추천 위치 계산  
Phase 6(모니터링) 완료 후 별도 계획서 작성

### Phase 8: 카나리 배포 (별도 계획)
K8s Rollouts + Argo Rollouts — Phase 7(AI) 이후 서비스 안정화 완료 후 별도 계획서 작성

---

## Documentation / Operational Notes

- 프로 위치 시드 데이터 없이는 Phase 3 마커 표시가 의미 없다. Phase 2 완료 후 즉시 시드 데이터 수집 이슈를 생성해야 한다.
- Harbor 프로젝트 `pubg-helper`는 CD 파이프라인 연결 전에 수동 생성 필요.
- Vault 시크릿 `secret/pubg-helper/db` 사전 등록 필요 (U23 시작 전).

---

## Sources & References

- CLAUDE.md: 프로젝트 전체 스펙 및 기술 스택
- `applicationsets/onprem-dev/10-harbor-appset.yaml`: AppSet 패턴
- `clusters/onprem-dev/harbor/httproute.yaml`: HTTPRoute 패턴
- `clusters/onprem-dev/harbor/external-secret-admin.yaml`: ExternalSecret 패턴
