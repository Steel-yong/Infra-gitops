# PUB-34 — Phase 7 유튜브 MAP 영상 분석 (프로토타입) 체크리스트

> 2026-05-18 시작. PUBG Esports KR 채널의 MAP 뷰 영상 1개로 자기장 원 자동 검출 가능성 검증. 결정 근거는 [context-notes](2026-05-18-pub-34-context-notes.md) 참고.

## 환경 셋업

- [x] yt-dlp pip --user 설치 (2026.03.17)
- [x] imageio-ffmpeg pip --user 설치 (ffmpeg 7.0.2)
- [x] 영상 메타데이터 확인 — 4.7시간, 720p 가능

## 프로토타입 (이번 PR)

- [x] 영상 다운로드 (360p/720p/1080p purpose별)
- [x] ffmpeg 30초 간격 프레임 추출 (570프레임/4.7시간)
- [x] 자기장 원 Hough 검출 (흰 마스킹 + minRadius 15%) — 100% 검출
- [x] 팀 마커 추출 (HSV 채도 + DBSCAN) — 평균 14개/프레임
- [x] 매치 구간 자동 식별 (보라색 인트로 분류) — 6 매치 도출
- [x] 격자 라벨 OCR (easyocr) — A~H 열 + I~P 행 라벨 추출
- [x] 변환식 도출 (PUBG_x = 1.0657·px + 0.0475, 오차 0.0002)
- [x] 페이즈 1 마커 → 게임 좌표 변환 (740개)
- [x] DBSCAN 핫스팟 클러스터링 (41 클러스터)
- [x] 결과 시각화 HTML (사용자 검증용)

## 코드 정식화

- [x] apps/services/video-analyzer/ Python 모듈 8개 작성
  - [x] download.py — yt-dlp wrapper
  - [x] frames.py — ffmpeg 추출
  - [x] match_classifier.py — 인트로/매치 분류
  - [x] zone_detector.py — 자기장 검출
  - [x] marker_extractor.py — 팀 마커 추출
  - [x] grid_ocr.py — 격자 OCR + 변환식
  - [x] clustering.py — DBSCAN
  - [x] pipeline.py — 통합 진입점
  - [x] batch_analyze.py — 다중 영상 배치
  - [x] seed_writer.py — 클러스터 → seed.ts 자동 갱신
  - [x] map_classifier.py — 맵 식별 (에란겔/태이고/미라마/론도)
  - [x] intro_map_ocr.py — 인트로 화면에서 매치 맵 순서 추출 (개선 필요)
- [x] README.md
- [x] requirements.txt

## 검증

- [x] 사용자 시각 검증 — 매치 1 60/65/75/80/85분 자기장 정확
- [x] 매치 4 (태이고) 본토 모양 + 격자 라벨 시각 확인
- [x] 팀 마커가 자기장 안에 정확히 박힘 (시각 검증 80분 프레임)
- [x] 6 매치 자동 식별 (60-88/93-124/140-167/182-206/221-250/256-283분)

## 산출물

- [x] /tmp/pub34/ 분석 결과 JSON (final_v2.json, per_map_results.json)
- [x] 결과 시각화 HTML (docs/resources/mockups/)
- [x] PUB-34 시각 검증 이미지 (pub34-final-v2.jpg)
- [ ] git commit (분석 스크립트 + 산출물)
- [ ] PR base=develop, head=feature/PUB-34

## 후속 (PUB-35 이후)

- [ ] 15 PWS (MAP) 영상 배치 분석 (진행 중)
- [ ] 페이즈 2~5 zoom-in 시점 변환 (각 프레임 격자 OCR)
- [ ] 인트로 화면 OCR로 매치별 맵 순서 자동 추출 (intro_map_ocr.py 개선)
- [ ] 태이고 매치 분석 (변환식 동일 — 모든 PUBG 맵 8km 정사각)
- [ ] PUB-33 v1 시드 → PUB-34 클러스터링 결과 자동 갱신 (seed_writer.py 적용)
- [ ] PUBG Telemetry API 통합 (장기, 더 정확한 데이터)

## 비고

- PUB-33 v1 시드는 hold 상태 (worktree feature/PUB-33). 이번 결과로 v2 자동 도출 가능하면 v1 폐기.
- 한 가지 의문: MAP 영상에 모든 시간대의 자기장이 정확히 표시되는지, 또는 일부 페이즈만 뷰가 다른지.
