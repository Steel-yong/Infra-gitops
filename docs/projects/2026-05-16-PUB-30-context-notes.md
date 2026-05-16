# PUB-30 자기장 검출 — Context Notes

> 2026-05-16 작업 중 내린 결정과 이유. 다음 세션이 이어가는 근거.

## 1. 빨간 픽셀 — 보고서에서 완전히 제거

### 결정
보고서 "빨간 픽셀 — 게임 UI일 뿐, 무시" 섹션 삭제. 빨간 원에 대한 어떤 해석도 문서에 남기지 않는다.

### 이유
- 빨간 픽셀은 이미 흰 임계값(R/G/B ≥ 240) · 파란 조건(b > r+30) 둘 다에서 자동 제외됨.
- 보고서에 "빨간 원 = 다음 페이즈 미리보기 표시"라고 적었으나 검증되지 않은 추측. 코드에 영향 없으니 설명 자체가 불필요.

### 적용
- `docs/resources/mockups/2026-05-16-자기장-검출-시스템-보고서.html` 섹션 3에서 빨간 픽셀 panel 제거.

---

## 2. 페이즈 1 파란 비율 누적 특성

### 결정
페이즈 1은 "외부 파란이 0%에서 시작해 천천히 차오르는" 특수 상태로 보고서에 명시.

### 이유
- PUBG 페이즈별 시간 진행 특성:
  - 페이즈 1 wait (120초): 자기장 없음, 파란 0%.
  - 페이즈 1 형성 직후: 흰 원 그려짐, 외부 파란은 아직 거의 없음.
  - 페이즈 1 줄어들기 시작: 파란이 0% → 5% → 15% → 30% → 50%+ 로 누적.
  - 페이즈 2 이후: 새 자기장 형성 시점에 이미 외부가 파랗게 채워져 있음.
- 즉 페이즈 1 초반엔 blue ratio가 5% 임계값 근처에서 진동할 수 있음.
- 현재 코드는 blue-edge 실패 시 white 모드로 폴백하므로 실제 검출엔 문제 없음. 다만 보고서 텍스트가 이 특성을 다루지 않아 오해 소지 있음.

### 적용
- 보고서 섹션 4 (게임 상태별 검출 결과) 행 추가 + 모드 분기 설명에 페이즈 1 누적 명시.

---

## 3. Cold start 페이즈 후보를 [1, 2, 3, 4]로 제한

### 결정
`circle.service.ts`의 `allPhasesForBlueEdge` 배열을 `[1, 2, 3, 4, 5, 6, 7, 8]` → `[1, 2, 3, 4]`로 변경.

페이즈 5~8은 hintPhase가 잡힌 후 `hintPhase ±1` 확장으로만 후보에 진입.

### 이유
- 화면공유 시작 타이밍은 거의 항상 페이즈 1~4 (90% 이상).
- 페이즈 7~8의 기대 반경(5.5px, 2.7px)은 너무 작아 화면 잡음 흰 픽셀 3개에 우연히 매칭될 확률 매우 높음.
- 현재 score floor 200으로 일부 차단되지만 가끔 200~300 score로 통과하는 가짜 검출 발생.
- 후보 자체에서 제외하면 RANSAC이 작은 원을 아예 만들지 않음 → 잡음 매칭 원천 차단.

### 트레이드오프
- 화면공유 도중 페이즈 7~8에서 처음 켜는 경우 첫 락이 잡힐 때까지 검출 불가.
- 이런 케이스는 1% 미만으로 추정. 허용 가능.

### 적용
- `apps/services/capture/src/capture/circle.service.ts:78` 한 줄 변경.

---

## 4. Score threshold — 보수적 값 유지 (40% 그라디언트 시도 후 되돌림)

### 최종 결정
기존 공식 그대로 유지. `baseScore = 800`, `floor = 200`, 페이즈별 반경 비례.

```ts
function minScoreForPhase(phase: number): number {
  const baseScore = 800;
  const ratio = PUBG_PHASE_RADII[phase - 1] / PUBG_PHASE_RADII[0];
  return Math.max(200, Math.floor(baseScore * ratio));
}
// 결과: 800/440/242/200/200/200/200/200
```

### 시도 과정
1. **40% 균일 그라디언트** (`maxScores × 0.4 + floor 80`) 시도 → 1200/728/402/221/110/80/80/80.
2. **불안 요인 발견:** 페이즈 1 외곽선 두께가 1px(안티에일리어싱 환경)인 경우 진짜 자기장도 1200 못 넘을 위험.
   - 두께 1px → 외곽선 픽셀 ~1659개 → 1200/1659 = 72% inlier 필요. 너무 빡빡.
   - 두께 2px 환경에서만 안전. 사용자 환경 가변성 큼.
3. **되돌림 결정:** 페이즈 5~8 잡음 차단은 [coldStartPhases](#3-cold-start-페이즈-후보를-1-2-3-4로-제한) 한 가지로 충분. Score 그라디언트는 실측 후 결정.

### 이유 (왜 보수적이 옳은가)
- 코드 변경 효과를 한 번에 둘(cold start + score) 적용하면 어느 쪽 효과인지 분리 측정 불가.
- Cold start [1,2,3,4] 단독 효과 먼저 측정 → 잡음 검출 줄어들면 score는 안 건드려도 됨.
- 줄어들지 않으면 그때 score 그라디언트 도입.

### 다음 측정 항목
- [ ] 화면공유로 페이즈 1 wait 동안 false detection 빈도 측정.
- [ ] 실제 페이즈 1~3 검출 시 score 값 분포 로그 수집 (capture.service.log 이미 찍힘).
- [ ] 외곽선 두께 실측 (PUBG raw 캡처 분석).

### 변수 정리
- `r`: 자기장 반경 (px). PUBG 공식 페이즈 데이터로 결정.
- `2πr`: 원 둘레.
- 외곽선 두께: 1~2px (사용자 환경 가변).
- `tolerance`: RANSAC inlier 판정 거리 (±2.0px).
- `maxPts`: RANSAC 입력 점 상한 (3000). 페이즈 1~2만 cap에 걸림.
- 잡음 매칭률: 작은 원일수록 ↑. 페이즈 6 이하는 무작위 픽셀로도 score 30~100 가능 → cold start 후보 제거로 차단.

### 적용
- `apps/services/capture/src/capture/circle.service.ts` `minScoreForPhase` 함수 — 기존 공식 유지.

---

## 5. 페이즈 OCR — 현재 비활성화 상태 유지

### 현재 상태
`useOcrTimer.ts:324` `PHASE_OCR_ENABLED = false`로 비활성화.

### 비활성화 이유
- 페이즈 ROI 비율 좌표(`x=0.940, y=0.700, w=0.050, h=0.040`)가 1917×1198 단일 게임 캡처 기준으로 측정됨.
- 사용자 화면 비율·해상도·UI 스케일이 다를 때 "페이즈 N" 글자에서 빗나가 인접 UI 숫자를 잡아 4/5/6 등으로 잘못 읽음.
- 잘못된 hintPhase가 RANSAC을 잘못된 페이즈로 유도해 검출 망침.

### 재활성화 조건
1. 사용자가 실제 게임 raw 캡처(PNG) 제공.
2. "페이즈 N" 글자 정확한 픽셀 좌표 측정.
3. `PHASE_REGION_RATIO` 재계산 (worker/timer-ocr-utils.ts).
4. 디버그용 ROI 박스 시각화 추가 (선택).
5. `PHASE_OCR_ENABLED = true`.

### 영향
- 페이즈 OCR 없이도 자기장 검출은 동작 (cold start [1,2,3,4] + lastPhase 세션 추적으로 hintPhase 대체).
- OCR 활성화 시 추가 정확도 향상이 기대되나 필수는 아님.

---

## 다음 세션 인계 사항

- [x] context-notes 결정 4건 코드 + 보고서 반영 (이번 세션).
- [x] 페이즈 OCR 재활성화 — UI 디버그 미리보기로 ROI 시각 보정 (y 0.700 → 0.695). `PHASE_OCR_ENABLED = true`.
- [x] 변경 후 검출 잡음 측정 — 페이즈 1~4 실 게임 검증 통과.

---

## 6. 최종 아키텍처 — 이벤트 기반 OCR 게이트키퍼 (2026-05-17 추가)

### 결정
폴링 기반에서 이벤트 기반으로 전환. OCR 페이즈 인식을 게이트키퍼로 두고, 모든 락을 sticky로 만듦.

### 핵심 룰
1. **OCR 게이트키퍼:** `capture.gateway`가 `currentPhase` 없으면 RANSAC 호출 자체 안 함. 자기장 형성 = "페이즈 N" 표시.
2. **OCR 페이즈 sticky:** `useOcrTimer`가 currentPhase 락 후 빈 결과로 절대 null 리셋 안 함. 다른 페이즈가 확정되어야 갱신.
3. **자기장 락 sticky:** `useLockedCircle`이 자동 해제 로직 전부 제거. 페이즈 전환 또는 수동 unlock만.
4. **parentCircle 제약:** `circle.service`가 이전 락된 원 안 픽셀만 RANSAC 후보. 검출 결과 중심도 안에 있어야 채택.
5. **1초 OCR 폴링:** 페이즈 OCR 5초 → 1초로 단축, confirm 3 → 2.

### 이유
- 폴링 기반은 게임 준비 중에도 RANSAC 돌려 가짜 검출 발생.
- 페이즈 추정이 검출 결과에 의존하면 첫 잘못된 검출이 페이즈도 망침.
- 락 자동 해제는 맵 닫고 파밍 시 락 풀리는 사용자 불편 야기.
- parentCircle 제약은 PUBG 룰(N+1 ⊂ N) 강제로 잡음 매칭 원천 차단.

### 변경된 파일 (11개)
**Backend:**
- `apps/services/capture/src/capture/circle.service.ts` — OCR 게이트, parentCircle 필터링, 흰 임계값 220
- `apps/services/capture/src/capture/capture.gateway.ts` — OCR 게이트키퍼, parentCircle 전달
- `apps/services/capture/src/capture/capture.service.ts` — parentCircle 전달

**Frontend:**
- `apps/frontend/src/hooks/useOcrTimer.ts` — 1초 폴링, sticky, 디버그 미리보기
- `apps/frontend/src/hooks/useLockedCircle.ts` — 자동 해제 제거, sticky
- `apps/frontend/src/hooks/useCaptureSocket.ts` — setParentCircle 추가
- `apps/frontend/src/app/page.tsx` — lockedCircle → parentCircle 연결
- `apps/frontend/src/components/TimerPanel.tsx` — 페이즈 OCR 디버그 박스
- `apps/frontend/src/workers/timer-ocr-utils.ts` — ROI y 0.700 → 0.695
- `apps/frontend/src/hooks/playAlarmBeep.ts` — Web Audio 비프 → 사용자 음원 m4a 재생

**Shared:**
- `packages/shared/src/types/socket-events.ts` — parentCircle 필드 추가

**Assets:**
- `apps/frontend/public/audio/alarm.m4a` — 사용자 제공 알람 (87KB)

### 검증
페이즈 1~4 실 게임 테스트 정상 동작:
- 풀맵 켠 후 ~2초 안에 페이즈 락
- 자기장 검출 및 락 표시
- 맵 닫고 파밍해도 락 유지
- 페이즈 1 → 2 → 3 → 4 자동 갱신 (parentCircle 안에서 검색)

---

## 7. 향후 작업 (별도 이슈 권장)

### 7.1 맵 확대 상태 자기장 인식
현재 알고리즘은 풀맵 정사각형 전제. 사용자가 휠로 확대하면 디스크 bounding box가 어긋남.
**방향:** 줌 레벨 추정 + 호(arc) fitting 또는 확대 시 OCR 게이트 강화.

### 7.2 위치 추천 UI 우측 사이드바로 이동
현재 위치 추천이 왼쪽 사이드바 아래에 있음. 우측 사이드바 신설해서 분리.
**레이아웃:** 좌 280px (자기장 정보) + 중앙 가변 (맵) + 우 280px (위치 추천).
