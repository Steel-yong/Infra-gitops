---
title: "feat: PUBG Helper 실데이터 확보 + 전체 플로우 검증 계획 v2"
type: feat
status: active
date: 2026-05-12
---

# PUBG Helper 실데이터 확보 + 전체 플로우 검증

## 배경 및 현황

기능 코드(U1~U19) 전부 구현 완료. 그러나 실제 게임 데이터가 전혀 없어 앱이 동작하지 않는다.

| 항목 | 현재 상태 | 필요한 것 |
|------|-----------|-----------|
| 맵 이미지 | 334바이트 빈 파일 | 실제 PUBG 전체맵 이미지 (1024px+, 격자 포함) |
| CirclePhase 테이블 | 0건 | 에란겔/태이고 페이즈 타이밍 데이터 |
| Location 테이블 | 0건 | 도시 수준이 아닌 **정확한 프로 포지션** 좌표 |

CI/CD(PUB-24~27)는 데이터와 전체 플로우가 검증된 후로 미룬다.

---

## Normal vs Ranked 타이밍 — 조사 결과

**결론: 현재 동일. 별도 분리 불필요.**

- Patch 23.1(2023)에서 Normal Phase 1~3을 Ranked에 맞춰 통일
- 이후 Patch 33.1까지 Blue Zone 타이밍 변경 없음
- 태이고 Phase 1은 에란겔보다 소폭 단축 (공식 수치는 wiki에 미수록 — D2에서 정확히 찾아야 함)
- **DB 구조**: CirclePhase 테이블에 erangel/taego 구분만 두면 됨. mode 컬럼 불필요.

---

## 좌표계 정의

### PUBG 좌표 → 0~1 정규화 공식

PUBG는 UE4 엔진 기준 1 unit = 1cm.
에란겔/태이고 API 좌표계 플레이어블 영역: **816,000 × 816,000 cm (8.16km × 8.16km)**
출처: documentation.pubg.com/en/telemetry-objects.html (X/Y 범위 0~816,000 확인)

```
coordX = X_cm / 816000   (서쪽 0 → 동쪽 1)
coordY = Y_cm / 816000   (북쪽 0 → 남쪽 1)
```

### PUBG 그리드 시스템 → 좌표 변환표

게임 내 그리드: 열 A~H (서→동), 행 1~8 (북→남). 각 셀 = 102,000cm × 102,000cm.

| 그리드 열 | 중심 coordX | 그리드 행 | 중심 coordY |
|-----------|-------------|-----------|-------------|
| A | 0.0625 | 1 | 0.0625 |
| B | 0.1875 | 2 | 0.1875 |
| C | 0.3125 | 3 | 0.3125 |
| D | 0.4375 | 4 | 0.4375 |
| E | 0.5625 | 5 | 0.5625 |
| F | 0.6875 | 6 | 0.6875 |
| G | 0.8125 | 7 | 0.8125 |
| H | 0.9375 | 8 | 0.9375 |

공식: 열 n번째 중심 = (2n-1)/16 (A=1, B=2, ... H=8)

예: "Pochinki는 D-E4~5 사이" → coordX ≈ 0.44, coordY ≈ 0.49

### 셀 내 세밀한 위치 (능선·컴파운드·호수)

그리드 셀 하나가 1km²이므로 그 안에 수십 개의 포지션이 있다.
세밀한 좌표는 3가지 방법 중 하나로 획득:

| 방법 | 정밀도 | 공수 | 권장 |
|------|--------|------|------|
| A. pubgmap.io 인터랙티브 맵 | 높음 | 중간 | ✅ v1 권장 |
| B. PUBG Telemetry API (프로 경기 데이터) | 최고 | 높음 | v2에서 |
| C. 트레이닝 모드 직접 방문 | 높음 | 매우 높음 | 비권장 |

**A 방법 (pubgmap.io) 접근법:**
- 사이트에서 마우스를 원하는 위치에 올리면 내부적으로 좌표 사용
- 브라우저 DevTools → Network 탭에서 API 콜 캡처
- 또는 페이지 JS에서 Leaflet CRS 좌표를 UE4 변환식 확인 후 역산

---

## 프로 포지션 데이터 수집 전략

### 왜 도시명으로는 부족한가

- 에란겔 "Pochinki" = 약 500m × 600m 범위에 수십 개 건물
- 프로들이 실제로 쓰는 건 "Pochinki 북쪽 Triple(3층집 3개)" 또는 "Pochinki 동쪽 능선"
- 자기장 반경이 r=0.05 수준으로 좁아지면 도시 내 50m 차이가 생사를 가름

### v1 수록 위치 기준

1. **명시적 랜드마크**: 게임에서 이름이 표시되는 지역 (Pochinki, School 등) — 중심 좌표
2. **능선(Ridge)**: 지형 고점으로 자기장에서 엄폐 우수 — 인터랙티브 맵에서 확인
3. **격리 컴파운드**: 도시 외곽 2~4개 건물 집합으로 방어 유리
4. **수계 인접 고지**: 호수/강 주변 산등성이 (시야 확보 + 자연 장벽)

### v2 수록 위치 기준 (PUBG Telemetry API 활용 후)

- 공식 PUBG API에서 프로 경기 telemetry 다운로드
- 각 팀의 Phase 5~8 위치 클러스터링 → 실제 최종권 포지션 50+개 추출
- 사용 빈도(usageCount) 실제 데이터로 채움

---

## 구현 단위

### D1. 에란겔/태이고 공식 맵 이미지 확보

**Goal:** 실제 PUBG 전체맵 이미지 (격자 포함, 1024px+) 확보. Leaflet CRS.Simple에 바인딩.

**접근법:**
- 소스 1: pubg.com/en/game-info/maps/{mapname} 공식 페이지 이미지
- 소스 2: pubg.wiki.gg 미디어 파일
- 소스 3: 직접 캡처 (게임 내 M키 화면 + 격자 오버레이 스크린샷)
- 형식: 정사각형 JPEG, 최소 1024×1024px
- Leaflet bounds: `[[0,0],[1,1]]` — 이미지 좌상단이 (0,0), 우하단이 (1,1)

**파일:**
- Replace: `apps/frontend/public/maps/erangel.jpg`
- Replace: `apps/frontend/public/maps/taego.jpg`
- Create: `docs/areas/pubg-coordinate-system.md` (좌표계 정의 + 변환표)

**완료 기준:** 브라우저 Leaflet에서 격자 위치와 실제 지형이 일치하는 맵 렌더링

---

### D2. CirclePhase 정확한 타이밍 시드

**Goal:** pubg.wiki.gg PC 버전 수치 기준 에란겔 9페이즈 seed. 태이고 Phase 1 별도 확인 후 분기.

**에란겔 확정 데이터 (pubg.wiki.gg, Normal=Ranked 통일 후):**

| 페이즈 | waitSeconds | shrinkSeconds | 비고 |
|--------|-------------|---------------|------|
| 1 | 120 | 270 | 최초 대기 120초 포함 |
| 2 | 0 | 180 | |
| 3 | 0 | 130 | |
| 4 | 0 | 120 | |
| 5 | 0 | 100 | |
| 6 | 0 | 90 | |
| 7 | 0 | 70 | |
| 8 | 0 | 60 | |
| 9 | 30 | 30 | 마지막 대기 30초 |

**태이고:** Phase 1 대기시간이 에란겔보다 짧다고 알려져 있으나 정확한 수치 미확인.
→ 구현 시 pubg.wiki.gg Taego 항목 직접 확인 후 분기 처리.

**파일:** `apps/services/location/prisma/seed.ts` 수정

**완료 기준:** `circle_phases` 18개 행 (에란겔 9 + 태이고 9)

---

### D3. 프로 위치 좌표 시드 (v1: pubgmap.io 기반)

**Goal:** 도시 중심이 아닌 실제 포지션 단위 (능선, 컴파운드, 고지)로 에란겔/태이고 각 30개 seed.

**접근법:**
1. pubgmap.io 에란겔/태이고 인터랙티브 맵에서 주요 포지션 위치 확인
2. 그리드 변환표로 0-1 좌표 산출
3. 각 포지션 tier 책정: S(최종권 상위 포지션), A(중반 이후 유효), B(초중반 한정)

**에란겔 포지션 카테고리 (각 카테고리당 정확한 좌표 구현 시 확정):**

```
랜드마크 중심 (8개)
  Pochinki center, School center, Military Base center,
  Georgopol center, Rozhok center, Yasnaya center,
  Mylta Power, Prison

능선/고지 (10개)
  Pochinki 북능선, School 동능선,
  Rozhok 남서 고지, Mylta Power 서쪽 능선,
  Hill E4 중앙 고지, 에란겔 남부 고지 2곳,
  Georgopol 동쪽 능선, 강변 고지 2곳

격리 컴파운드 (7개)
  Farm North, Farm South, 에란겔 중부 고립 컴파운드 5곳

수계 인접 (5개)
  대형 호수 서안, 강 상류 고지,
  Sosnovka 섬 내부 포지션 3곳
```

**태이고:** 동일 카테고리 구조로 30개

**파일:** `apps/services/location/prisma/seed.ts` 수정

**완료 기준:**
- `locations` 60개 행 (에란겔 30 + 태이고 30)
- `/locations/recommend` 호출 시 S 포지션 3개 이상 반환 (자기장 반경 r=0.2 기준)

---

### D4. 로컬 전체 플로우 검증

**Goal:** 실데이터 상태에서 실제 게임 화면으로 전체 플로우 검증.

**검증 환경:**
```bash
docker compose up -d
pnpm --filter @pubg-helper/location exec prisma migrate dev
pnpm --filter @pubg-helper/location exec prisma db seed
# 4개 서비스 + 프론트 실행
```

**체크리스트:**
- [ ] 에란겔/태이고 맵 이미지 Leaflet 정상 렌더링 (지형·격자 일치)
- [ ] 화면공유 시작 → M키 → 자기장 원 오버레이 정확한 위치에 표시
- [ ] 자기장 안 포지션 마커 (S=금, A=은, B=동) 사이드패널 출력
- [ ] OCR 타이머 30/20/10초 브라우저 알림 정상 발동
- [ ] 에란겔↔태이고 맵 전환 시 마커 초기화 확인

발견된 문제는 즉시 수정 후 재검증. D4 전 항목 통과 후 CI/CD 진행.

---

## 전체 실행 순서

```
D1 맵 이미지 확보
  → D2 CirclePhase 시드
    → D3 위치좌표 시드
      → D4 로컬 전체 검증
        → PUB-24 CI 파이프라인 (PR 이미 오픈됨)
          → PUB-25 Docker CD
            → PUB-26 K8s ArgoCD
              → PUB-27 Vault ESO
```

---

## 향후: v2 좌표 고도화 (PUBG Telemetry API)

현재 수동 수집의 한계를 극복하는 로드맵:
1. PUBG 공식 API에서 프로 대회 match telemetry 수집
2. Phase 5~9 팀 위치 클러스터링 (K-means)
3. 클러스터 중심 = 실제 프로 포지션, usageCount = 실제 사용 횟수
4. Tier는 클러스터 크기(팀 수)로 자동 산출

이 작업은 Phase 5(K8s 배포) 완료 후 별도 이슈로 진행.
