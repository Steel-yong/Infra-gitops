---
date: 2026-05-21
session: PUB-34 자동 진화 루프 4시간 결과
status: 좌표 변환 정확도 ✓ / 마커 추출 false positive 다수 → 다음 단계로 넘기기 전 필터링 필요
linear: PUB-34
---

# PUB-34 — 자동 진화 루프 4시간 결과

## 한 페이지 요약

| 항목 | 결과 | 평가 |
|---|---|---|
| 진화 시간 | 4시간 (15:40 → 19:40) | 정시 종료 |
| Cycle 수 | **8,258 cycles** | 평균 1.7s/cycle |
| BEST cycle | **#2270** (78분 시점) | 이후 plateau |
| BEST score | **173.99** | 시작 113 → 174 (+54%) |
| pass_rate | **100%** (451/500 프레임 통과) | ✅ |
| reprojection error | **0.237 px ≈ 1.6m** | ✅ 매우 정확 |
| markers extracted | 19,394개 | — |
| DBSCAN clusters | 45개 | — |
| **결정적 문제** | **#1 cluster에 16,768개 false marker (전체 86.5%)** | ⚠️ |

**한 줄 결론**: 맵 좌표화는 정확하다(평균 1.6m). 하지만 마커 추출 단계에서 영상 미니맵 중앙의 UI 요소(본인 마커 또는 중심 십자선)가 모든 프레임에서 같은 위치(School 384m)에 false marker로 잡혀 클러스터링을 망친다. 다음 단계 진행 전 마커 필터링 필수.

## BEST 파라미터 (cycle 2270)

```json
{
  "nfeatures": 6000,
  "ratio_thresh": 0.8,
  "ransac_thresh": 2.0,
  "inlier_min": 8,
  "error_max": 1.5,
  "base_size": 1200,
  "preproc": "hist_eq",
  "frame_resize": 2.0,
  "minimap_corner": "BL",
  "minimap_size_frac": 0.15,
  "sat_min": 130,
  "val_min": 180,
  "marker_area_max": 150
}
```

**발견된 핵심 인사이트**:
- 영상의 미니맵은 **좌하단(BL) 작은 영역** (전체의 15% 크기)
- **2배 확대 + histogram equalization** 후 SIFT 매칭이 최적
- nfeatures=6000, base_size=1200 큰 베이스맵
- inlier_min=8 (낮춤) → RANSAC이 자동 정제

## 스코어 진화 곡선

```
시작 1분 (smoke)   → 113.68
5분  (c159)        → 168.24 (pass 1.0, err 0.15, city 40%)
24분 (c698)        → 168.64 (city 57%)
39분 (c1129)       → 171.78 (city 64%)  ← city 최고치
75분 (c2163)       → 172.53 (err 0.15, city 54%)
78분 (c2270)       → 173.99 (city 61%)  ★ 종합 BEST
78분~240분 (6000 cycle 더) → plateau, 미미한 개선만
```

## 클러스터 TOP 5 (DBSCAN eps=0.012, min_samples=8)

| # | 게임 좌표 | 마커 수 | 가까운 도시 | 거리 | 판단 |
|---|---|---|---|---|---|
| 1 | (0.494, 0.471) | **16,768** | School | 384m | ⚠️ **false positive 집중** (전체 86.5%) |
| 2 | (0.149, 0.245) | 124 | Zharki | 720m | 바다 인접 — 의심 |
| 3 | (0.229, 0.034) | 113 | Zharki | 1233m | 맵 외곽/바다 — 의심 |
| 4 | (0.916, 0.576) | 84 | MyltaPower | 183m | ✅ **진짜 명당 후보** |
| 5 | (0.055, 0.836) | 77 | Primorsk | 1431m | 바다 — 의심 |

전체 45개 클러스터 데이터: `docs/resources/mockups/2026-05-21-pub34-evolve-final-clusters.json`

## 검증 시각화

| 파일 | 용도 |
|---|---|
| `docs/resources/mockups/2026-05-21-pub34-evolve-final.png` | 전체 결과 (격자 A1~H8 + 도시 라벨 + 모든 마커 + 클러스터) |
| `docs/resources/mockups/2026-05-21-pub34-evolve-final-small.png` | 위 시각화 1/2 크기 |
| `docs/resources/mockups/2026-05-21-pub34-evolve-final-clusters.json` | 45개 클러스터 raw 데이터 |

**확인 포인트**:
- ✅ 27도시 anchor(노란 원)가 게임 내 도시 위치와 정확히 일치 → 좌표 변환 OK.
- ✅ 격자 A~H × 1~8 게임 좌표계 오버레이로 위치 표기 가능.
- ⚠️ School 부근 빨간 큰 원(#1) — 16,768개 마커 집중 = 노이즈.
- ⚠️ 바다 영역의 보라색 원들 — 1000m 이상 외곽 클러스터 = 모두 의심.
- ✅ #4 MyltaPower 183m / 84개 — 도시 근접 + 충분한 표본 = 진짜 명당 후보.

## 원인 (False Positive 분석)

전체 마커 중 86.5%가 좌표 (0.494, 0.471) 한 점에 모임:
- 영상 미니맵은 줌인된 상태로 중앙이 항상 본인 시점.
- 미니맵 중앙에 항상 같은 위치에 있는 UI 요소 = **본인 위치 마커** 또는 **미니맵 중심 십자선** 또는 **줌 인디케이터**.
- 매 프레임 같은 픽셀 위치 → homography 변환 후 동일 게임 좌표 (School/Pochinki 사이)에 누적.
- HSV 채도/명도 필터만으로는 이걸 제외 못함.

## 코드 산출물

| 파일 | 용도 | 상태 |
|---|---|---|
| `apps/services/video-analyzer/auto_evolve.py` | 4시간 자동 진화 루프 | untracked → 커밋 필요 |
| `apps/services/video-analyzer/render_evolve_report.py` | 전체 프레임 분석 + 시각화 | untracked → 커밋 필요 |
| `apps/services/video-analyzer/sift_pipeline.py` | 어제 v2 파이프라인 | untracked → 커밋 필요 |
| `/tmp/pub34/auto_evolve_v1/best.json` | BEST 파라미터 | 임시 (commit 안 함) |
| `/tmp/pub34/auto_evolve_v1/history.jsonl` | 8,258 cycle 전체 기록 | 임시 |
| `/tmp/pub34/auto_evolve_v1/log.txt` | 진행 로그 | 임시 |

## 다음 액션

1. **False positive 제거 알고리즘** — 가장 시급:
   - 옵션 A: 프레임별 **자기 위치 마커 검출** (미니맵 중앙 고정 위치 마커 마스킹).
   - 옵션 B: 클러스터 후처리 — **너무 큰 클러스터(전체 50%+ 점유)는 자동 노이즈 분류**.
   - 옵션 C: HSV 색상 범위를 **팀 색상별로 좁힘** (red/blue/green/yellow/purple/orange 6팀).
2. **워크트리 untracked 코드 일괄 커밋** (auto_evolve.py, render_evolve_report.py, sift_pipeline.py, 기타).
3. False positive 제거 후 명당 좌표 추출 → PUB-33 시드 정밀화 단계 진입.

## 정리된 산출물

`docs/archives/2026-05-pub34-intermediate/`로 이동된 파일:
- `2026-05-21-pub34-cycle3-ensemble.png/small` 등 새벽 진화 중간 PNG 16개 (4hour-best 보존)
- `/tmp/pub34/auto_evolve_v1/best_cycle_*.png` 중간 9개 삭제 (cycle_2270만 보존)

## 보존 산출물 (메인 폴더)

| 파일 | 의미 |
|---|---|
| `2026-05-21-pub34-4hour-best.png` | 새벽 06:50 4시간 자동 루프 최종 (도시 26/27 매칭) |
| `2026-05-21-pub34-evolve-final.png` | 오늘 19:40 진화 루프 최종 (격자+라벨 포함 검증 시각화) |
| `2026-05-20-pub34-diagnose-cities.png` | 27도시 좌표 시각 검증 (어제 사용자 검증 완료) |
| `2026-05-20-pub34-sift-match-cities.png` | SIFT 매칭 도시 시각화 |
