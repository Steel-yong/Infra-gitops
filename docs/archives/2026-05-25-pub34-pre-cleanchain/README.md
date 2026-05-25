# 2026-05-25 PUB-34 — 정품 combiner 이전 산출물

`cluster_chain_combined.py`의 소스를 (MAP) 정품(`results_chain_map/`)만 쓰도록 정리하기 전의 명당 산출물 보관.

## 폐기 이유

옛 combiner는 `results_chain`(1차 일반영상 109편, 영상당 0.4마커 "무의미") + `full_results_weekly_10s/v8zone`(같은 weekly_test 단일 영상 이중 카운트) + `1080`까지 모두 합쳤다. 그 결과 클러스터 입력 static 1,671개 중 1,021개(61%)가 단일 weekly_test 중복이라 Pochinki 과분할(S등급 5개)이 발생했다.

정품화 후 (MAP 영상만): static 491, 클러스터 32개, S등급 = School·Quarry(여러 영상 반복). 검수 경위는 `docs/resources/mockups/2026-05-25-decision-pub34-data-midcheck.html` 참고.

## 파일

| 파일 | 무엇 |
|---|---|
| `2026-05-24-pub34-myungdang-v3-v7combined.*` | 옛 "최종" 명당 (v3+v7 모델 결합) |
| `2026-05-24-pub34-myungdang-building.*` | building 단위 클러스터 시도 |
| `2026-05-24-pub34-myungdang-report.html` | 옛 메인 보고서 |
| `2026-05-25-pub34-map-chain-midpoint.html` | 28편 시점 중간점검 (오염 분석 없음) |
| `2026-05-24-pub34-myungdang-zooms/` | 오염 클러스터(Pochinki 과분할) 기준 줌인 20장 |
| `2026-05-25-pws-test-0~3-erangel_fullmap.png` | PWS 영상 프레임 분류 일회성 테스트 |
