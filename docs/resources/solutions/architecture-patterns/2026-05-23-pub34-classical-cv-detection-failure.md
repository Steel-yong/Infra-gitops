---
module: video-analyzer / pub34
tags: [classical-cv, deep-learning, object-detection, yolo, sim-to-real, failure-pattern]
problem_type: detection-approach-selection
date: 2026-05-23
---

# 고전 CV로 게임 영상 player marker 검출 — 2주 실패 회고

## 적용 시점

다음 같은 문제를 만났을 때 이 문서 먼저 읽어라:
- 영상/이미지에서 **작은 객체 검출**이 필요
- 객체에 **색·크기·뭉침·노이즈** 변동성 있음
- 고전 CV(HSV 필터 / HoughCircles / template matching / SIFT 진화) 검토 중

## 한 줄 결론

**객체 검출은 2015년 이후 딥러닝(YOLO 등)이 압도적 SOTA.** 색·크기·뭉침 변동 큰 작은 객체에 고전 CV는 원리적으로 못 따라간다. 패턴 매칭으로 우회 시도 ≈ 2주 손실.

## 실패한 시도 5종 (PUB-30~33, 5월)

### 1. HSV 색 채널 필터 + 모폴로지 + DBSCAN
- 6 팀 색 분리 → 임계값으로 marker 픽셀 추출 → 클러스터링
- **결과**: false positive 86%, 한 점에 16,768개 marker 누적
- **원인**: 미니맵 중앙의 UI 요소(자기 위치 마커/십자선)가 모든 프레임에 같은 픽셀 위치 → 동일 게임 좌표 누적. HSV 필터로 이걸 제외 불가.

### 2. HoughCircles로 직접 원 검출
- OpenCV HoughCircles로 동그라미 검출
- **결과**: false positive 다수, 미니맵 격자선·도시 라벨도 원으로 검출
- **원인**: HoughCircles는 noise에 약함. 작은 원(radius 10)은 threshold 튜닝 끝없음.

### 3. SIFT + Homography 좌표 변환 진화 루프
- 4시간 자동 진화 8,258 cycle → pass_rate 100%, reprojection error 0.237px ≈ 1.6m
- **결과**: 좌표 변환 자체는 정확. 그러나 marker 추출 단계가 위의 HSV 의존이라 false positive 그대로.
- **교훈**: 부분 정확도 ≠ 전체 성공. **정답(ground truth) 없이 점수만 보고 진화시키면 plateau에 갇힘.**

### 4. Label-box left-edge = player 위치
- 이름박스의 좌측 가장자리 좌표를 player 좌표로 가정
- **결과**: 사용자 시각 검증 — "전혀 다름"
- **원인**: 영상에서 이름박스는 player 동그라미 **아래**에 있음. left-edge와 player 좌표는 무관.

### 5. OWLv2 zero-shot (텍스트 프롬프트 검출)
- "small colored circle", "name label box" 같은 자연어 프롬프트로 검출 시도
- **결과**: score 0.3 미만, name box 0개 검출
- **원인**: zero-shot 모델은 도메인 특화 객체(게임 미니맵 marker)에 약함. 일반 사진 학습됨.

## 진짜 정답: YOLO fine-tune + 합성 데이터

```
[1] Ultralytics YOLOv11n 다운로드 (Apache 2.0, 무료)
[2] 합성 데이터 5000장 생성
    - erangel.jpg 베이스 + random marker + name box + 자기장
    - 라벨은 우리가 그릴 때 좌표 알고 있음 → 자동 생성
[3] RTX 2080 Ti에서 80 epoch fine-tune (1.5~2시간)
[4] best.pt 6MB 파일로 영구 자산
[5] 영상 frame에 추론 → SIFT homography → 게임 좌표
```

## 왜 합성 데이터인가 (사용자 라벨링 0건)

실제 영상 frame은 정답(박스 좌표)이 없음. 사람 손 라벨링 5000장 = 약 300시간. 비현실적.

**합성은 정답이 공짜** — 우리가 marker를 그릴 때 좌표를 안다. 5000장 자동 생성 5분.

합성 → 실제 transfer가 가능한 이유 (sim-to-real):
- player marker는 정형 모양 (동그라미)
- 게임 UI 일정 — 합성으로 재현 가능
- 사용자 6차례 시각 검수로 합성을 실제와 거의 동일하게 맞춤

부족하면 Phase 2 — 학습된 모델로 영상 자동 라벨 → 사용자 검수만 → 재학습 (시간 90% 단축).

## 핵심 교훈 (다음 비슷한 문제 만났을 때)

1. **객체 검출 = YOLO부터 검토.** 고전 CV 우회 시도 금지.
2. **정답(ground truth) 없이 알고리즘 평가 금지.** 평가 못 하면 plateau에 갇힘.
3. **라벨링이 문제라면 합성 데이터부터.** sim-to-real이 deep learning 표준 기법.
4. **부분 정확도가 전체 성공 아님.** 좌표 변환이 정확해도 마커 추출이 망가지면 끝.
5. **zero-shot 모델(OWLv2/GroundingDINO)은 도메인 특화 객체에 약함.** 빠른 시도 후 곧장 fine-tune으로.
6. **사용자 시각 검수가 진짜 정답.** "점수 173" 같은 추상 지표 ≠ "이게 player야".

## 관련 자료

- 현재 진행: `docs/projects/2026-05-23-pub34-yolo-pipeline.md`
- anchor 좌표 검증 학습: `pub34-coordinate-transform-anchor-verification-2026-05-22.md`
- 폐기 산출물: `docs/archives/2026-05-23-pub34-pre-yolo/README.md`
- Linear: PUB-34, PUB-33
