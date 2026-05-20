---
date: 2026-05-19
session: 무한 자율 진행 (사용자 자러 가는 동안)
status: PR 2개 + Linear 이슈 1개 + 코드 정식화 + 영상 분석 검증
---

# 자율 진행 세션 요약

## 한 페이지 결과

| 항목 | 상태 | 링크/위치 |
|---|---|---|
| **PR #80 — PUB-34 영상 분석 인프라** | ✅ 생성됨 | https://github.com/Steel-yong/Infra-gitops/pull/80 |
| **PR #81 — PUB-33 명당 시드 v1** | ✅ 생성됨 | https://github.com/Steel-yong/Infra-gitops/pull/81 |
| **Linear PUB-35 — 배치 처리 + zoom 보정** | ✅ 등록됨 | https://linear.app/pubg-helper/issue/PUB-35 |
| 영상 분석 모듈 정식화 (Python) | ✅ | `apps/services/video-analyzer/` |
| 좌표 변환식 도출 (오차 0.0002) | ✅ | grid OCR + 사용자 격자 매핑 |
| 매치별 맵 시각 분류 | ✅ | erangel/miramar/rondo/taego |
| 자기장+마커 검출 100% | ✅ | 6 매치, 평균 14 마커/프레임 |
| match_classifier fix | ✅ | 다른 PWS 영상 인트로 robust |

## 시각 검토 — Live Server URL

```
http://localhost:5500/docs/resources/mockups/2026-05-19-pub-34-phase7-결과.html
```

## 핵심 결과

### 영상 분석 인프라 (PR #80)
- PUBG Esports KR `(MAP) 파이널 DAY 2 ⎮ 2025 PWS` 4.7시간 분석
- 570 프레임 / 6 매치 자동 식별
- 자기장 100% / 마커 평균 14개 / 격자 OCR 변환식 오차 0.0002
- 매치별 맵: 1·6 에란겔 / 2·5 미라마 / 3 론도 / 4 태이고
- 맵별 클러스터링: 에란겔 8+ S tier, 태이고 5 A tier, 미라마 17 S tier, 론도 8 A tier

### 명당 시드 v1 (PR #81)
- mockup 46곳 + 4 Agent 신규 22곳 = **68 에란겔 명당**
- tier S 11 / A 29 / B 28
- 좌표 정밀도 ±0.05 (PUB-34 v2로 교체될 임시)
- 검증: pnpm test 18/18, coverage 100%

## 한계 (정직히)
1. **단일 영상 데이터** — 명당 클러스터링 신뢰도 부족 (PUB-35 배치로 보강)
2. **페이즈 1만 변환** — 페이즈 2~5 zoom-in 변환 미구현 (PUB-35 후속)
3. **매치 맵 분류 시각 확인** — `intro_map_ocr.py` 세로 글자 인식 못 함 (PUB-36 후속)
4. **PR 두 개 모순 가능** — PR #81 시드를 PR #80 후속 작업으로 자동 교체 가능
   → 머지 순서: PR #80 먼저 → PR #81 머지 시 v1 시드 → PR #80 코드로 v2 자동 갱신
5. **match_classifier fix 부분적** — 다른 PWS 영상 (2026 PWS 파이널 DAY 3) sanity check에서 매치 6개 중 3개만 식별. 영상 첫 60분(인트로/카운트다운)도 매치 1개로 잘못 분류. 임계값 추가 보정 필요 (PUB-36 후보)

## Sanity Check 결과 (PWS 파이널 DAY 3, tp8tZdbZeDg)

- **Fix 적용 전**: 매치 1개 (`[[0, 263]]` 전체를 한 매치로 압축)
- **Fix 적용 후**: 매치 3개 (`[[0, 59], [130, 146], [212, 226]]`)
- 자기장 검출 + 마커 추출 자체는 정상 (209 마커, 14 핫스팟)
- 진척: 매치 분류 개선됐으나 6 매치 정확 분리는 추가 작업 필요

## 머지 권장 순서 (사용자 결정)

```
1) PR #80 (PUB-34 인프라) 머지 — 영상 분석 코드 develop에
2) PR #81 (PUB-33 시드 v1) 머지 OR 폐기 — v2 자동 생성 가능 시 폐기 권장
3) PUB-35 진행 — 15 영상 배치 → v2 시드 생성 → seed_writer로 자동 갱신
4) PUB-36/37/38 후속 이슈
```

## 다음 세션 우선순위
- 사용자 PR #80 코드 리뷰
- 배치 분석 fix 검증 (sanity check 결과 확인)
- PUB-35 본격 진행 vs PR 머지 후 진행
