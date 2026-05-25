# PUB-34 — YOLO 전환 전 시도 산출물 보관

> 2026-05-23. YOLOv11 fine-tune 전환과 함께 폐기된 시도 산출물.
> 현재 진행: `docs/projects/2026-05-23-pub34-yolo-pipeline.md`

## 보관 이유

PUB-34 player marker 검출에 2주 시도한 고전 CV 접근 산출물. 다음 사람이 같은 길 안 가도록 보관.

## 파일

### HSV/색 클러스터링 시도 (5/21)

| 파일 | 무엇 |
|---|---|
| `2026-05-21-pub34-validate.png` | 1시간 검증 루프 best iter — HSV 색 채널 분리 + DBSCAN |
| `2026-05-21-pub34-validate-small.png` | 위 절반 미리보기 |
| `2026-05-21-pub34-validate.json` | HIGH confidence hotspot 좌표 + 통계 |
| `2026-05-22-pub34-validate-tiers.png` | 4계층 신뢰도 (S=4, A=15, B=27, C=29) |

**왜 폐기**: false positive 86% (한 점에 16,768개 marker 누적). HSV 임계값 튜닝으로 해결 불가.

### Label-box left-edge 시도 (5/22)

라벨박스 left-edge = player 위치 알고리즘 1차 검증. 사용자 4규칙(레드존 제외/차량 제외/라벨박스 ≠ player/같은팀 cluster 1점) 적용.

| 파일 | 무엇 |
|---|---|
| `2026-05-22-pub34-weekly-detect-v1-erangel.png` | 88 raw markers + 27도시 anchor + 격자 (매치 1 40:30~48:30) |
| `2026-05-22-pub34-weekly-detect-v1-overlay-2460s.png` | 720p frame 41:00 overlay |
| `2026-05-22-pub34-weekly-detect-v1-overlay-2520s.png` | 720p frame 42:00 overlay |
| `2026-05-22-pub34-weekly-detect-v1-overlay-2550s.png` | 720p frame 42:30 overlay |
| `2026-05-22-pub34-weekly-detect-v1-poc-zone3-zoom.png` | 자기장 3단계 12개 검출 + 박스 left-edge 위치 검증 |
| `2026-05-22-pub34-weekly-detect-v1-markers.json` | per-frame timestamp + 게임 좌표 + 색 + 가까운 도시 |

**왜 폐기**: 사용자 시각 검증 — "전혀 다름". 라벨박스 left-edge가 player 동그라미 위치와 일치하지 않음.

## 교훈

전체 회고: `docs/resources/solutions/architecture-patterns/2026-05-23-pub34-classical-cv-detection-failure.md`
