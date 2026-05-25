# PUB-34 YOLO 학습 iteration 산출물 보관 (25개)

> 2026-05-23~24. 합성 데이터 v1→v7 + 모델 v1→v7 + 클러스터 v1→v3 진화 산출물.
> **최종 결과는 `docs/resources/mockups/2026-05-24-pub34-myungdang-*` (3개) + 보고서 HTML.**

## 보관 이유

사용자 검수 6차례 거치며 합성 데이터를 실제 영상과 매치시킨 진화 과정. 다음 번 비슷한 작업 시 "어떤 디테일을 빼먹으면 안 되는지" 참고.

## 합성 진화 (v1 → v7)

| 버전 | 변경 | 폐기 원인 |
|---|---|---|
| v1 (초안) | 베이스맵 + marker + name box | 톤이 real과 너무 다름 (빨간 마스크, 밝은 톤) |
| v2 | 자기장 외부 파란 마스크, desaturate | marker 크기 random, 이름박스 위/아래 50% |
| v3 | marker radius 10 고정, 이름박스 100% 아래 | 흰 테두리 있음 (실제는 없음) |
| v4 | 흰 테두리 제거 | vehicle/airplane 아이콘 누락 |
| v5 | vehicle/airplane + 중심 흰 점 + 방향 삼각형 + 글자 fit | gray 색 누락 (사용자 직감 "회색 못 잡았다") |
| **v6** | gray 3종 추가 | erangel 한정 (다른 맵 학습 X) |
| **v7** | taego 베이스맵 추가 (multi-map) | **최종** (단 classify_frame이 erangel만 통과해서 효과 미미) |

## 모델 진화 (v1 → v7)

| 모델 | 학습 데이터 | mAP50 | 실제 영상 결과 |
|---|---|---|---|
| v1 | v5 합성 5000장 80 epoch | 99.45% | erangel marker 일부 누락 (회색 못 잡음) |
| v6 | v6 합성 5000장 60 epoch (v1 → fine-tune) | 99.46% | erangel marker +60% (player 5→8) |
| v7 | v7 합성 5000장 60 epoch (v6 → fine-tune) | 99.47% | erangel marker +2~12% (classify 한계) |

## 클러스터링 진화

| 버전 | 입력 | 결과 |
|---|---|---|
| v1 | weekly v6 추론 645 마커 | 42 클러스터, Pochinki 편중 |
| v2 | weekly+1080 v6 추론 850 마커 | 48 클러스터, Novorepnoye S 등급 등장 |
| **v3** | weekly+1080 v7 추론 889 마커 | **51 클러스터, S 2개 (Pochinki+Novorepnoye)** |

## 교훈

전체 회고: `docs/resources/solutions/architecture-patterns/2026-05-24-pub34-synth-data-iteration-lessons.md`

요약:
1. **합성 데이터 만들기 전에 real 객체 한 frame 확대 시각 검증 필수.** 흰 점·테두리·삼각형·아이콘 종류 다 사전 확인.
2. **사용자 검수가 ground truth.** "이게 진짜 marker인가" 정성 평가가 metrics 99%보다 정확.
3. **gray 같은 "당연한 색 빠뜨림"이 가장 큰 누락 원인.** 색 풀 정의는 보수적이 아니라 expansive하게.
4. **합성 → 실제 transfer는 디테일이 결정.** marker 크기 random vs 고정, 이름박스 위치 등 픽셀 단위 디테일 모두 영향.
