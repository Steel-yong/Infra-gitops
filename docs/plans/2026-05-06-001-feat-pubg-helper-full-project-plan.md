---
title: "feat: PUBG Helper 전체 프로젝트 구현 계획 (Phase 0~3)"
type: feat
status: active
date: 2026-05-06
---

# feat: PUBG Helper 전체 프로젝트 구현 계획 (Phase 0~3)

## Summary

배틀그라운드 게임 보조 웹서비스를 처음부터 구현한다. 인프라(K8s/ArgoCD/Harbor/Vault)는 이미 구축되어 있으며, 이 계획은 앱 코드 전체가 비어있는 상태에서 시작한다. Phase 0(개발 환경 세팅) → Phase 1(화면 인식 엔진) → Phase 2(백엔드 API) → Phase 3(프론트엔드 UI) 순서로 진행하며, 각 Implementation Unit은 하루 이내 완료 가능한 Linear 이슈 단위로 쪼개져 있다.

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
- 맵은 에란겔/미라마/태이고/론도 4종만 지원한다. 커스텀 맵 추가는 범위 밖이다.
- 프로 위치 DB 시드 데이터 수집/정제는 별도 작업이다. 이 계획은 스키마와 API만 구현한다.
- 모바일 지원은 범위 밖이다.

### Deferred to Follow-Up Work

- Phase 4 K8s Rollouts(카나리 배포): Phase 3 완료 후 별도 계획
- Phase 5 OTel/Grafana/GA/Mixpanel 모니터링: 별도 계획
- Phase 6 Python FastAPI AI 위치 학습: 별도 계획
- 프로 위치 시드 데이터 수집 스크립트: DB 스키마 확정 후 별도 이슈

---

## Context & Research

### Relevant Code and Patterns

- ArgoCD AppSet 패턴: `applicationsets/onprem-dev/10-harbor-appset.yaml` (git generator, Sync-Wave, Helm values)
- HTTPRoute 패턴: `clusters/onprem-dev/harbor/httproute.yaml` (Envoy Gateway, `*.yongun.shop`)
- External Secret 패턴: `clusters/onprem-dev/harbor/external-secret-admin.yaml`
- Kustomization 패턴: `clusters/onprem-dev/harbor/kustomization.yaml`
- 도메인: `yongun.shop` / K8s GitHub repo: `https://github.com/Steel-yong/Infra-gitops`
- ArgoCD target branch: `onprem-dev-test` (기존 AppSet 기준)

### Institutional Learnings

- Sync-Wave: 인프라 레이어는 음수(-10~0), 앱은 양수(50+) 사용
- Harbor 이미지 레지스트리: `harbor.yongun.shop/pubg-helper/{service}:{tag}`
- ignoreDifferences 패턴: 체크섬 OOSync 방지용 (Harbor AppSet 참고)
- ESO SecretStore는 이미 구성되어 있음 — ExternalSecret 리소스만 추가하면 된다.

### External References

- 없음 — 기존 코드베이스 패턴이 충분하다.

---

## Key Technical Decisions

- **모노레포 워크스페이스 공유**: `packages/shared`에서 타입/DTO를 export하고, 각 서비스는 `@pubg-helper/shared`로 import한다. 빌드 시 tsconfig의 `paths`로 해결한다.
- **Web Worker 분리**: 화면캡처(captureWorker)와 OCR(ocrWorker)를 별도 Web Worker로 분리해 메인 스레드 블락을 방지한다. Next.js 14 App Router에서 `new Worker(new URL(...))`로 등록한다.
- **자기장 원 추출 방식**: Sharp(서버) + Canvas API(브라우저)를 조합한다. 프레임은 브라우저 Web Worker에서 Canvas로 캡처 후 base64로 capture-service에 전송하고, 서버에서 Sharp로 전처리 후 Hough Circle Transform을 적용한다.
- **실시간 통신**: Socket.io (NestJS WebSocket Gateway) — 프레임 전송과 분석 결과 수신 모두 동일 소켓 커넥션으로 처리한다.
- **Prisma DB**: capture/location/alert 서비스 중 location-service만 DB를 사용한다. Prisma schema는 `apps/services/location/prisma/`에 위치한다.
- **CI 커버리지 게이트**: GitHub Actions에서 `pnpm test:coverage`를 실행하고 95% 미달 시 PR 블락.
- **CD 흐름**: main 브랜치 push → Docker 빌드 → Harbor push → ArgoCD 자동 Sync (이미 구성된 자동화 활용).
- **K8s 네임스페이스**: `pubg-helper` 네임스페이스를 신규 생성한다.
- **Sync-Wave**: 앱 서비스는 `sync-wave: "50"` 사용 (인프라 레이어 이후).

---

## Open Questions

### Resolved During Planning

- **K8s 브랜치**: 기존 AppSet은 `onprem-dev-test`를 참조하지만 현재 작업 브랜치는 `develop`이다. 앱용 새 AppSet은 `develop` 브랜치를 참조하도록 작성한다.
- **DB 호스팅**: K8s 클러스터 내 PostgreSQL(Bitnami Helm chart)을 사용한다. Longhorn PVC로 데이터를 영속한다.
- **이미지 레지스트리 경로**: `harbor.yongun.shop/pubg-helper/{service}` — 이미 CLAUDE.md에 명시됨.
- **서비스 포트**: capture 3001, location 3002, alert 3003, frontend 3000 사용.

### Deferred to Implementation

- **Hough Circle Transform 라이브러리**: Node.js에서 OpenCV.js vs 직접 구현 결정은 capture-service 구현 시 프로토타입 후 결정.
- **프로 위치 좌표 정규화 방식**: 맵별 픽셀-좌표 매핑 테이블은 실제 게임 화면 캡처 후 보정.
- **빨간 느낌표 픽셀 임계값**: alert-service 구현 시 실제 게임 화면으로 캘리브레이션.
- **Tesseract.js 언어 모델 선택**: 숫자+콜론 whitelist로 충분한지, 또는 별도 훈련 데이터 필요한지는 구현 후 판단.

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
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       ├── workers/
│       │   ├── captureWorker.ts
│       │   └── ocrWorker.ts
│       └── lib/
├── services/
│   ├── capture/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── capture/
│   │           ├── capture.gateway.ts
│   │           ├── circle.service.ts
│   │           └── map-detection.service.ts
│   ├── location/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── location/
│   │           ├── location.module.ts
│   │           ├── location.controller.ts
│   │           └── location.service.ts
│   └── alert/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           └── alert/
│               ├── alert.gateway.ts
│               ├── timer.service.ts
│               └── exclamation.service.ts
packages/
└── shared/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        └── types/
            ├── circle.ts
            ├── map.ts
            ├── location.ts
            ├── timer.ts
            └── socket-events.ts
clusters/
└── onprem-dev/
    ├── namespaces/  (pubg-helper 네임스페이스 추가)
    └── pubg-helper/
        ├── postgresql/
        ├── capture/
        ├── location/
        ├── alert/
        └── frontend/
.github/
└── workflows/
    ├── ci.yml
    └── cd.yml
```

---

## High-Level Technical Design

> *이 다이어그램은 의도한 접근 방식을 설명하는 방향성 가이드이며, 구현 사양이 아니다. 구현 에이전트는 컨텍스트로 참고하되 그대로 복제하지 않아야 한다.*

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
  ├── PostgreSQL: 원 안의 위치 필터링
  ├── 자기장 중심 거리순 정렬
  └── S/A/B 등급별 LocationData[] 반환

브라우저 Leaflet.js
  ├── 자기장 원 오버레이 (CircleData → L.Circle)
  ├── 프로 위치 마커 (LocationData[] → L.Marker with 등급 색상)
  └── 알림 설정 체크박스 → Web Notifications API
```

---

## Implementation Units

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
- Create: `.gitignore` (업데이트)

**Approach:**
- root package.json: `private: true`, `scripts: { lint, test, build }`, devDependencies에 eslint/prettier/typescript
- tsconfig.base.json: `strict: true`, `noImplicitAny: true`, `paths` 매핑으로 `@pubg-helper/shared` 등록
- ESLint: `@typescript-eslint/no-explicit-any` error, `no-console` warn
- Node 버전은 LTS (v20)

**Patterns to follow:**
- `pnpm-workspace.yaml` 기존 설정 유지

**Test scenarios:**
- Happy path: `pnpm install` 후 각 워크스페이스가 올바르게 링크되는지 확인
- Happy path: `pnpm lint` 실행 시 any 타입 사용 코드에서 에러 발생
- Edge case: 워크스페이스 간 패키지 참조 시 `@pubg-helper/shared` import가 해결됨

**Verification:**
- `pnpm install`이 에러 없이 완료된다.
- `pnpm lint`가 루트에서 모든 워크스페이스를 검사한다.

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
- `MapType`: `'erangel' | 'miramar' | 'taego' | 'rondo'` union type
- `LocationData`: `{ id: string; coordX: number; coordY: number; tier: 'S' | 'A' | 'B'; proTeamNames: string[]; usageCount: number; mapType: MapType }`
- `TimerState`: `{ remainingSeconds: number; isShinking: boolean; phase: number }`
- `SocketEvents`: 소켓 이벤트 이름을 const enum으로 정의 (`FRAME_UPLOAD`, `CIRCLE_RESULT`, `TIMER_UPDATE`)
- package.json: `name: "@pubg-helper/shared"`, `main: "src/index.ts"` (ts-node 사용 시) 또는 빌드 후 `dist/`

**Test scenarios:**
- Happy path: `CircleData` 객체 생성 시 x/y/r이 모두 number 타입임을 타입 검사로 확인
- Edge case: `MapType`에 정의되지 않은 문자열 할당 시 TypeScript 컴파일 에러 발생
- Happy path: `index.ts`에서 모든 타입이 re-export되어 `@pubg-helper/shared`로 import 가능

**Verification:**
- 다른 워크스페이스에서 `import { CircleData } from '@pubg-helper/shared'` 가 TypeScript 에러 없이 동작한다.
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
- Create: `apps/services/capture/src/__tests__/app.spec.ts`

**Approach:**
- NestJS 10.x, `@nestjs/platform-express`, `@nestjs/websockets`, `@nestjs/platform-socket.io`
- 포트: 3001
- CORS 설정: 개발 시 `*`, 운영 시 환경변수로 제한
- Vitest: `@vitest/coverage-v8`, 임계값 95%
- 환경변수: `.env.example`에 `PORT=3001` 포함

**Test scenarios:**
- Happy path: NestJS 앱이 3001 포트에서 정상 시작됨
- Happy path: `/health` GET 요청에 `{ status: 'ok' }` 응답

**Verification:**
- `pnpm --filter capture dev` 실행 시 포트 3001에서 서버 시작.
- `pnpm --filter capture test:coverage` 실행 시 커버리지 95% 달성.

---

### U4. location-service NestJS 스캐폴드

**Goal:** location-service의 NestJS 기본 구조 + Prisma 클라이언트 초기 연결 설정

**Requirements:** R1, R2, R4

**Dependencies:** U1, U2

**Files:**
- Create: `apps/services/location/package.json`
- Create: `apps/services/location/tsconfig.json`
- Create: `apps/services/location/src/main.ts`
- Create: `apps/services/location/src/app.module.ts`
- Create: `apps/services/location/prisma/schema.prisma`
- Create: `apps/services/location/src/prisma/prisma.service.ts`
- Create: `apps/services/location/src/prisma/prisma.module.ts`
- Create: `apps/services/location/vitest.config.ts`
- Create: `apps/services/location/src/__tests__/app.spec.ts`

**Approach:**
- 포트: 3002
- Prisma: `@prisma/client`, `prisma` devDependency
- `schema.prisma`에 `DATABASE_URL` env 참조
- `PrismaService`는 `OnModuleInit`을 구현해 `$connect()` 호출
- `/health` 엔드포인트에서 Prisma 연결 상태도 확인

**Test scenarios:**
- Happy path: Prisma mock으로 `PrismaService.$connect()` 호출 시 에러 없음
- Happy path: `/health` 응답에 `{ status: 'ok', db: 'connected' }` 반환
- Error path: DB 연결 실패 시 `/health`가 503 반환

**Verification:**
- `pnpm --filter location dev` 실행 시 포트 3002에서 서버 시작.
- Prisma migrate 명령어가 동작한다.

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
- Create: `apps/services/alert/src/__tests__/app.spec.ts`

**Approach:**
- 포트: 3003
- NestJS WebSocket Gateway 추가 예정 (Phase 1에서)
- 구조는 capture-service와 동일 패턴

**Test scenarios:**
- Happy path: 앱이 3003 포트에서 정상 시작됨
- Happy path: `/health`에 `{ status: 'ok' }` 응답

**Verification:**
- `pnpm --filter alert dev` 실행 시 포트 3003에서 서버 시작.

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
- `next.config.js`에 `@pubg-helper/shared` 트랜스파일 설정 (`transpilePackages`)
- 메인 페이지는 placeholder "PUBG Helper" 텍스트만 표시
- Vitest + `@testing-library/react`로 컴포넌트 테스트

**Test scenarios:**
- Happy path: 홈 페이지 렌더링 시 "PUBG Helper" 텍스트가 노출됨
- Happy path: `next build`가 TypeScript 에러 없이 완료됨

**Verification:**
- `pnpm --filter frontend dev` 실행 시 localhost:3000에서 페이지 로딩.
- `pnpm --filter frontend build` 성공.

---

### U7. GitHub Actions CI 파이프라인

**Goal:** PR마다 lint, 타입체크, 단위테스트, 커버리지 95% 게이트를 자동 실행하는 CI 파이프라인

**Requirements:** R2

**Dependencies:** U3, U4, U5, U6

**Files:**
- Create: `.github/workflows/ci.yml`

**Approach:**
- trigger: `pull_request` to `main`, `develop`
- jobs: `lint` → `typecheck` → `test` (parallel per service) → `coverage-gate`
- pnpm 캐시 활용 (`~/.pnpm-store`)
- `pnpm test:coverage --reporter=json` 결과를 파싱해 95% 미달 시 step fail
- Node 20, ubuntu-latest

**Test scenarios:**
- Test expectation: none -- CI 설정 파일은 행위 테스트 불가. GitHub Actions 실행으로 검증.

**Verification:**
- PR 오픈 시 CI가 자동 트리거된다.
- any 타입 사용 코드가 포함된 PR은 lint job에서 실패한다.
- 커버리지 95% 미달 PR은 coverage-gate job에서 실패한다.

---

### U8. Docker 빌드 + GitHub Actions CD 파이프라인

**Goal:** main 브랜치 push 시 각 서비스의 Docker 이미지를 빌드하여 Harbor에 push하는 CD 파이프라인

**Requirements:** R7

**Dependencies:** U3, U4, U5, U6, U7

**Files:**
- Create: `.github/workflows/cd.yml`
- Create: `apps/services/capture/Dockerfile`
- Create: `apps/services/location/Dockerfile`
- Create: `apps/services/alert/Dockerfile`
- Create: `apps/frontend/Dockerfile`

**Approach:**
- trigger: `push` to `main`
- Docker multi-stage build: `builder` → `runner`
- 이미지 태그: `harbor.yongun.shop/pubg-helper/{service}:${GITHUB_SHA::8}`
- GitHub Secret: `HARBOR_USERNAME`, `HARBOR_PASSWORD`
- 빌드 완료 후 ArgoCD는 자동 sync (이미 설정됨)
- NestJS Dockerfile: `node:20-alpine`, `pnpm install --frozen-lockfile`, `pnpm build`
- Next.js Dockerfile: `standalone` 출력 모드 사용

**Test scenarios:**
- Test expectation: none -- Dockerfile 빌드 성공 여부는 CD 실행으로 검증.

**Verification:**
- main 브랜치 push 시 Harbor에 4개 서비스 이미지가 push된다.
- `harbor.yongun.shop/pubg-helper/capture:latest` 이미지가 Harbor UI에서 확인된다.

---

### U9. K8s 매니페스트 + ArgoCD AppSet (pubg-helper 앱 배포)

**Goal:** pubg-helper 네임스페이스 + 4개 서비스의 K8s Deployment/Service/HTTPRoute + PostgreSQL + ArgoCD AppSet 생성

**Requirements:** R7, R8

**Dependencies:** U8

**Files:**
- Modify: `clusters/onprem-dev/namespaces/namespace.yaml` (pubg-helper 네임스페이스 추가)
- Create: `clusters/onprem-dev/pubg-helper/postgresql/deployment.yaml`
- Create: `clusters/onprem-dev/pubg-helper/postgresql/service.yaml`
- Create: `clusters/onprem-dev/pubg-helper/postgresql/pvc.yaml`
- Create: `clusters/onprem-dev/pubg-helper/postgresql/kustomization.yaml`
- Create: `clusters/onprem-dev/pubg-helper/capture/deployment.yaml`
- Create: `clusters/onprem-dev/pubg-helper/capture/service.yaml`
- Create: `clusters/onprem-dev/pubg-helper/capture/kustomization.yaml`
- Create: `clusters/onprem-dev/pubg-helper/location/deployment.yaml`
- Create: `clusters/onprem-dev/pubg-helper/location/service.yaml`
- Create: `clusters/onprem-dev/pubg-helper/location/kustomization.yaml`
- Create: `clusters/onprem-dev/pubg-helper/alert/deployment.yaml`
- Create: `clusters/onprem-dev/pubg-helper/alert/service.yaml`
- Create: `clusters/onprem-dev/pubg-helper/alert/kustomization.yaml`
- Create: `clusters/onprem-dev/pubg-helper/frontend/deployment.yaml`
- Create: `clusters/onprem-dev/pubg-helper/frontend/service.yaml`
- Create: `clusters/onprem-dev/pubg-helper/frontend/httproute.yaml`
- Create: `clusters/onprem-dev/pubg-helper/frontend/kustomization.yaml`
- Create: `applicationsets/onprem-dev/11-pubg-helper-appset.yaml`

**Approach:**
- 네임스페이스: `pubg-helper`
- PostgreSQL: Bitnami 공식 이미지, Longhorn PVC 사용
- 각 서비스 Deployment: `imagePullPolicy: Always`, Harbor 이미지 참조
- HTTPRoute: `app.yongun.shop` → frontend:3000
- AppSet: `sync-wave: "50"`, `develop` 브랜치 참조
- 환경변수는 ExternalSecret을 통해 K8s Secret으로 주입 (U10 의존)

**Test scenarios:**
- Test expectation: none -- K8s 리소스 배포 성공은 kubectl/ArgoCD로 검증.

**Verification:**
- ArgoCD UI에서 pubg-helper 앱이 Synced/Healthy 상태.
- `https://app.yongun.shop`에서 프론트엔드 접근 가능.

---

### U10. Vault 시크릿 + ESO ExternalSecret 설정

**Goal:** DB 패스워드, Harbor 인증 정보를 Vault에 저장하고 ESO ExternalSecret으로 K8s Secret에 주입

**Requirements:** R8

**Dependencies:** U9

**Files:**
- Create: `clusters/onprem-dev/pubg-helper/location/external-secret-db.yaml`
- Create: `clusters/onprem-dev/pubg-helper/postgresql/external-secret-postgres.yaml`

**Approach:**
- ESO SecretStore는 이미 `external-secrets` 네임스페이스에 구성되어 있다.
- `ExternalSecret` 리소스에서 Vault path `secret/pubg-helper/db` 참조
- K8s Secret으로 `DATABASE_URL`, `POSTGRES_PASSWORD` 주입
- 기존 `clusters/onprem-dev/harbor/external-secret-admin.yaml` 패턴 그대로 따름

**Test scenarios:**
- Test expectation: none -- ExternalSecret 동기화는 kubectl describe 로 검증.

**Verification:**
- `kubectl get secret -n pubg-helper` 에서 DB 시크릿이 생성되어 있다.
- location-service 파드가 `DATABASE_URL`을 읽어 Prisma 연결에 성공한다.

---

### U11. Screen Capture Web Worker (프레임 캡처)

**Goal:** 브라우저에서 `getDisplayMedia`로 화면을 공유하고 Web Worker 내에서 주기적으로 프레임을 Canvas에 그려 base64 이미지로 추출

**Requirements:** R3

**Dependencies:** U6

**Files:**
- Create: `apps/frontend/src/workers/captureWorker.ts`
- Create: `apps/frontend/src/hooks/useScreenCapture.ts`
- Create: `apps/frontend/src/__tests__/captureWorker.test.ts`

**Approach:**
- `captureWorker.ts`: `OffscreenCanvas`로 프레임 렌더링 후 `toDataURL('image/jpeg', 0.7)` — 품질과 전송 크기 균형
- 캡처 주기: 500ms (분당 120프레임 기준)
- `useScreenCapture` hook: `getDisplayMedia` 호출, 워커 시작/중지 관리, 에러 상태 노출
- 사용자가 화면공유를 거부하면 에러 상태 `'permission-denied'` 반환

**Test scenarios:**
- Happy path: `getDisplayMedia` 성공 → 500ms 간격으로 base64 프레임이 워커에서 emit됨
- Error path: 사용자가 화면공유 거부 시 hook이 `{ error: 'permission-denied' }` 반환
- Edge case: 화면공유 스트림이 끊길 경우 (탭 변경 등) 워커가 자동 중지됨
- Edge case: 워커 중지 후 다시 시작 시 새 스트림으로 재연결됨

**Verification:**
- `useScreenCapture` hook을 사용한 컴포넌트에서 프레임 emit이 주기적으로 발생한다.
- 커버리지 95% 달성.

---

### U12. capture-service WebSocket Gateway

**Goal:** 프론트에서 프레임을 수신하고 처리 결과(CircleData)를 다시 전송하는 WebSocket Gateway 구현

**Requirements:** R3

**Dependencies:** U3, U2

**Files:**
- Create: `apps/services/capture/src/capture/capture.gateway.ts`
- Create: `apps/services/capture/src/capture/capture.gateway.spec.ts`
- Create: `apps/services/capture/src/capture/capture.service.ts`
- Create: `apps/services/capture/src/capture/capture.service.spec.ts`

**Approach:**
- `@WebSocketGateway({ cors: true })` 데코레이터
- `@SubscribeMessage('frame')` 핸들러: base64 이미지 수신 → `CaptureService.analyzeFrame()` 호출 → `CircleData` 반환
- `CaptureService`는 `analyzeFrame(base64: string): Promise<CircleData | null>` 인터페이스만 정의 (실제 로직은 U13, U14에서 구현)
- 전체맵 미감지 시 `null` 반환하고 클라이언트에 'no-map' 이벤트 전송
- 에러 발생 시 클라이언트에 'error' 이벤트 전송

**Test scenarios:**
- Happy path: 유효한 base64 프레임 수신 시 `CaptureService.analyzeFrame()` 호출됨 (mock)
- Happy path: `CircleData` 반환 시 클라이언트에 'circle' 이벤트로 emit됨
- Happy path: null 반환 시 클라이언트에 'no-map' 이벤트 emit됨
- Error path: `analyzeFrame()` throw 시 클라이언트에 'error' 이벤트 emit됨
- Integration: 소켓 클라이언트가 연결되고 'frame' 이벤트를 전송하면 응답 이벤트를 수신함

**Verification:**
- WebSocket 클라이언트로 'frame' 이벤트 전송 시 응답 이벤트를 수신한다.
- 커버리지 95% 달성.

---

### U13. 전체맵 열림 감지 로직

**Goal:** 캡처 프레임에서 화면 중앙 파란색 픽셀 비율이 30% 초과 시 전체맵이 열린 것으로 판단하는 로직 구현

**Requirements:** R3

**Dependencies:** U12

**Files:**
- Create: `apps/services/capture/src/capture/map-detection.service.ts`
- Create: `apps/services/capture/src/capture/map-detection.service.spec.ts`

**Approach:**
- Sharp로 base64 디코딩 → 중앙 30% 영역 크롭 → 픽셀 RGB 분석
- 파란색 기준: `b > 150 && b > r * 1.5 && b > g * 1.5` (게임 전체맵 하늘색)
- 파란색 픽셀 비율 = 파란색 픽셀 수 / 전체 픽셀 수
- 임계값 30% 초과 시 `true` 반환
- `isMapOpen(base64: string): Promise<boolean>` 인터페이스

**Test scenarios:**
- Happy path: 파란색 비율 35% 이미지 → `true` 반환
- Happy path: 파란색 비율 20% 이미지 → `false` 반환
- Edge case: 정확히 30% 파란색 → `false` 반환 (경계값 미포함)
- Edge case: 빈 이미지(0x0) 입력 → 에러 throw 또는 `false` 반환
- Error path: 유효하지 않은 base64 문자열 → Sharp 에러 throw

**Verification:**
- 실제 게임 전체맵 스크린샷으로 `isMapOpen` 호출 시 `true` 반환.
- 커버리지 95% 달성.

---

### U14. 자기장 원 추출 (Hough Circle Transform)

**Goal:** 전체맵 프레임에서 흰색 테두리 픽셀을 마스킹하고 Hough Circle Transform으로 자기장 원의 중심(x,y) + 반경(r)을 추출해 0~1로 정규화

**Requirements:** R3

**Dependencies:** U13, U2

**Files:**
- Create: `apps/services/capture/src/capture/circle.service.ts`
- Create: `apps/services/capture/src/capture/circle.service.spec.ts`

**Approach:**
- Sharp로 이미지를 흑백 변환 → 흰색 픽셀 임계값 마스킹
- Hough Circle Transform: 직접 구현 또는 경량 라이브러리 사용 (구현 시 결정)
- 결과 픽셀 좌표를 이미지 width/height로 나눠 0~1 정규화
- `extractCircle(base64: string): Promise<CircleData | null>` 인터페이스
- 원이 감지되지 않으면 `null` 반환

**Execution note:** Hough Circle 라이브러리 선택은 프로토타입 후 결정 (구현 시 deferred). 직접 구현과 라이브러리 성능을 비교한다.

**Test scenarios:**
- Happy path: 명확한 원이 있는 테스트 이미지 → `CircleData` 반환, x/y/r이 0~1 범위
- Happy path: 원이 없는 이미지 → `null` 반환
- Edge case: 매우 작은 원(r < 0.05) → `null` 반환 (노이즈 필터)
- Edge case: 원이 이미지 경계에 걸친 경우 → 부분 원도 감지됨 또는 무시됨 (구현 시 결정)
- Error path: 깨진 이미지 데이터 → 에러 throw

**Verification:**
- 실제 게임 전체맵 자기장 스크린샷으로 `extractCircle` 호출 시 합리적인 CircleData 반환.
- 커버리지 95% 달성.

---

### U15. OCR Web Worker (타이머 인식 + 알림 트리거)

**Goal:** 미니맵 위 타이머 영역을 크롭하여 Tesseract.js OCR로 잔여 시간을 파싱하고, 빨간 느낌표 픽셀 감지로 자기장 상태를 구분해 30/20/10초 알림을 트리거

**Requirements:** R5

**Dependencies:** U6, U2

**Files:**
- Create: `apps/frontend/src/workers/ocrWorker.ts`
- Create: `apps/frontend/src/hooks/useAlertTimer.ts`
- Create: `apps/frontend/src/__tests__/ocrWorker.test.ts`
- Create: `apps/frontend/src/__tests__/useAlertTimer.test.ts`

**Approach:**
- `ocrWorker.ts`: 캡처 프레임에서 해상도별 타이머 영역 크롭
  ```
  TIMER_REGIONS = {
    '1920x1080': { x: 1680, y: 820, w: 180, h: 35 },
    '2560x1440': { x: 2240, y: 1095, w: 240, h: 46 },
    '3840x2160': { x: 3360, y: 1640, w: 360, h: 70 },
  }
  ```
- Tesseract.js: `whitelist: '0123456789:'` 설정, `"1:38"` → 98초 변환
- 빨간 느낌표 감지: 타이머 좌측 영역에서 `r > 200 && g < 80 && b < 80` 픽셀 비율
- `useAlertTimer` hook: TimerState 관리, 30/20/10초 임계값 도달 시 `'alert'` 이벤트 emit
- 이미 알림을 발송한 초 단위는 재발송하지 않음 (상태 관리)

**Test scenarios:**
- Happy path: `"1:38"` 문자열 파싱 → 98초 반환
- Happy path: `"0:10"` 파싱 → 10초, 느낌표 있음 → 10초 알림 트리거
- Edge case: `"2:00"` 파싱 → 120초 반환
- Edge case: 동일 초에 여러 프레임 처리 시 알림이 한 번만 발송됨
- Error path: OCR 결과가 `"1:3X"` 같이 파싱 불가 → `null` 반환, 알림 발송 안 함
- Happy path: 느낌표 없음 → 타이머 표시만, 알림 없음

**Verification:**
- 타이머 "0:30" + 느낌표 있는 테스트 이미지로 30초 알림이 정확히 1회 트리거된다.
- 커버리지 95% 달성.

---

### U16. Prisma DB 스키마 + 마이그레이션

**Goal:** maps, locations, circle_phases, sessions 테이블 스키마 정의 및 초기 마이그레이션 생성

**Requirements:** R4

**Dependencies:** U4, U10

**Files:**
- Modify: `apps/services/location/prisma/schema.prisma`
- Create: `apps/services/location/prisma/migrations/` (자동 생성)
- Create: `apps/services/location/prisma/seed.ts` (예시 데이터)
- Create: `apps/services/location/src/prisma/prisma.service.spec.ts`

**Approach:**
- `maps` 테이블: `id`, `type (MapType enum)`, `name`, `createdAt`
- `locations` 테이블: `id`, `mapId (FK)`, `coordX (Float)`, `coordY (Float)`, `tier (S/A/B enum)`, `proTeamNames (String[])`, `usageCount (Int)`
- `circle_phases` 테이블: `id`, `mapId (FK)`, `phaseNumber (Int)`, `waitSeconds (Int)`, `shrinkSeconds (Int)`
- `sessions` 테이블: `id`, `mapType`, `startedAt`, `endedAt`
- `prisma migrate dev` 로 마이그레이션 파일 생성

**Test scenarios:**
- Happy path: `prisma migrate dev` 실행 시 에러 없이 마이그레이션 완료
- Happy path: `prisma db seed` 실행 시 4개 맵 데이터가 삽입됨
- Edge case: locations.coordX/Y가 0.0~1.0 범위를 벗어나는 데이터 삽입 시 — 제약 조건 없음, 서비스 레이어에서 검증 (구현 시 결정)

**Verification:**
- `psql`로 직접 접속 시 모든 테이블이 생성되어 있다.
- seed 실행 후 `maps` 테이블에 4개 행 존재.

---

### U17. location-service 프로 위치 조회 API

**Goal:** 자기장 원(CircleData) + 맵 타입을 받아 원 안의 프로 위치를 필터링하고 자기장 중심 거리순으로 정렬해 반환하는 REST API 구현

**Requirements:** R4

**Dependencies:** U16, U2

**Files:**
- Create: `apps/services/location/src/location/location.module.ts`
- Create: `apps/services/location/src/location/location.controller.ts`
- Create: `apps/services/location/src/location/location.service.ts`
- Create: `apps/services/location/src/location/location.controller.spec.ts`
- Create: `apps/services/location/src/location/location.service.spec.ts`
- Create: `apps/services/location/src/location/dto/recommend-locations.dto.ts`

**Approach:**
- `POST /locations/recommend` — Body: `{ circle: CircleData, mapType: MapType }`
- 서비스 로직: DB에서 해당 맵의 모든 위치 조회 → 원 내부 필터링 (유클리드 거리 <= r) → 자기장 중심(circle.x, circle.y)에서의 거리 오름차순 정렬
- 응답: `LocationData[]` (최대 20개)
- 입력 검증: `class-validator` DTO 사용

**Test scenarios:**
- Happy path: 원 내부 3개 위치 → 거리순 정렬된 3개 LocationData 반환
- Happy path: 원 내부 위치 없음 → 빈 배열 반환
- Edge case: 원 경계선 위의 위치 (거리 정확히 r) → 포함됨
- Edge case: mapType 없이 요청 시 400 Bad Request
- Error path: DB 연결 실패 시 500 Internal Server Error
- Integration: 실제 Prisma로 조회 시 올바른 맵의 위치만 필터링됨

**Verification:**
- Postman/curl로 유효한 circle + mapType 전송 시 거리순 정렬된 위치 목록 반환.
- 커버리지 95% 달성.

---

### U18. alert-service 타이머 파싱 + K8s 배포 준비

**Goal:** alert-service가 프론트에서 타이머 데이터를 수신하는 WebSocket Gateway 구현 (OCR은 프론트 Web Worker에서 처리 후 타이머 상태만 전송)

**Requirements:** R5

**Dependencies:** U5, U2, U15

**Files:**
- Create: `apps/services/alert/src/alert/alert.gateway.ts`
- Create: `apps/services/alert/src/alert/alert.gateway.spec.ts`
- Create: `apps/services/alert/src/alert/timer-state.service.ts`
- Create: `apps/services/alert/src/alert/timer-state.service.spec.ts`

**Approach:**
- alert-service WebSocket Gateway: `@SubscribeMessage('timer-state')` — `TimerState` 수신
- `TimerStateService`: 세션별 타이머 상태 추적, 알림 임계값(30/20/10초) 도달 시 클라이언트에 'alert' 이벤트 emit
- 프론트의 `useAlertTimer` hook이 `TimerState`를 서버에 전송, 서버는 상태 집계/로깅만 담당
- 실제 알림 발송은 브라우저 Web Notifications API (U22에서)

**Test scenarios:**
- Happy path: TimerState `{ remainingSeconds: 30, isShinking: true }` 수신 시 'alert-30' 이벤트 emit
- Happy path: 느낌표 없는 TimerState 수신 시 알림 이벤트 없음
- Edge case: 동일 세션에서 30초 알림 후 다시 TimerState가 30초로 들어오면 재발송 안 함
- Error path: 유효하지 않은 TimerState 형식 수신 시 에러 이벤트

**Verification:**
- 커버리지 95% 달성.

---

### U19. 맵 선택 UI + Leaflet.js 기본 렌더링

**Goal:** 4개 맵(에란겔/미라마/태이고/론도) 선택 UI와 선택된 맵 이미지를 Leaflet.js로 렌더링하는 컴포넌트 구현

**Requirements:** R6

**Dependencies:** U6

**Files:**
- Create: `apps/frontend/src/components/MapSelector.tsx`
- Create: `apps/frontend/src/components/MapCanvas.tsx`
- Create: `apps/frontend/src/components/MapCanvas.module.css`
- Create: `apps/frontend/src/__tests__/MapSelector.test.tsx`
- Create: `apps/frontend/src/__tests__/MapCanvas.test.tsx`
- Create: `apps/frontend/public/maps/` (에란겔/미라마/태이고/론도 이미지)

**Approach:**
- `MapSelector`: 4개 버튼, 선택된 맵 강조 표시
- `MapCanvas`: `react-leaflet` (또는 leaflet 직접), CRS.Simple로 이미지 좌표계 사용
- 맵 이미지는 `public/maps/{mapType}.jpg`로 정적 제공
- 휠로 확대/축소, 드래그로 이동
- 컴포넌트는 `'use client'` 디렉티브

**Test scenarios:**
- Happy path: 에란겔 버튼 클릭 시 `MapCanvas`에 에란겔 이미지 로딩
- Happy path: 4개 맵 모두 선택 가능
- Edge case: 페이지 최초 진입 시 기본 맵(에란겔) 선택됨
- Edge case: SSR 환경에서 Leaflet import 에러 없음 (`dynamic import` 처리)

**Verification:**
- 브라우저에서 맵 선택 버튼 클릭 시 해당 맵 이미지가 Leaflet 캔버스에 렌더링된다.
- 커버리지 95% 달성.

---

### U20. 자기장 원 오버레이

**Goal:** WebSocket으로 수신한 CircleData를 Leaflet 지도 위에 실시간 원으로 오버레이 렌더링

**Requirements:** R6, R3

**Dependencies:** U19, U12, U2

**Files:**
- Create: `apps/frontend/src/components/CircleOverlay.tsx`
- Create: `apps/frontend/src/hooks/useCaptureSocket.ts`
- Create: `apps/frontend/src/__tests__/CircleOverlay.test.tsx`
- Create: `apps/frontend/src/__tests__/useCaptureSocket.test.ts`

**Approach:**
- `useCaptureSocket` hook: capture-service WebSocket 연결 관리, `CircleData` 상태 관리
- `CircleOverlay`: `react-leaflet`의 `Circle` 컴포넌트 (또는 `L.Circle`), 반투명 파란색
- CircleData의 정규화 좌표(0~1)를 Leaflet CRS.Simple 픽셀 좌표로 변환 (맵 이미지 크기 기준)
- 이전 원은 새 원 수신 시 교체 (누적 안 됨)

**Test scenarios:**
- Happy path: `CircleData { x: 0.5, y: 0.5, r: 0.2 }` 수신 시 맵 중앙에 원이 렌더링됨
- Happy path: 새 CircleData 수신 시 기존 원이 교체됨
- Edge case: WebSocket 연결 끊김 시 마지막 원이 유지됨
- Edge case: capture-service에서 'no-map' 이벤트 수신 시 원이 숨겨짐

**Verification:**
- 브라우저에서 화면공유 시작 후 전체맵 열면 Leaflet 지도 위에 자기장 원이 표시된다.
- 커버리지 95% 달성.

---

### U21. 프로 위치 마커 + 등급별 표시 + 랭킹

**Goal:** 자기장 원 감지 시 location-service에서 프로 추천 위치를 조회하고 S/A/B 등급별 색상 마커와 거리순 사이드패널로 표시

**Requirements:** R6, R4

**Dependencies:** U20, U17

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
- 자기장 원 없을 때는 마커/패널 숨김

**Test scenarios:**
- Happy path: CircleData 수신 시 `useLocations`가 API 호출, 마커 렌더링
- Happy path: S등급 마커는 금색, A는 은색, B는 동색으로 표시됨
- Happy path: 사이드패널에 거리 오름차순으로 위치 목록 표시
- Edge case: API 응답 빈 배열 → 마커 없음, 패널에 "추천 위치 없음" 표시
- Error path: API 호출 실패 → 에러 토스트 표시

**Verification:**
- 전체맵 자기장 원 감지 후 2초 이내 마커가 지도에 표시된다.
- 커버리지 95% 달성.

---

### U22. 알림 설정 UI + Web Notifications API

**Goal:** 30/20/10초 알림 체크박스 설정 UI와 Web Notifications API를 통한 브라우저 알림 발송 구현

**Requirements:** R5

**Dependencies:** U15, U6

**Files:**
- Create: `apps/frontend/src/components/AlertSettings.tsx`
- Create: `apps/frontend/src/hooks/useWebNotifications.ts`
- Create: `apps/frontend/src/__tests__/AlertSettings.test.tsx`
- Create: `apps/frontend/src/__tests__/useWebNotifications.test.ts`

**Approach:**
- `AlertSettings`: 30초/20초/10초 체크박스 3개 (독립 선택)
- `useWebNotifications` hook: `Notification.requestPermission()` 처리, 설정된 임계값 도달 시 `new Notification(...)` 발송
- 알림 권한 거부 시 UI 경고 배너 표시
- `ocrWorker`의 타이머 이벤트를 구독해 알림 트리거

**Test scenarios:**
- Happy path: 30초 체크박스 활성화 + 타이머 30초 도달 시 Notification 발송
- Happy path: 10초 체크박스만 활성화 시 10초에만 알림
- Edge case: Notification 권한 거부 시 알림 발송 안 하고 경고 표시
- Edge case: 동일 타이밍 30초에 2프레임 도달해도 알림 1회만 발송
- Edge case: 체크박스 비활성화 후에는 해당 초에 알림 없음

**Verification:**
- 실제 브라우저에서 30초 체크박스 활성화 + 타이머 30초 도달 시 OS 알림이 표시된다.
- 커버리지 95% 달성.

---

### U23. WebSocket 클라이언트 통합 + 메인 페이지 조립

**Goal:** 모든 컴포넌트(MapSelector, MapCanvas, CircleOverlay, LocationMarkers, AlertSettings, 화면공유 버튼)를 메인 페이지에 통합하고 데이터 흐름을 연결

**Requirements:** R3, R4, R5, R6

**Dependencies:** U11, U15, U19, U20, U21, U22

**Files:**
- Modify: `apps/frontend/src/app/page.tsx`
- Create: `apps/frontend/src/components/ScreenShareButton.tsx`
- Create: `apps/frontend/src/components/MainLayout.tsx`
- Create: `apps/frontend/src/__tests__/MainLayout.test.tsx`

**Approach:**
- `ScreenShareButton`: "화면공유 시작/중지" 버튼, `useScreenCapture` hook 연결
- `MainLayout`: 좌측 지도 + 우측 패널 레이아웃
- 메인 페이지 데이터 흐름:
  1. ScreenShareButton → captureWorker 시작
  2. captureWorker → capture-service 소켓 → CircleData
  3. CircleData → CircleOverlay, useLocations → LocationMarkers
  4. ocrWorker → useAlertTimer → AlertSettings → Notification
- 전역 상태: `mapType`, `circleData`, `timerState` — React Context 또는 Zustand

**Test scenarios:**
- Happy path: 화면공유 시작 버튼 클릭 시 `getDisplayMedia` 호출됨
- Happy path: 맵 선택 → 화면공유 시작 → 전체맵 열기 순서로 자기장 원이 표시됨
- Integration: capture-service mock으로 CircleData emit 시 지도에 원과 마커가 동시에 표시됨
- Edge case: 화면공유 중단 시 모든 오버레이가 초기화됨

**Verification:**
- 실제 브라우저에서 전체 플로우(화면공유 → 전체맵 → 원 표시 → 위치 마커 → 알림)가 동작한다.
- 커버리지 95% 달성.

---

## System-Wide Impact

- **Interaction graph:** captureWorker → capture-service 소켓 → CircleData → location-service REST API → LocationData → Leaflet 마커. ocrWorker → useAlertTimer → alert-service 소켓 + Web Notifications.
- **Error propagation:** 각 서비스 장애는 해당 기능만 중단시킨다. capture-service 장애 시 원/마커 표시 불가, alert-service 장애 시 서버 알림 로그만 유실 (브라우저 알림은 프론트에서 직접 발송). location-service 장애 시 마커 표시 불가.
- **State lifecycle risks:** WebSocket 재연결 시 마지막 CircleData 상태 복구 필요. 타이머 알림 중복 발송 방지를 위한 `alreadyNotified` 세트 관리.
- **API surface parity:** `@pubg-helper/shared`의 `SocketEvents` enum이 프론트/백엔드 소켓 이벤트 이름 일치를 강제한다.
- **Integration coverage:** captureWorker → capture-service 소켓 연결 + CircleData 수신 경로는 단위 테스트로 충분히 커버되지 않으므로 E2E(Playwright) 테스트 필요.
- **Unchanged invariants:** 기존 K8s 인프라(ArgoCD, Harbor, Vault, Envoy Gateway)는 이 계획에서 수정하지 않는다. 새 AppSet만 추가된다.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Hough Circle Transform Node.js 구현 복잡도 | 프로토타입에서 OpenCV.js, jimp, 직접 구현 3가지를 비교하고 가장 단순한 방법 선택 |
| 게임 화면 해상도 다양성 (1080p/1440p/4K) | TIMER_REGIONS는 3종 하드코딩, 나머지 해상도는 가장 가까운 값으로 fallback |
| Tesseract.js OCR 인식률 | whitelist 숫자+콜론으로 제한, 전처리(대비 강화) 추가로 보완 |
| Web Worker Next.js 14 App Router 호환 | `dynamic import + { ssr: false }` 패턴, 빌드 시 검증 |
| PostgreSQL 시드 데이터 미확보 | 스키마/API 구현 후 별도 이슈로 시드 데이터 수집 진행 |
| K8s 배포 브랜치 불일치 (develop vs onprem-dev-test) | 새 AppSet을 `develop` 브랜치로 작성, 기존 인프라 AppSet은 건드리지 않음 |

---

## Phased Delivery

### Phase 0 (U1~U10): 개발 환경 + 배포 인프라
- 모노레포 툴링, 공유 타입, 4개 서비스 스캐폴드, CI/CD, K8s 배포
- **완료 기준:** `https://app.yongun.shop`에서 placeholder 페이지 접근 가능, CI가 PR마다 실행됨

### Phase 1 (U11~U15): 화면 인식 엔진
- 화면캡처 Web Worker, WebSocket Gateway, 전체맵 감지, 자기장 원 추출, OCR 타이머
- **완료 기준:** 실제 게임 화면에서 CircleData가 소켓으로 수신됨, OCR 타이머 파싱 동작

### Phase 2 (U16~U18): 백엔드 API
- DB 스키마, 위치 조회 API, 알림 서비스 Gateway
- **완료 기준:** `/locations/recommend` API가 Postman에서 정상 응답

### Phase 3 (U19~U23): 프론트엔드 UI
- Leaflet 지도, 자기장 원 오버레이, 위치 마커, 알림 설정, 전체 통합
- **완료 기준:** 실제 브라우저에서 전체 플로우 동작 확인

---

## Documentation / Operational Notes

- 프로 위치 시드 데이터 없이는 Phase 3의 마커 표시가 의미 없다. Phase 2 완료 후 즉시 시드 데이터 수집 이슈를 생성해야 한다.
- Vault에 사전 등록 필요한 시크릿: `secret/pubg-helper/db` (POSTGRES_PASSWORD, DATABASE_URL)
- Harbor 프로젝트 `pubg-helper`가 사전에 생성되어 있어야 CD 파이프라인이 동작한다.

---

## Sources & References

- CLAUDE.md: 프로젝트 전체 스펙 및 기술 스택 결정
- `applicationsets/onprem-dev/10-harbor-appset.yaml`: AppSet 패턴 참조
- `clusters/onprem-dev/harbor/httproute.yaml`: HTTPRoute 패턴 참조
- `clusters/onprem-dev/harbor/external-secret-admin.yaml`: ExternalSecret 패턴 참조
