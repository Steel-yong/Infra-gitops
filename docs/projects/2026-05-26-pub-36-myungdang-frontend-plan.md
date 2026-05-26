# PUB-36 — 명당 지도 표시 (도넛 마커 + S/A/B/C 토글, 정적 JSON)

> Linear PUB-36. 워크트리 `feature-PUB-36` (base develop). PUB-34 명당 도출 결과를 프론트에 표시.
> 계획 본문 — checklist·context-notes 동반.

## 무엇을 왜

PUB-34에서 영상 98편 분석으로 명당 737개(에란겔, S/A/B/C 조건부 등급)를 도출했다. 이걸 실제 프론트 지도에 도넛 마커 + 등급 토글로 표시한다. 기존 `LocationMarkers`(더미 자기장-기반 추천)는 더미 데이터라 제거한다.

## 핵심 결정

- **정적 JSON** — 명당은 오프라인 계산된 정적 참조 데이터. DB/백엔드 불필요. `apps/frontend/public/data/myungdang-erangel.json`.
- **도넛 마커** — `CircleMarker` `fillOpacity:0` + 색 테두리. 지도 가림 최소화.
- **색** — S=빨강 `#ff3b3b` / A=주황 `#ff9f1c` / B=노랑 `#ffe600` / C=하늘 `#4db8ff`.
- **크기** — 최대 = A(주황). S도 A와 동일 캡(빨강이 너무 커서). B<A, C 최소.
- **토글** — S/A/B/C 버튼, 처음 전부 켜짐, 해제 시 해당 등급 숨김.

## 범위

| 동작 | 대상 |
|---|---|
| 삭제 | `LocationMarkers`, `useLocations`(+테스트). 우측 `LocationPanel`은 명당 범례·등급수로 용도 변경 |
| 유지 | `StashMarkers`(비밀창고), `CircleOverlay`(자기장), 캡처·타이머·알림 |
| 추가 | `public/data/myungdang-erangel.json`, `useMyungdang` 훅, `MyungdangMarkers` 컴포넌트, S/A/B/C 토글 UI(page.tsx 상태) |

## 단계 (각 단계 검증 방법 포함)

1. 명당 데이터 변환 → `public/data/myungdang-erangel.json` (737개, {gx,gy,tier}) → **검증**: 파일 존재 + 737개 + 등급수 S14/A43/B109/C571 일치.
2. 명당 포인트 타입 정의 (`MyungdangTier 'S'|'A'|'B'|'C'`, `MyungdangPoint`) → **검증**: 타입체크 통과.
3. `useMyungdang(mapType)` 훅 — 정적 JSON fetch → **검증**: 유닛테스트(로드 성공/실패/맵전환).
4. `MyungdangMarkers` 컴포넌트 — 도넛 CircleMarker, 색/크기/좌표 `[1-gy,gx]`, `visibleTiers` prop으로 필터 → **검증**: 렌더테스트(개수·색·도넛 옵션·필터).
5. S/A/B/C 토글 UI — page.tsx에 `visibleTiers` 상태, 지도 위 버튼 → **검증**: 토글 테스트(클릭 시 해당 등급 on/off).
6. 더미 제거 — `LocationMarkers`/`useLocations` 삭제, page.tsx에서 명당으로 교체, 우측 패널 용도변경 → **검증**: `pnpm --filter frontend build` 통과 + 죽은 import 0.
7. 커버리지 → **검증**: `pnpm --filter frontend test:coverage` 95%↑.

## 파일

- Create: `apps/frontend/public/data/myungdang-erangel.json`
- Create: `apps/frontend/src/hooks/useMyungdang.ts` (+ test)
- Create: `apps/frontend/src/components/MyungdangMarkers.tsx` (+ test)
- Modify: `apps/frontend/src/app/page.tsx` (토글 상태·UI, LocationMarkers→MyungdangMarkers)
- Modify/Repurpose: `apps/frontend/src/components/LocationPanel.tsx` (명당 범례·등급수)
- Delete: `apps/frontend/src/components/LocationMarkers.tsx`, `apps/frontend/src/hooks/useLocations.ts` (+ 각 테스트)
- (선택) `packages/shared` 또는 frontend 로컬에 명당 타입

## 리스크

- 737개 CircleMarker 렌더 성능 — Leaflet에서 수백~수천 마커는 일반적으로 OK. 문제 시 canvas 렌더러(`preferCanvas`) 검토.
- `useLocations` 삭제가 다른 곳에 영향? — page.tsx·LocationPanel·테스트만 사용. 확인 후 삭제.
- 좌표계 — `CircleData.y`/명당 gy는 이미지좌표(위0). Leaflet은 `[1-gy, gx]` (기존 LocationMarkers와 동일).
