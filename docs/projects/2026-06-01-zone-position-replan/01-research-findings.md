# 딥리서치 반영 — 결정 갱신 (findings)

> 입력: `tmp/codex_pubg_zone_research.md`(PUBG 자기장 리서치, 2026-06-01) + `tmp/codex_zone_review.md`(그 리서치에 대한 Codex 리뷰, VERDICT: CHANGES_REQUESTED). 이 문서는 리서치를 [[00-reference-past-decisions]]의 열린 결정에 매핑해 **무엇이 확정/변경됐는지**만 정리한다. 원문은 tmp 보존.

---

## A. 확정·변경된 사실 (근거: 리서치 본문 §, 리뷰 항목)

### A1. 페이즈 비율은 SUPER 공식, 절대 스케일은 방송 crop 보정 ★핵심
- SUPER v5.0.5 Shrink 계수(P1 .35, P2 .55, P3 .60, P4 .60, P5 .65, P6 .65, P7 .65, P8 .70, P9 .001)로 누적반경 `rNorm[p]=0.5·∏shrink[1..p]` 계산 → P1 .175, P2 .09625, P3 .05775 … (리서치 §3.2).
- **우리 실측(`ml-zoom-verify`)과의 교차검증**: 실측 P1=.2492 P2=.1374 P3=.0815 → 비율 P2/P1=.551, P3/P2=.593. SUPER shrink P2=.55, P3=.60과 **일치**.
- **따라서**: 페이즈 간 비율(shrink)은 SUPER로 확정. 절대값은 실측(.2492)과 이론(.175)이 ~1.42배 다른데, 이는 **방송 observer 전체맵 crop_side ≠ 월드 맵 변(8160m)** 이기 때문(crop이 여백을 잘라 ~0.70배). → 절대 스케일은 한 프레임 실측으로 보정하고, 페이즈 전개는 shrink 비율로 prior.
- 이로써 [[00-reference-past-decisions]] §1.4-4(줌 단계 식별 모호)와 리뷰 BLOCKER(phase radii 서비스 간 불일치)를 동시에 해소할 통일 테이블 근거 확보.

### A2. PUBG Telemetry API = 정답 출처 ★핵심
- `GameState.safetyZonePosition/Radius`, `poisonGasWarningPosition/Radius`, `redZonePosition/Radius`, `isGame`, `elapsedTime` 제공. `Location` cm 단위, (0,0)=좌상단 (리서치 §2, 리뷰 Optional).
- **효과 1 (트랙 A)**: A3 게이트가 멈춘 이유 = control point ±0.3% GT 부재. telemetry가 경기별 자기장 절대좌표·반경의 객관 정답을 주면 **라이브 수동대조 대신 telemetry 대조로 검증 가능**.
- **효과 2 (트랙 B)**: Codex BLOCKER 4(pseudo-label 검증 기준 없음)를 telemetry 자기장/시각으로 교차검증해 해소.
- **선행 확인 필요(사실관계)**: 우리가 분석하는 broadcast 경기의 telemetry에 접근 가능한가(공식 API 키 + match ID 매칭)? → 열린 결정 D-TEL.

### A3. 좌표계·단위 확정 (리뷰 BLOCKER)
- map_side = **8160m (816000cm)** for Erangel/Miramar/Taego/Vikendi/Rondo/Deston. Sanhok 4080m, Karakin 2040m. (8000 아님)
- 픽셀식: `r_px = radius_m / map_side_m * crop_px`. 출처값이 지름이면 `radius_m = diameter_m/2`. 위키 The Playzone 표의 `4564.7, 2967.1…`은 **지름**.
- 정규화 r은 `radius/map_side`. `diameter_norm = 2·radius_norm`을 사람이 보는 지도 지름과 분리해 별도 저장.
- 프론트 마커 `[1 - y, x]`, SVGOverlay 그대로 (리서치 §10.3, 기존 CLAUDE 좌표계와 일치).

### A4. 검출 게이트는 soft (리뷰 MAJOR)
- 단일 반경 hard sanity check 취약(줌서 원 crop 밖 잘림, blue zone+white circle 동시, 현재/다음 원 혼동).
- soft gate 입력: `phase`, `detected_r_px`, `visible_arc_ratio`, `center_in_crop`, `isGame(1.0/1.5/2.0)`. (리서치 §10.2, 리뷰 MAJOR)
- 학습/검출 부모 제약: `center inside parent`(soft). **`child circle fully inside parent` 강제 금지** (spread/edge 케이스 존재, 리뷰 MAJOR). → 기존 `zone-geometry.ts`의 full-inside는 줌 **검출 후보 prior**로는 유지하되, 학습 라벨 **확정 게이트**로는 center-inside로 완화. (열린 결정 D-GATE)

### A5. e스포츠 맵 풀·소스 우선순위 (리뷰 MAJOR/Optional)
- e스포츠 broadcast = SUPER v5.0.5, Esports Mode = Ranked Mode. 일반전 위키 표와 다름. 우선 커버: **Erangel/Miramar/Taego/Vikendi/Rondo**(자기장 표 동일).
- Sanhok/Karakin/Deston = SUPER 맵 풀 밖 → second-tier, 별도 prior.
- 반경 prior는 상수배열 대신 테이블: `ruleset_id, map_name, map_side_cm, phase, radius_norm, diameter_norm, shrink, wait_s, move_s, dps, source_url, source_version`.

### A6. 검출 보조 prior (리뷰 말미)
- 학습 샘플에 저장: `visible_arc_ratio, ring_center_offset, phase_ocr_confidence, map_bbox_size, crop_side_px, scale_pred, scale_from_ring`.
- `scale_from_ring = phase_radius_norm / (detected_r_px/crop_side_px)`로 ML scale 예측과 비교, arc_ratio 낮으면 soft penalty.
- 빨간 원 = Red Zone, 자기장 후보서 제외. 작은 원 페이즈(P7~9)는 선수마커와 겹쳐 phase별 반경 prior 강하게.

---

## B. [[00-reference-past-decisions]] §4 열린 결정 → 갱신 결과

| 열린 결정 | 리서치 반영 후 |
|---|---|
| (A) 콜드스타트 폴백 범위 | 후순위 유지. telemetry 검증이 먼저. |
| (A) 라이브 검증 통과 기준 | **변경**: 수동 대조 → telemetry 대조(가능 시). D-TEL에 의존. |
| (B) 재seed anchor 1순위 신호 | 후보 3개(원 ruler / 도시 OCR / 격자선) 여전히 열림 → 멀티에이전트 설계 비교(D-SEED). |
| (B) 고화질 IP 우회 | 여전히 열림, [[incident-wsl-exit-node-overnight]] 가드 필수(D-IP). |
| (B) pseudo-label 게이트 기준 | **변경**: telemetry 교차검증 + residual histogram + 수동검수 비율(D-GATE). |
| 딥리서치 주입 슬롯 | 본 문서로 충족. |

## C. 열린 결정 처리 현황
- **D-SEED [해결, 멀티에이전트 3후보 분석]**: 재seed anchor = **후보1 자기장 원 ruler를 1순위**. 근거: 원은 줌이 깊어도 항상 1개는 보이고(가용성), 트랙 A `zoom-localize` 자산을 그대로 재사용(저비용·검증된 수학), 정확도 prior ≤0.84%. **후보2 도시 OCR**은 깊은 줌서 지명 소실 + 2026-05-20 라벨 OCR→좌표 바다 누적 전량폐기와 동일 실패계열이라 **1순위 부적합 → 보조 교차검증으로만**(closed-vocab+fallback금지+잔차RANSAC). **후보3 격자선**은 스케일이 트랙 A와 중복이고 절대 칸 식별이 다시 라벨 OCR로 회귀(폐기 이력) → **드롭(야지/바다 칸 보조만)**. (분석 결과는 트랙 B B-3 반영)
- **D-TEL [검증 중]**: 일반 매치 API는 **14일 보관**(3개월 아님). 우리는 `tournaments` 엔드포인트 사용 — 공식 문서에 토너먼트 보관기간 **미명시** → `.local/verify-pubg-telemetry.py`로 최근 대회 매치의 최오래된 createdAt 확인해 실측. telemetry에 `safetyZonePosition/Radius` 존재·다운로드 무키 확인됨. **결정 보류: 스크립트 실측 후.** 검증(A-5/B-6) 단계까지 시간 있음.
- **D-IP**: 고화질 수집 IP 우회 방식. → 사용자 + [[incident-wsl-exit-node-overnight]] 가드. (B-1 선행)
- **D-GATE**: 부모 제약을 검출 prior(full-inside)와 학습 게이트(center-inside)로 분리 확정. → 플랜 명문화(거의 결론, [[trackA-zoom-zone/context-notes]] 참조).

## D. 리뷰가 지적한 우리 코드 직접 수정 대상 (BLOCKER)
- `circle.service.ts`의 `PUBG_PHASE_RADII`와 `probe_ring_bbox.py`의 `PHASE_RADIUS`가 P5~7 불일치({5:.02036,6:.01018,7:.00509} vs {5:.0223,6:.0123,7:.0068}) → **단일 테이블로 통일**(트랙 A-1).
- map_side 8000→8160 주석/계산 점검.
- radius/diameter 혼용 정리.
