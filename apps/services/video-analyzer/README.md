# video-analyzer

> PUBG e스포츠 (MAP) 영상에서 자기장·팀 위치를 자동 추출해 PUB-33 명당 시드 데이터를 갱신하는 Python 분석 파이프라인. PUB-34에서 프로토타입 검증, PUB-35에서 배치 처리 + zoom 보정 후속.

## 분석 흐름

```
유튜브 (MAP) 영상 URL
    │
    ├─ 1. yt-dlp 다운로드 (360p mp4 video-only)
    │
    ├─ 2. ffmpeg 30초 간격 프레임 추출 (~570 프레임/영상)
    │
    ├─ 3. 매치 구간 자동 식별 (보라색 인트로 vs 매치 화면)
    │      └─ 6개 매치 자동 분리
    │
    ├─ 4. 매치별 자기장 원 검출 (Hough + 흰 마스킹, minRadius 15%)
    │
    ├─ 5. 팀 마커 추출 (HSV 채도 > 100 + DBSCAN)
    │
    ├─ 6. 격자 라벨 OCR (페이즈 1, easyocr)
    │      └─ A~H 상단 column + I~P 좌측 row (PUBG 1~8 매핑)
    │
    ├─ 7. 변환식 도출 (격자 픽셀 → PUBG 게임 정규화)
    │      └─ X 변환 = 1.0657*px + 0.0475, Y 변환 = 1.0000*py + 0.0416
    │
    ├─ 8. 페이즈 1 시점 마커 → 게임 좌표 변환
    │
    └─ 9. DBSCAN 클러스터링 → 핫스팟 도출 (tier S/A/B)
           └─ 매치별 참여 횟수로 tier 결정 (3매치↑=S, 2매치=A, 1매치=B)
```

## 파일 구조

| 파일 | 역할 |
|---|---|
| `pipeline.py` | 진입점. URL/파일 받아 전체 파이프라인 실행 |
| `download.py` | yt-dlp 다운로드 |
| `frames.py` | ffmpeg 30초 간격 프레임 추출 |
| `match_classifier.py` | 인트로 vs 매치 분류 |
| `zone_detector.py` | 자기장 원 검출 |
| `marker_extractor.py` | 팀 위치 마커 추출 |
| `grid_ocr.py` | 격자 라벨 OCR + 변환식 도출 |
| `clustering.py` | 핫스팟 도출 + tier 매핑 |
| `seed_writer.py` | seed.ts 자동 갱신 |

## 의존성

```
yt-dlp, imageio-ffmpeg, opencv-python-headless, numpy, scikit-learn, easyocr
```

설치: `pip install -r requirements.txt`

## 한계 (PUB-34 v1)

- **페이즈 1 시점만 변환** (자기장 형성 후 +3분, zoom ≈ 1).
- 페이즈 2~5 (zoom-in) 시점 마커 변환은 PUB-35 후속.
- 매치 1~6 자기장+마커 검출은 모든 페이즈 가능, 변환만 페이즈 1 한정.

## 검증된 데이터셋

- 영상: PUBG Esports KR 채널, [(MAP) 파이널 DAY 2 ⎮ 2025 PWS](https://www.youtube.com/watch?v=yETUqntffvc)
- 6 매치 자동 식별 → 페이즈 1 마커 게임 좌표 변환 → 41 클러스터
- 6중 추천 S tier 3곳: (0.735, 0.601) (0.522, 0.780) (0.781, 0.451)

## 후속 작업

- PUB-35: 15개 PWS (MAP) 영상 배치 처리 + 페이즈 2~5 zoom 보정
- PUB-36: 태이고 영상 분석 + 좌표 시스템 (8km×8km 동일)
- PUB-37: seed.ts 자동 갱신 + 운영 워크플로우
