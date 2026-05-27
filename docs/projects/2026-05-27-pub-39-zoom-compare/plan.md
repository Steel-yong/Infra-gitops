# PUB-39 줌 로컬라이제이션 — 방법 2·1·5 실측 비교 (PoC-first)

## 목표
줌 프레임에서 자기장(다음 안전구역) 절대좌표를 무마찰 복원하는 3개 방법을 **파이썬 PoC로 만들어 기존 프레임에 돌려 비교**하고, 이긴 방법만 TS(capture-service)로 제품화한다.
사용자 지시: "2·1·5 각각 구현 → 어떤 게 좋은지 → 최고 결과만." 5번이 2번 필요하면 5번 안에 2번 포함 허용.

## 비교 대상
- **방법2 (원 ruler 재앵커)**: known 원(파란 블루존 벽 또는 직전 락된 원) = 앵커+자. 흰 안전구역 원 검출 → scale·offset → 절대중심. 필요 검출이 전부 검증된 원 RANSAC뿐(최저 리스크).
- **방법1 (플레이어 앵커 윈도우 lock)**: 줌 프레임 플레이어 아이콘 검출 + 알려진 P_world → translation → 절대중심. 사용자 정정으로 아이콘 가시성↑.
- **방법5 (factor graph 융합)**: 가용 앵커(원 ruler + 플레이어 + 도시라벨)를 신뢰도·오차모델로 합쳐 best 추정 + confidence + sanity 게이트. 2번을 내부에 포함 가능.

## 정답(ground truth) — 도시 라벨 기반
줌 프레임에 도시명이 보이고 `packages/shared/src/data/erangel-cities.ts`에 27도시 정규화좌표(gx,gy)가 있다.
→ 각 테스트 프레임의 흰 안전구역 원 중심이 어느 도시인지 식별 → 그 도시 좌표 = 진짜 중심(정답).
보조: 페이즈별 전체맵 사진(1페·2페)으로 앵커(P_world / known 원 abs)를 시뮬레이션.

## 비교 지표
- **정확도**: 예측 절대중심 ↔ 정답 거리(정규화 0~1). 작을수록 좋음.
- **가용성**: 각 방법이 프레임별로 결과를 낼 수 있었나(아이콘/원 보임 여부).
- **sanity 통과율**: parent 포함·scale 제정신·phase 일관.

## 테스트 프레임 (.claude/images)
- 줌: `2v.png`(현재 가정 phase2), `4v.png`(phase4), `2페확대.png`, `2페확대2.png`, `1페확대.png`.
- 전체맵(앵커·정답 보조): `1페.png`, `2페.png`, `2페 (1).png`.

## 산출물
- `.local/poc_m2_ruler.py`, `poc_m1_player.py`, `poc_m5_fusion.py`, `poc_groundtruth.py`, `poc_compare.py`.
- `.local/pub39-shots/overlay_*.png` (검출 오버레이), `compare_result.json`.
- `docs/resources/mockups/2026-05-27-report-zoom-compare-result.html` (최종 비교+추천).
- (이긴 방법) TS 제품화 계획 + worktree + 테스트.

## 안전 규칙 (자동 루프)
- develop/worktree에만 커밋. main 금지. push 금지(사용자 요청 시만).
- 외부 네트워크·삭제 없음. 변경마다 즉시 커밋.
- 코드 검수는 Codex(`review_loop.sh`) 또는 CORE 5부 자가검수.

## PUBG 색 가정 (아침에 사용자 확인)
- 흰 원 = 찾을 안전구역(타겟). 큰 파란 원 = 현재 블루존 벽(known 앵커 후보).
