# PUB-34 — YOLOv11 player marker 검출 파이프라인

> 영상에서 프로 위치 자동 추출 — 고전 CV 2주 실패 후 **합성 데이터 + YOLOv11 fine-tune** 으로 전환 (2026-05-23).
> Linear: PUB-34. 워크트리: `feature-PUB-34`. 작업 폴더: `/tmp/pub34/yolo/`.

## 한 페이지 요약

| 항목 | 값 |
|---|---|
| 목표 | 영상 미니맵에서 player marker 자동 검출 → 게임 좌표 → PUB-33 명당 시드 |
| 모델 | YOLOv11n (Ultralytics, 6MB) fine-tuned |
| 학습 데이터 | **합성 5000장** + val 500장 (사용자 라벨링 0건) |
| 학습 환경 | RTX 2080 Ti 12GB, 80 epoch, ~1.5~2시간 |
| 클래스 4종 | player_static / name_box / player_vehicle / player_airplane |
| 진실원천 | `best.pt` (모델 가중치 파일, ~6MB) |

## 왜 YOLO인가

| 시도 | 결과 |
|---|---|
| HSV 색 필터 + HoughCircles (PUB-30~32) | false positive 86% — 폐기 |
| label-box left-edge = player (5/22) | 완전히 안 맞음 — 폐기 |
| SIFT homography + 진화루프 4시간 | 좌표 변환은 정확(1.6m). 마커 추출 자체는 못 함 |
| OWLv2 zero-shot (5/23) | score 0.3 미만, name box 0 검출 — 실패 |
| **합성 데이터 + YOLOv11 fine-tune** | **선택 — 진행 중** |

**전환 이유**: 객체 검출은 2015년 이후 딥러닝이 압도적 SOTA. 색/크기/뭉침/노이즈에 강건. 한번 학습하면 모든 영상 무한 적용.

## 영상에서 확인된 사실 (사용자 검증)

영상 한 프레임(`weekly_test_720p` 3600s)을 확대해서 사용자 시각 검증:

1. **모든 player marker는 단색 동그라미 (흰 테두리 없음)** — radius ~10px 고정
2. **모든 살아있는 player에 100% 이름박스가 동그라미 아래에** 부착됨
3. 동그라미 **중심에 작은 흰 점** 표시
4. 일부 marker에 **바라보는 방향으로 원 밖 삼각형**
5. **운전대 아이콘** = 차량 이동 중, **비행기 아이콘** = 비행 중
6. 이름박스 글자는 박스 안에 fit (잘림 없음)

## 합성 데이터 생성 규칙 (v5 — 최종)

코드: `/tmp/pub34/yolo/synth_gen.py`

| 요소 | 규칙 |
|---|---|
| 베이스맵 | `apps/frontend/public/maps/erangel.jpg` random crop + zoom + desaturate (영상 톤 매치) |
| 자기장 | 흰 원 + 외부 짙은 파란 마스크 (alpha 0.55~0.75). 학습은 marker만 하지만 distractor로 그림 |
| Player marker | radius 10 고정, 단색 (6 팀 색), 흰 테두리 없음, 중심 흰 점, 60% 방향 삼각형 |
| 비율 | 70% static / 15% vehicle / 15% airplane |
| 이름박스 | 100% 부착, marker 바로 아래, 글자 box 안 fit (cv2.getTextSize 사용) |
| Distractor | 죽음 마커, 도시 라벨 — 학습 라벨 X, 그림만 |

## 학습 설정

| 항목 | 값 |
|---|---|
| 베이스 모델 | `yolo11n.pt` (Ultralytics 공식, COCO 사전학습) |
| 이미지 사이즈 | 1280 (영상 그대로) |
| 클래스 | 4 (player_static / name_box / player_vehicle / player_airplane) |
| epoch | 80 |
| batch | 8 (GPU 메모리 6.87GB) |
| optimizer | AdamW lr=0.001 cosine schedule |
| early stop | patience 20 |
| device | cuda:0 (RTX 2080 Ti) |
| AMP | True (mixed precision) |

## 산출물 위치

| 파일/폴더 | 보관 정책 |
|---|---|
| **`/tmp/pub34/yolo/runs/pub34_v1/weights/best.pt`** | **학습 결과 — 보관 필수** (6MB). 워크트리/Harbor 이전 예정 |
| `/tmp/pub34/yolo/synth_gen.py` | 합성기 코드 — 워크트리 commit 예정 |
| `/tmp/pub34/yolo/train_chain.sh` | 학습 스크립트 — 워크트리 commit 예정 |
| `/tmp/pub34/yolo/synth/data.yaml` | 데이터셋 설정 — 워크트리 commit 예정 |
| `/tmp/pub34/yolo/synth/images,labels/` | 학습 데이터 5500장 — **학습 끝나면 삭제** (재생성 가능) |
| `/tmp/pub34/yolo/frames/` | inference 검증용 60장 |
| `docs/resources/mockups/2026-05-23-pub34-yolo-synth-v5-*.png` | 합성 vs real 비교 시각화 (v5만 보관) |

## 영상 파일 정책

| 파일 | 상태 | 용도 |
|---|---|---|
| `/tmp/weekly_test_720p.mp4` (1.3GB) | 보관 | 현재 main inference target |
| `/tmp/pub34/video1080.mp4` (2.5GB) | 보관 | 다른 영상 1080p (yETU 또는 PGS 추정) |
| 그 외 5개 영상 | **삭제됨 (5/23)** | 옛 시도 |

**중요**: 영상은 **학습에 사용하지 않음**. 학습은 합성 5000장 only. 영상은 **inference 단계**(학습된 모델 적용)에서만 필요. 한 영상당 추출 장수는 추출 간격에 따라 30초 간격이면 ~500장.

## 다음 단계 (학습 완료 후)

1. **학습 결과 확인** — best.pt mAP50 / mAP50-95 점수
2. **inference 파이프라인 통합**
   - 영상 frame → YOLO → 박스 좌표
   - SIFT homography로 게임 좌표 변환 (기존 코드 그대로)
   - JSON 저장 + 시각화 PNG
3. **사용자 시각 검수** — real 영상 frame에 YOLO 결과 overlay PNG 5장
4. 통과 시 → **PUB-33 명당 시드 정밀화**: 여러 영상에 적용 → 클러스터링 → 명당 좌표 추출
5. 코드 commit (PUB-34 워크트리) + 학습 산출물 보관 정책 정립

## 결정 이력 (대화 요약)

| 순번 | 결정 | 이유 |
|---|---|---|
| 1 | 고전 CV 폐기, 딥러닝 전환 | 2주 시도 실패. 객체 검출은 딥러닝이 SOTA |
| 2 | OWLv2 zero-shot 먼저 시도 | 라벨링 없이 끝낼 수 있는지 빠른 확인 |
| 3 | OWLv2 실패 → 합성 데이터 전환 | score 너무 낮음. 도메인 특화 필요 |
| 4 | 사용자 라벨링 0건 정책 | 합성 데이터는 라벨이 자동 (우리가 그릴 때 정답 앎) |
| 5 | YOLOv11n (nano) 선택 | 작고 빠름. 학습 30~60분. 작은 객체 검출 강함 |
| 6 | 4 클래스 (static/name/vehicle/airplane) | 사용자 피드백 — 이동 중은 별도 분류해야 명당 후처리 가능 |
| 7 | 학습 결과는 파일(.pt), DB 아님 | 표준 ML 워크플로우. 영원히 재사용 가능 |
| 8 | 영상 파일 정리 (5개 삭제) | 학습에 안 쓰고 inference에만 필요. 1.3GB main 1개로 충분 |
