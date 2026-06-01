# 트랙 A — 줌(확대) 화면 자기장 추출 플랜

> 참조: [[00-reference-past-decisions]] §1, [[01-research-findings]]. Linear: 조회 불가 → 이슈번호 사용자 확정 후 부여(아래는 placeholder `A-n`).
> 한 줄 진단: 알고리즘(검출·변환·제약)은 완성·유닛통과. **변환 미배선 + 단일 반경테이블 부재 + 검증 GT 부재**가 막힘의 실체. SIFT 부활 금지.

## 목표
방송/화면공유의 **확대(줌) 프레임에서 자기장 흰 원을 게임 절대좌표로 안정 추출**하고, telemetry로 검증한다.

## 범위
- 포함: 단일 반경 테이블 통일, 좌표변환 배선, 방송 맵-square 검출, 줌단계 식별 soft gate, telemetry 기반 검증 하네스.
- 비포함(후순위): 콜드스타트(앵커 없는 중간합류) 폴백, 미니맵 경계 호 기하(D-2), ML scale 폴백.

## 트랙 간 의존
- A-2(좌표변환 배선) + A-3(맵-square 검출)이 **트랙 B B-3(줌 재seed)의 공유 토대**. A-2/A-3가 telemetry 검증(A-5)을 통과한 뒤 B-3를 그 위에 올린다.
- A-5 telemetry 하네스는 B-6(pseudo-label 검증)와 공유.

---

## 이슈 분할 (트랙당 세분화)

### A-1. 페이즈 반경 단일 소스 테이블 통일  `worktree: feature/zone-phase-radii-table`
리뷰 BLOCKER(서비스 간 phase 반경 불일치) 해소. [[01-research-findings]] A1·A3·A5.
1. `packages/shared`에 자기장 prior 테이블 정의: `{ruleset_id, map_name, map_side_cm, phase, radius_norm, diameter_norm, shrink, wait_s, move_s, dps, source_url, source_version}`. SUPER v5.0.5 shrink로 `radius_norm = 0.5·∏shrink` 생성.
   → 검증: 생성된 `radius_norm`이 리서치 §3.2 표(P1 .175 … P9 .0000067)와 유닛테스트로 일치.
2. `circle.service.ts`의 `PUBG_PHASE_RADII`, `probe_ring_bbox.py`의 `PHASE_RADIUS`를 이 테이블 참조로 교체(절대 스케일 보정상수는 방송 crop서 산출 — A-4).
   → 검증: 두 서비스가 같은 테이블에서 같은 값 산출. P5~7 불일치 사라짐(기존 .02036 vs .0223 → 단일값).
3. map_side 8000→8160 주석/계산, radius/diameter 혼용 정리.
   → 검증: grep으로 8000 잔존 0건, diameter 사용처에 `/2` 명시.

### A-2. 줌 좌표변환 파이프라인 배선  `worktree: feature/zone-zoom-wire`
[[00-reference-past-decisions]] §1.3-1. 이미 완성된 `zoom-localize.ts`를 호출만 연결.
1. `capture.service.ts:detectZoneZoom()`이 앵커를 그대로 반환(106줄)하는 대신 `deriveZoomTransform()`+`localizeNextZone()` 호출해 절대좌표 반환.
   → 검증: 2v/4v 실프레임에서 산출 절대좌표가 PoC(`poc_zoom_two_white.py`) 결과와 ±1% 일치.
2. 앵커 부재 시 null 반환 가드(콜드스타트는 비범위).
   → 검증: 앵커 없는 입력 유닛테스트 → null.
3. 변환 결과에 A-1 테이블의 phase prior 부착(반환 phase 일관성).
   → 검증: 반환 phase가 OCR/반경 prior와 모순 시 경고 로깅, 유닛테스트.

### A-3. 방송 전체맵 square(crop) 검출  `worktree: feature/zone-map-square`
[[01-research-findings]] A1·A3. 절대 스케일 보정의 핵심(crop_side ≠ map_side).
1. 방송 전체맵의 정사각형 영역 4꼭지점/한 변 px(`map_square_px`) 검출.
   → 검증: N(≥10)개 샘플 프레임에서 수동 측정 대비 ±2% 이내.
2. `r_px = radius_norm · map_square_px`로 절대 반경 산출(고정 1080p/720p 가정 제거).
   → 검증: 검출 반경 vs A-1 prior 예측 반경 오차가 페이즈별 허용범위(P1~4 ≤5~15px) 내.
3. 한 프레임 실측으로 방송별 보정상수(crop_side/map_side) 산출 후 캐시.
   → 검증: 같은 방송 다른 프레임에 보정상수 적용 시 반경 예측오차 ≤1%.

### A-4. 줌단계 식별 + soft gate  `worktree: feature/zone-zoom-level`
[[00-reference-past-decisions]] §1.3-4, [[01-research-findings]] A4·A6. **D-SEED와 별개**, 여기선 줌 자기장용.
1. soft gate 구현: `phase + detected_r_px + visible_arc_ratio + center_in_crop + isGame`로 후보 점수화(단일 hard 반경 제거).
   → 검증: 가짜 원(글자/경로선/blue zone) 포함 프레임셋에서 오검출률 측정, hard 대비 감소.
2. 같은 r_px가 여러 (페이즈,줌) 조합과 겹치는 모호성 해소: 휠 이벤트 카운트 추적 또는 현재:다음 원 반경비 매칭.
   → 검증: ml-zoom-verify 19장에서 (페이즈,줌) 정답 분류 정확도 측정.
3. `scale_from_ring = radius_norm / (detected_r_px/crop_side_px)` 산출해 기록.
   → 검증: arc_ratio 높은 프레임서 scale_from_ring이 A-3 보정상수와 일치.

### A-5. telemetry 기반 검증 하네스  `worktree: feature/zone-telemetry-verify`  ※D-TEL 선행
[[01-research-findings]] A2. A3 게이트(±0.3% GT 부재)를 telemetry로 대체. **B-6와 공유.**
1. (D-TEL 확인 후) telemetry `GameState.safetyZonePosition/Radius`+`elapsedTime`+`isGame` 수집·파싱.
   → 검증: 한 경기 telemetry 파싱해 phase별 자기장 절대좌표/반경 시계열 출력.
2. 추출 절대좌표 vs telemetry 정답 대조 리포트(HTML 오버레이 + residual).
   → 검증: 줌 프레임 추출좌표의 telemetry 대비 오차 분포(목표 임계는 D-TEL 후 확정).
3. telemetry 불가 시 폴백: 수동 라벨 `(mapCrop, phase, cx, cy, r_px)` 대조(리서치 §10.4).
   → 검증: 수동 라벨셋 ≥20장에 대해 오차 리포트.

### A-6 (선택, 후순위). 다음 원 검출 안정화 + 콜드스타트
1. 다음 원: 반경비 필터(N:N+1 ≈ shrink) + 흰픽셀 게이트로 노이즈 제거.
   → 검증: 4v 프레임 가짜 다음원(r=1798) 제거, 진짜 다음원 검출.
2. 콜드스타트 폴백 설계만(미구현, 별 이슈로 분리).

---

## 열린 결정 (이 트랙)
- **D-TEL** (A-5 선행): broadcast 경기 telemetry 접근 가능? → 사용자/조사. 불가 시 A-5는 수동라벨 폴백.
- **D-GATE**: 부모 제약 = 검출 prior(full-inside 유지) vs 학습 게이트(center-inside) 분리 — A-4·트랙B 공통, [[01-research-findings]] A4.

## 보유 자산 / 테스트
- 완성: `zoom-detect.ts`(4/4), `zoom-localize.ts`(8/8), `zone-geometry.ts`(9/9). PoC `.local/poc_zoom_*.py`, `validate-zoom-detect.cjs`.
- 신규 테스트 원칙: 각 이슈 유닛 + 실프레임 PoC 대조. 커버리지 95% 게이트(바이블).

## 상시 지침 준수 (CLAUDE 5부)
- 이슈별 worktree, PR base develop, 새 파일 첫줄 한국어 주석, `any`/`console.log` 금지, 완료 전 테스트 보고. Linear 연결은 D-TEL과 함께 사용자 확정.
