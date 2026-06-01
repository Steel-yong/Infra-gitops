# 플랜 3 — 자기장 시스템 (라이브 추출 + 발전 + 검증)

> 참조 [[00-reference-past-decisions]] §1 · [[01-research-findings]] · [[02-telemetry-verified]]. 구 [[trackA-zoom-zone/plan]] 통합(A-* → P3-*). Linear 조회 불가 → `P3-n`.
> 한 플랜에 셋을 묶는다. ① **라이브 추출**(화면공유 자기장, 제품의 심장) ② **발전**(telemetry로 반경·시프트 prior 개선) ③ **검증**(telemetry 정답 대조). 셋이 같은 "자기장 시스템"이라 함께 둔다. SIFT 부활 금지.

## 목표
화면공유 프레임에서 전체맵/줌 자기장을 **게임 절대좌표(x,y,r)**로 라이브 추출하고, telemetry로 그 prior를 발전시키고 정확도를 검증한다. 출력(라이브 자기장)은 명당(플랜1) 추천의 입력.

## 의존
- 발전(반경 테이블)이 추출 prior의 입력 → 플랜 내부 선후: **발전 P3-6 → 라이브 추출 P3-1~3**.
- 검증(P3-8)이 추출기 정확도를 채점. telemetry는 [[02-telemetry-verified]]로 접근 확정.

---

## A. 라이브 추출 (화면공유)

### P3-1. 줌 좌표변환 배선  `worktree: feature/zone-zoom-wire`
완성된 `zoom-localize.ts`(8/8) 호출 연결. 현재 `detectZoneZoom()`이 앵커만 반환(`capture.service.ts:106`).
1. `deriveZoomTransform()`+`localizeNextZone()` 호출로 절대좌표 산출.
   → 검증: 2v/4v 실프레임 절대좌표 PoC와 ±1% 일치.
2. 앵커 부재 null 가드(콜드스타트 비범위).
   → 검증: 앵커 없는 입력 유닛 → null.

### P3-2. 맵-square 검출 + 실패모드 분리  `worktree: feature/zone-map-square`
Codex MAJOR 반영. `r_px = radius_norm · map_square_px`.
1. 전체맵 프레임서 맵 사각형 한 변 px 검출·캐시.
   → 검증: 샘플 ≥10장 수동 대비 ±2%.
2. 줌 프레임(경계 안 보임)은 추정 금지 → 캐시 보정상수 사용, 없으면 명시적 실패.
   → 검증: 줌 입력서 캐시/실패 분리 동작.

### P3-3. 줌단계 식별 + soft gate (임계 명문화)  `worktree: feature/zone-zoom-level`
Codex MAJOR(baseline·임계 없음) 반영.
1. soft gate `phase+detected_r+visible_arc_ratio+center_in_crop+isGame`, 임계 명문화(arc_ratio≥A, baseline 오검출 데이터셋).
   → 검증: 가짜원 데이터셋 오검출률 baseline 대비 ≤목표(수치 명시).
2. 줌단계 모호성(같은 r_px 중복) 해소: 휠 카운트 or 현재:다음 반경비.
   → 검증: ml-zoom-verify 19장 (페이즈,줌) 분류 정확도 ≥목표.

### P3-4. ruleset 선택 경로  `worktree: feature/zone-ruleset-select`
Codex MAJOR(e스포츠/랭크/일반 prior 선택 불명확→회귀) 반영.
1. 런타임 ruleset 선택 기준(맵·모드 감지 or 기본값), 일반 화면공유 기본 prior 유지.
   → 검증: 기존 화면공유 검출 회귀 테스트 통과.

### P3-5. 부모 제약 (검출 prior)  `worktree: feature/zone-parent-prior`
[[01-research-findings]] D-GATE: 검출 prior는 full-inside 유지.
1. `zone-geometry.ts` 비례 tol 유지, 줌 검출 후보 필터로만.
   → 검증: 후반 페이즈 회귀 유닛 9/9 유지.

---

## B. 발전 (telemetry로 prior 개선)

### P3-6. 반경 prior 단일 테이블 telemetry 확정  `worktree: feature/zone-radii-table`
Codex BLOCKER(서비스 간 phase 반경 불일치) 해소 + telemetry 확증. **A의 prior 입력.**
1. `packages/shared`에 테이블 `{ruleset_id, map_name, map_side_cm, phase, radius_norm, diameter_norm, shrink, source}`. telemetry 실측(P1 0.2496…) 정답 + SUPER shrink 정합.
   → 검증: radius_norm이 telemetry+ml-zoom-verify ≤1% 일치(유닛).
2. `circle.service.ts`·`probe_ring_bbox.py` 통일(P5~7 불일치 제거), map_side 8160, radius/diameter 정리.
   → 검증: 두 서비스 동일값, grep 8000 = 0.

### P3-7. 다음 자기장 시프트·예측 prior  `worktree: feature/zone-shift-model`
1. telemetry (현재중심·반경, 다음중심) 분포 → 시프트 모델(이동 ≤ R-r, spread 경향). 단일 확정 아닌 확률분포.
   → 검증: hold-out 예측중심 vs 실제 오차분포(중앙값·90%) + 분포 커버리지율.

---

## C. 검증 (telemetry 정답 대조)

### P3-8. telemetry 검증 하네스  `worktree: feature/zone-verify-harness`
1. 토너먼트 broadcast 전체맵 프레임에 추출기(A) 실행 → 같은 매치 telemetry 자기장과 대조(매치ID 매칭), HTML residual 오버레이.
   → 검증: 동일매치 ≥N장 중심·반경 오차 분포.
2. 매칭 불가 프레임은 telemetry 자기장 맵 렌더로 합성 회귀.
   → 검증: 합성 입력 검출 오차 ≤임계(P3-9).

### P3-9. 검증 통과 임계 확정  `worktree: feature/zone-verify-thresholds`
Codex MAJOR(임계 비었음) 반영.
1. phase별 중심오차 ≤X, 반경오차 ≤Y%, 표본 ≥N 명문화.
   → 검증: 임계로 통과/미달 판정 가능.

---

## 보유 자산
완성: `zoom-detect.ts`(4/4), `zoom-localize.ts`(8/8), `zone-geometry.ts`(9/9). PoC `.local/poc_zoom_*.py`. telemetry 자료 [[02-telemetry-verified]] §5.

## Codex 반영
- 반경 테이블 통일·8160·radius/diameter(P3-6)=BLOCKER/MAJOR. map_square 실패모드(P3-2)·soft gate 임계(P3-3)·ruleset(P3-4)·검증 임계(P3-9)=MAJOR 해소.

## 상시 지침
worktree·develop·한국어 주석·`any`/`console.log` 금지·완료 전 테스트. telemetry 키 시크릿.
