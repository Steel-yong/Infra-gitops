---
date: 2026-05-20
status: archived
linear: PUB-34
reason: 자율 분석 1차 시도 — 좌표 부정확으로 전량 폐기
---

# PUB-34 1차 시도 archive

자율 영상 분석으로 명당 좌표를 도출하려 한 1차 시도(2026-05-19~20). 사용자 시각 검증 결과 **좌표 정확성이 보장되지 않아 전량 폐기**됨.

## 폐기 사유

`apps/services/video-analyzer/stream_analyze.py` (PUB-34 워크트리)가 줌인 미니맵의 격자 라벨(F7, K3 등) OCR로 좌표 변환을 수행했으나, OCR 실패율이 높아 default transform fallback이 빈번 발동. fallback 좌표가 맵 동쪽 끝(Lipovka/MyltaPower)으로 누적된 결과, 엄격 필터 통과 3곳 중 1곳이 바다 위에 찍힘.

검증된 27도시 좌표를 anchor로 쓰지 않은 게 구조적 결함.

## 다음 단계

영상 분석을 **도시명 OCR anchor 기반**으로 재구성. 격자 라벨은 보조 신호. (`docs/projects/2026-05-20-pub34-검증-결과.md` 참고)

## 파일 목록

| 파일 | 내용 |
|---|---|
| 2026-05-19-pub-34-batch-results.md | 1차 배치 결과 (3 배치, 14 영상 성공) |
| 2026-05-19-session-summary.md | 1차 시도 세션 요약 |
| 2026-05-20-자율-진행-결과.md | 잘못된 결과 보고서 (BEST 53곳/SECONDARY 159곳) |
| 2026-05-20-myungdang-best-vs-secondary.html | 잘못된 결과 시각화 |
| 2026-05-20-myungdang-best-ingame.png | 잘못된 BEST 53곳 마커 이미지 |
| 2026-05-20-myungdang-secondary-ingame.png | 잘못된 SECONDARY 159곳 마커 이미지 |
| 2026-05-20-myungdang-v17-검수.html | v17 sea-filter 검수 |
| 2026-05-20-myungdang-v17-sea-filtered.png | v17 sea-filter 마커 |
| CLAUDE.draft.md | CLAUDE.md 이전 버전 초안 (현재 CLAUDE.md가 발전된 형태) |
