# 트랙 B 컨텍스트 노트 — 결정과 이유 (Codex 검수용 근거)

> 참조 [[plan]], [[01-research-findings]], `2026-05-31-pub-41-marker-constellation-codex-review.md`.

## 왜 "1페이즈만 됨"이 핵심 구조 문제인가
- phase1 전체맵에서만 seed → 줌/phase2+ 클립은 라벨 생성 불가. 검출률 10%(저해상도+이름박스 폐기)와 별개로, 데이터가 phase1에 갇히는 근본은 **재seed anchor 부재**. (근거 [[00-reference-past-decisions]] §2.3-3, PUB-41 Codex BLOCKER 3)

## 왜 B-1·B-2를 먼저(트랙 A와 독립)
- 고화질 수집(5~7배)·이름박스 복원(2~3배)은 좌표변환과 무관하게 즉시 검출수 이득. 빠른 데이터 확보로 후속 학습 품질 상승. (근거 §2.3-1)

## 왜 B-3가 트랙 A 위에 서는가 ★
- 줌 프레임 재seed는 "줌 픽셀→게임 좌표" 변환이 필수인데 그건 트랙 A `zoom-localize`와 동일 인프라. A-2/A-3가 telemetry 검증 통과해야 B-3 좌표가 신뢰됨. 순서 역전 시 검증 안 된 변환 위에 라벨 쌓아 오염. (근거 [[01-research-findings]] 트랙 의존)

## 왜 학습 게이트는 center-inside(soft)인가 (D-GATE)
- full-inside 강제는 spread/edge 정답을 버림(Codex 리뷰 MAJOR). 라벨 확정은 center-inside soft, full-inside 위반은 경고만. 검출 prior(트랙 A)와는 분리. (근거 [[01-research-findings]] A4)

## 왜 telemetry로 pseudo-label을 검증하나
- Codex BLOCKER 4(라벨 품질 기준 없음) → 나쁜 라벨이 모델 악화. telemetry 자기장/시각이 객관 교차검증 제공. 불가 시 HTML 오버레이+residual+수동검수로 폴백. (근거 [[01-research-findings]] A2, PUB-41 리뷰)

## 착수 전 답해야 할 사실관계 (Codex 미답)
- YOLO 출력에 마커 색상/팀명/타입 포함 여부 → B-4 correspondence 방식 좌우.
- phase1 seed 전역좌표가 수동검증 GT인지 자동결과인지 → 검증 신뢰 기준.
- 추출 fps(1fps면 optical flow/smoothing 약함) → B-4 설계.

## 리스크
- D-IP: Tailscale exit node 전역라우팅이 자율작업 죽인 이력([[incident-wsl-exit-node-overnight]]) → 프리플라이트 가드 필수.
- best.pt 재학습 비용(RTX2080Ti 1.5~2h) → 라벨 오염 시 손실 큼, B-6 게이트 선행 가치.
- 단독 결론 금지 → Codex 검수 경유.
