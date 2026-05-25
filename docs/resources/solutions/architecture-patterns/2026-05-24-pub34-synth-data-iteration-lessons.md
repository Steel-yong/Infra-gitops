---
module: video-analyzer / pub34
tags: [synth-data, sim-to-real, yolo, iteration, ground-truth, user-verification]
problem_type: synth-data-fidelity
date: 2026-05-24
---

# 합성 데이터로 객체 검출 학습 — 진화 6회 교훈

## 적용 시점

객체 검출 학습 데이터를 **합성으로** 만들 때 첫 시도부터 빼먹지 않도록.
다음 같은 상황:
- 사용자 라벨링 회피용 합성 데이터 (sim-to-real)
- 게임 UI / 의료 영상 / 위성 사진 등 정형 패턴 검출
- 사용자가 도메인 전문가, 우리가 비전문가

## 한 줄 결론

**합성 데이터의 정확도는 metrics 99%가 아니라 사용자 시각 검수가 결정한다.** 합성을 작성하기 전 real 객체 한 frame을 확대해서 모든 디테일을 사용자와 함께 시각 확인. 빠진 디테일 1개가 검출 누락의 원인.

## 진화 과정 (PUB-34, v1 → v7)

사용자 검수 6번. 매번 빠뜨린 디테일 발견.

| 버전 | 사용자가 지적한 빠진 디테일 | 우리가 왜 빠뜨렸나 |
|---|---|---|
| v1 | 자기장 외부 색이 빨강 (실제는 파랑) | real frame 한 번 안 보고 코드 작성 |
| v2 | marker 크기 random (실제 다 동일 크기) | "다양성이 좋다"는 ML 통념 잘못 적용 |
| v2 | 이름박스 위/아래 50% (실제 100% 아래) | 한 frame 확인 안 함 |
| v3 | 흰 테두리 있음 (실제 없음) | 다른 게임 minimap 일반화 가정 |
| v4 | vehicle/airplane 아이콘 누락 | 사용자가 알려주기 전까지 모름 |
| v4 | 중심 흰 점·방향 삼각형 누락 | 같은 이유 |
| v5 | gray 색 일부러 제외 (살아있는 회색도 있음) | "회색=죽음"이라는 잘못된 가정 |
| v6 | erangel만 학습 (다른 맵 안 됨) | 한 맵부터 시작은 합리적 — 후속 작업으로 처리 |

## 핵심 패턴

### 1. 합성 시작 전 real 시각 검수 세션

코드 작성 전 사용자와 함께 1 frame 확대 + 디테일 list. 30분 투자 = 6번 iteration 절약.

체크리스트 (객체 검출 case):
- [ ] 객체 크기 분포 (random or 고정)
- [ ] 객체 색 풀 (모든 가능한 색)
- [ ] 객체 안 패턴 (점/십자/X/숫자 등)
- [ ] 객체 주변 부속 (라벨박스/방향표시/그림자)
- [ ] 객체 종류 별 변형 (살아있는/죽은/이동중/비행중)
- [ ] 배경 색 패턴 (외부 마스크/투명도)
- [ ] 텍스트 (글자 크기/색/배치)

### 2. 사용자 검수 ≠ metrics

합성 val mAP50 99.45%는 sim 환경에선 완벽. real 적용 시 사용자가 "회색 못 잡았어"라고 즉시 발견. 추론 결과 PNG 1장이 metrics 표 10개보다 진실.

### 3. ML 통념 vs 도메인 사실

"random 다양성이 학습에 좋다"는 일반 통념. 우리 case에선 **틀림** — 실제 marker가 다 동일 크기라 random은 노이즈로 학습됨. **도메인 사실이 ML 통념을 이긴다.**

### 4. 보수 vs Expansive 색 풀

색 풀 정의 시 "확실히 마커일 가능성 있는 색만"이라는 보수적 접근 위험. v5에서 gray 제외 → 회색 marker 누락. **합성 색 풀은 expansive하게.** false positive는 후처리 가능, 누락은 학습이 안 됨.

## 회피 방법

**합성 데이터 시작 체크리스트** (다음번 적용):

```
[Step 1] real 1 frame 확보 + 사용자 함께 확대 시각 검수
[Step 2] 위 체크리스트 7항목 모두 확인
[Step 3] 코드 작성
[Step 4] 합성 1장 + real 1장 좌우 비교 PNG → 사용자 검수
[Step 5] 사용자 OK 받기까지 iteration (보통 2~4회면 충분)
[Step 6] 5000장 생성 + 학습 시작
[Step 7] 학습된 모델로 real 추론 → 사용자 시각 검수
```

PUB-34는 Step 1을 건너뛰고 Step 3부터 시작 → 6번 iteration 필요. Step 1 했으면 2~3번이면 끝.

## 핵심 산출물

- 진화 산출물: `docs/archives/2026-05-24-pub34-yolo-iterations/` (25개)
- 최종 모델: `/tmp/pub34/yolo/runs/pub34_v7/weights/best.pt` (6MB)
- 최종 명당: `docs/resources/mockups/2026-05-24-pub34-myungdang-v3-v7combined.{png,json}`
- 사용자 보고서: `docs/resources/mockups/2026-05-24-pub34-myungdang-report.html`

## 관련 자료

- 고전 CV 폐기 회고: `2026-05-23-pub34-classical-cv-detection-failure.md`
- 진행 문서: `docs/projects/2026-05-23-pub34-yolo-pipeline.md`
- anchor 회고: `pub34-coordinate-transform-anchor-verification-2026-05-22.md`
