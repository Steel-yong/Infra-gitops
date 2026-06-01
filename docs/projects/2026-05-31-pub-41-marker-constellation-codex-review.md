# PUB-41 Marker Constellation Propagation Codex Review.

## Blocking
- [BLOCKER] 현재 plan은 `t-1 global marker set`과 `t pixel marker set` 사이의 correspondence가 이미 풀린 것처럼 RANSAC affine을 적용한다. YOLO가 낸 점 집합만 있으면 어떤 현재 점이 어떤 이전 player인지 모르는 상태라, 단순 RANSAC affine은 잘못된 짝으로도 그럴듯한 변환을 만들 수 있다. 반드시 색상, 팀 라벨 OCR, marker class, optical flow, 이전 transform 예측값으로 후보 대응을 만든 뒤 Hungarian 또는 gated nearest-neighbor로 대응을 제한해야 한다.
- [BLOCKER] 장면 전환과 caster cut 처리가 약하다. “직전 frame과 변화량 threshold”만 쓰면 다른 카메라, 인터미션, 다른 맵, spectator UI, replay cut에서 false positive pseudo-label을 만들 수 있다. fullmap/zoom-map detector, Erangel lock, inlier ratio, residual distribution, scale jump, marker count, viewport overlap을 합친 hard gate가 필요하다.
- [BLOCKER] 실패 구간 재시드 전략이 부족하다. “다음 phase 1 frame”만 기다리면 계속 zoom인 구간이나 phase 2 이후부터 시작한 클립은 라벨을 못 만든다. zoom frame 자체에서 재시드할 앵커가 필요하다. 후보는 현재 자기장 원 ruler, 도시명 OCR, grid line, coastline/road distance-transform retrieval, 또는 수동 1점/2점 bootstrap이다.
- [BLOCKER] pseudo-label 품질 검증 기준이 없다. 이 작업은 학습 데이터 생성기가 틀리면 모델을 더 망친다. 라벨 저장 전 HTML overlay 샘플, residual histogram, confidence bin별 수동 검수, reject reason 통계, held-out 수동 라벨 50~100장 비교가 gate로 들어가야 한다.

## Should Fix
- [MAJOR] 1초 간격으로 propagation하지 말고 가능한 한 높은 frame rate로 추적해야 한다. zoom in/out 1초면 viewport scale과 crop이 크게 바뀌고 marker 출입도 많다. 5~10fps 추적 후 학습용으로 downsample하는 방식이 더 안전하다.
- [MAJOR] affine보다 similarity transform을 기본값으로 둔다. PUBG map viewport는 북고정, 균일 scale, translation이므로 회전과 shear를 허용하는 affine은 잘못된 correspondence를 흡수해 false positive를 늘린다. affine은 UI 캡처 왜곡이 실측으로 확인될 때만 fallback으로 둔다.
- [MAJOR] RANSAC threshold `3px`는 너무 빡빡할 가능성이 크다. detector center jitter, video compression, anti-aliasing, marker 크기 변화까지 고려하면 720p 기준 reprojection 6~12px부터 sweep하고, global normalized residual은 0.003~0.006 map width를 1차 후보로 둔다.
- [MAJOR] minimum inlier는 “최소 계산 가능 수”가 아니라 false positive 방지 기준으로 잡아야 한다. similarity는 수학적으로 2쌍이면 되지만 commit 기준은 최소 5~6 inlier, affine은 최소 6~8 inlier, inlier ratio 0.35~0.5 이상, non-collinear spread가 viewport 대각선의 25% 이상이어야 한다.
- [MAJOR] temporal gating은 단일 threshold가 아니라 예측 창이어야 한다. scale은 직전 scale 대비 0.5x~2.0x/frame까지 후보로 열되, center 이동은 viewport 크기와 scale 변화량에 비례해 제한하고, cut 의심 시 state를 `LOST`로 바꿔 새 seed만 허용해야 한다.
- [MINOR] phase radius prior는 player 위치 변환 라벨의 직접 검증 수단이 아니다. 자기장 원이 보이면 strong gate가 되지만, 안 보이는 zoom frame에서는 “현재 라벨이 게임 규칙과 모순 없음” 정도의 weak gate로만 써야 한다.

## Questions
- plan 본문이 사용자 메시지에는 비어 있었고, 검수는 feature 워크트리의 `docs/projects/2026-05-31-pub-41-marker-constellation/plan.md`를 기준으로 했다.
- YOLO detector가 marker 색상, 팀명 라벨 박스, 숫자/IGN OCR, marker type을 같이 내는가? 점 좌표만 내면 propagation은 fragile하다.
- source video에서 추출 가능한 fps는 얼마인가? 1fps만 가능하면 optical flow와 multi-frame smoothing이 크게 약해진다.
- phase 1 seed frame의 player marker global 좌표는 수동 검수된 ground truth인가, SIFT+YOLO 자동 결과인가? seed가 틀리면 이후 모든 propagated label이 틀린다.

## Verification
- 실행한 테스트는 없다. 이번 작업은 plan 검수이며 소스 코드를 변경하지 않았다.
- 확인한 문서: `docs/projects/2026-05-27-pub-39-*`, `docs/projects/2026-05-30-pub-41-map-lock-gate/*`, feature 워크트리의 `docs/projects/2026-05-31-pub-41-marker-constellation/plan.md`.

## Instruction Compliance
- Linear 조회 불가. 현재 세션에 Linear 도구가 노출되어 있지 않다.
- `docs/projects/` 계획 파일과 관련 PUB-39/PUB-41 문맥을 읽었다.
- 리뷰 파일을 남겼다. 단, feature 워크트리는 현재 writable root 밖이라 메인 워크트리의 `docs/projects/2026-05-31-pub-41-marker-constellation-codex-review.md`에 저장했다.
- 테스트는 plan 검수라 실행하지 않았다.
- 사용자 결정이 필요한 시각화 HTML은 만들지 않았다. 이번 요청은 선택지 결정용 HTML이 아니라 plan 검수다.

VERDICT: CHANGES_REQUESTED
