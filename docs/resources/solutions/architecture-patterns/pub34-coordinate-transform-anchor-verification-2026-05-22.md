---
title: PUB-34 영상 좌표 변환 — anchor 기반 + 강한 자가검증 원칙
date: 2026-05-22
category: docs/resources/solutions/architecture-patterns
module: video-analyzer
problem_type: architecture_pattern
component: tooling
severity: high
applies_when:
  - 영상/이미지 프레임의 픽셀 좌표를 게임/지도 정규화 좌표로 변환할 때
  - 변환식이 OCR·외부 신호에 의존해서 실패할 가능성이 있을 때
  - 좌표 데이터를 다시 클러스터링·집계해서 의사결정 자료로 쓸 때
  - 자체 시각 검증 결과를 ✓로 선언하려고 할 때
related_components:
  - capture-service
  - location-service
tags:
  - pub-34
  - coordinate-transform
  - homography
  - ocr-fallback
  - anchor-based
  - self-verification
  - anti-pattern
---

# PUB-34 영상 좌표 변환 — anchor 기반 + 강한 자가검증 원칙

## Context

PUB-34 (PUBG Esports 영상 → 명당 자동 도출) 1차 자율 분석 (2026-05-20)에서 BEST 53곳 + SECONDARY 159곳을 산출했으나 **사용자 검증으로 전량 폐기**됨. 같은 기간 city-names mockup v1~v11도 4번 연속 사용자가 "전부 어긋남"으로 반려.

두 사건 모두 공통 패턴 두 가지 위반:
1. **신뢰할 수 없는 단일 신호(OCR/시각 추정)에 좌표 변환식 위탁**
2. **모델 본인의 시각 비교를 검증으로 채택**

해결책 (2026-05-22): 27도시 anchor 기반 homography로 reprojection error 평균 0.45px (~3m, 1px=6.67m on 1200/8000 scale) 달성. 1시간 검증 루프 LOO 86%, sub-stability 평균 87.5%, HIGH confidence hotspot 19~24 안정.

## Guidance

### 1. 좌표 변환은 anchor 기반 homography로 한다

**원칙**: 이미 정확하게 알고 있는 anchor 점들(도시·랜드마크 등 시각 검증 완료된 좌표)을 OCR로 추출하고, `cv2.findHomography`로 변환식을 도출한다. 격자 라벨(A~H, I~P) 같은 단일 신호에 의존하지 않는다.

```python
# anchor 기반 변환 — cleanly works
def derive_homography(frame, anchor_cities):
    """프레임에서 도시명 OCR → matched anchor 점 → homography."""
    detected = ocr_city_labels(frame)
    src = []  # frame px
    dst = []  # base map normalized
    for det in detected:
        city = fuzzy_match(det.text, anchor_cities)
        if city is None: continue
        src.append(det.center_px)
        dst.append((city.gx, city.gy))
    if len(src) < 4:
        return None  # 안 잡히면 default 절대 금지
    H, mask = cv2.findHomography(np.array(src), np.array(dst), cv2.RANSAC, 5.0)
    err = reprojection_error(H, src, dst, mask)
    if err > 5.0:  # pixels
        return None  # 임계 초과면 거부
    return H, err

# 격자 OCR — fragile path (보조용으로만)
def derive_grid_transform(cols, rows):
    """격자 라벨 OCR 결과로 linear 변환 도출. 라벨 2개 미만이면 None."""
    if len(cols) < 2 or len(rows) < 2:
        return None
```

### 2. fallback transform은 결과에 표시·격리한다

**원칙**: 변환식 도출 실패 시 default 1:1 transform을 silent 적용하지 않는다. fallback 결과는 별도 channel로 기록하고 최종 hotspot 도출에서 제외하거나 명시적으로 표시한다.

```python
# 잘못된 패턴
DEFAULT_TRANSFORM_ERANGEL = ((1.0, 0.0), (1.0, 0.0))  # 1:1 패스스루
transform = derive_grid_transform(cols, rows) or DEFAULT_TRANSFORM_ERANGEL  # ← 실패가 통계에 묻힘

# 올바른 패턴
transform = derive_grid_transform(cols, rows)
if transform is None:
    frame["transform_status"] = "fallback"  # 라벨링
    frame["confidence"] = 0.0
    # 또는 그냥 skip
    continue
```

### 3. 자가 시각 검증은 검증으로 채택하지 않는다

**원칙**: "내가 봤을 때 라벨이 가운데에 있다 → ✓" 식의 자가 시각 비교는 4번 연속 망친 패턴이다. 검증은 **수치 측정** 또는 **사용자 본인 확인**으로만 채택한다.

```python
# 안티패턴
def verify_v4():
    # 모델이 자기 출력 보고 "맞다"고 선언
    print("✓ io.png + erangel.jpg 양쪽 검증 일치")  # ← 사용자 검증 시 전량 어긋남

# 올바른 검증
def verify():
    # 1. OCR로 잡힌 라벨 위치 = 출력 마커 위치 픽셀 오차 측정
    err_px = measure_marker_label_distance()
    print(f"reprojection err {err_px:.2f}px")  # ✓ 선언 아님, 수치 보고

    # 2. cross-validation
    loo_stability = leave_one_match_out(...)

    # 3. 최종 시각 판단은 사용자에게 위임
```

### 4. 검증 못 한 항목은 제외한다 (추측 거부)

**원칙**: OCR 신뢰도 미달, anchor 매칭 실패, 검증 못 한 부분은 **결과에서 뺀다**. "대충 비슷한 위치에 찍어둔다"는 4번 연속 망친 길이다.

```python
# 안티패턴 — v3에서 OCR로 11개 잡은 후 나머지 15개를 "비슷한 위치"로 추측
city_positions = {**ocr_positions, **guessed_positions}  # ← guessed가 결과 망침

# 올바른 패턴 — 검증 통과한 22개만 결과에, 4개는 명시적 drop
verified = {c: pos for c, pos in candidates.items() if visually_verified(c)}
dropped = [c for c in canonical if c not in verified]
print(f"채택 {len(verified)}/{len(canonical)} / drop {dropped} (OCR 미검출 또는 위치 어긋남)")
```

## Why This Matters

### Fallback이 통계에 묻히는 메커니즘

PUB-34 1차 시도에서 일어난 일:
- `marker_extractor.cx_norm = cx / w` (전체 프레임 너비 1920으로 정규화) → 마커가 [0.219, 0.782] 범위에만 분포
- `DEFAULT_TRANSFORM = ((1.0, 0.0), (1.0, 0.0))` (1:1 패스스루) 적용
- 결과: OCR 실패 영상의 모든 마커가 **좌우 21.9%/21.8% 잘린 띠 형태로 압축**됨
- 클러스터링은 정상 동작 → 결과 hotspot 좌표는 그럴듯하게 보임
- **738개 마커가 바다 위에 떨어졌으나** 자율 세션은 `sea_lookup`으로 필터링 → **변환 자체 결함을 가림**
- 육지에 떨어진 마커도 좌우 압축된 잘못된 위치
- 사용자 검증 시 53곳 모두 실제 게임 위치와 어긋남 → 전량 폐기

### 자가 시각 검증의 함정

city-names v1~v4에서 모델은 매번 출력 png를 본인이 다시 보고 "라벨 옆에 점이 있다 → ✓"라고 선언했다. 그러나:
- 모델은 자기 출력의 결함에 둔감 (생성한 좌표가 라벨이라고 가정)
- 픽셀 단위 오차를 시각으로 잡지 못함
- 사용자 한 명이 보면 즉시 어긋남이 보임

자가 검증 4번 연속 ✓ → 사용자 보면 4번 다 "전부 어긋남". 자가 검증의 신뢰도는 0에 가깝다.

### anchor 기반의 효과 (수치)

| 지표 | 격자 OCR + default (5/20) | 27 anchor homography (5/22) |
|---|---|---|
| reprojection error | 측정 안 됨 (fallback 다수) | **median 0.45 px (~3m)** |
| 바다 클러스터 | 738개 (sea_lookup으로 가림) | **0개** |
| 최종 hotspot 신뢰도 | 전량 폐기 | LOO 86%, sub 87.5% 안정 |
| HIGH conf hotspot 안정성 | n/a | 12 iter 평균 22, 폭 19~24 |

## When to Apply

- 영상/이미지의 화면 좌표 → 정규화/게임/지도 좌표 변환이 필요한 모든 분석 pipeline
- OCR·시각 신호로 변환식을 도출하는 경우
- 변환 결과가 다시 통계·클러스터링에 들어가서 의사결정에 쓰이는 경우
- 좌표 정확도가 산출물 신뢰도에 직접 영향 주는 경우 (명당 좌표, 마커 위치, 지오펜싱 등)

## Examples

### 사건 1 — 격자 OCR + default fallback

**5/20 잘못된 접근:**
- `grid_ocr.derive_transform`: A~H, I~P 격자 라벨 OCR → linear regression으로 (a_x, b_x), (a_y, b_y) 도출
- OCR 8회 실패 후 `DEFAULT_TRANSFORM_ERANGEL = ((1.0, 0.0), (1.0, 0.0))` fallback
- 적용된 영상별 transform 비율 추적 안 됨
- 클러스터링 결과 53곳 + 159곳 산출
- 사용자 검증 → "다 어긋남" → 전량 폐기

**5/22 올바른 접근:**
- 27도시 anchor 좌표 사전 검증 완료 (`packages/shared/src/data/erangel-cities.ts`)
- `myungdang_pov_v3.py`: 도시명 OCR → fuzzy match → 4점 이상이면 `cv2.findHomography` (RANSAC)
- reprojection error 임계 5.0px, 초과 시 frame drop
- 826 frame 중 100%가 임계 내, median 0.45 px
- 바다 클러스터 자연 0개
- 1시간 검증 루프 LOO 86%, HIGH conf 19~24 안정

### 사건 2 — 시각 추정으로 좌표 찍고 자가검증 ✓

**5/19 잘못된 접근 (v1~v11):**
- v1: 8×8 격자 셀 중심에 도시명 매핑 (사용자: "전혀 단 하나도 안 맞아")
- v2-v3: 일부 OCR + 나머지 시각 추정 (사용자: "또 어긋남")
- v4: "io.png + erangel.jpg 양쪽 검증 일치 ✓" 자가 선언 (사용자: "v4 진짜 그냥 쓰레기")

**5/19 올바른 접근 (v5~v7):**
- io.png에서 4×4, 8×8 타일 OCR (multiple preprocessing variants)
- 도시별 best detection 채택 (combined score = match_ratio × confidence)
- 위치 충돌 dedupe (0.020 이내 두 도시면 점수 높은 것만)
- 검증 못 한 도시(School, MyltaPower, Kameshki, Quarry)는 **결과에서 drop** (추측 거부)
- 각 도시 io.png 크롭 + erangel.jpg 같은 좌표 크롭 비교 시각 검증 → 22도시 통과
- v12에서 자율 세션 "검수 통과" 주장 → 27도시 anchor로 채택 (당시).

### 사건 3 — "v12 검수 통과" 자가선언이 실제론 통과 아님 (5/22 발견)

**상황:** mockups/ 정리 작업 중 사용자가 v12-ingame.png를 직접 보고 다수 도시 위치 어긋남 지적:
- Primorsk, Novorepnoye, Mylta, Farm, Prison, Lipovka, Gatka, Hospital 등 다수
- 자율 세션은 "v12 검수 통과"라 보고했고 그 결과로 27도시를 erangel-cities.ts에 confirm

**원인:** v12-ingame.png는 격자 8×8 셀 시각화 (cell 라벨 표기) + 도시명을 셀 중심 근처에 표시한 것이지, **anchor 좌표를 점으로 plot한 anchor 시각화가 아니었음**. 자율 세션은 v12 검수가 "OCR로 잡은 anchor가 마을 위에 있다"는 의미라 주장했지만 시각화 의도와 결과가 달랐고, 사용자 본인 검증을 받지 않음.

**해결:** 같은 27도시 좌표를 그대로 erangel.jpg에 점으로 plot한 `2026-05-20-pub34-diagnose-cities.png`가 진짜 anchor 시각화 (모든 점 마을 정확). 이걸 진실원천으로 확정. v12 시리즈 (NW/NE/SW/SE/ingame/검수.html) 6개는 `archives/2026-05-22-pub34-cleanup/v12-grid-not-anchor/`로 격리.

**교훈:**
- 자율 세션이 "검수 통과"라 보고해도 **사용자 본인 시각 검증 없이는 채택 안 됨** (사건 2의 자가검증 트랩 재발)
- 시각화 파일은 그 **시각화 의도**가 산출물 의도와 일치하는지 직접 확인 — "27도시 anchor 시각화"와 "8×8 격자 셀 위에 도시 라벨 시각화"는 다름. 파일명만으로 판단 금지
- anchor 진실원천은 단일 file로 명확히 표시 (`mockups/INDEX.md`에 명시)

### 사건 4 — anchor 좌표 ≠ 명당 좌표 (핵심 구조 분리)

**상황:** anchor 보정 작업에 매달리다 사용자가 지적:
> "낙하산으로 떨어지잖아 그러면 도시값이 중요한 게 아니라 그냥 떨어진 위치가 중요한 거 아니야?"

**구조 분리:**
- **anchor 좌표** = homography 변환·시각화의 **기준점**. 27개 고정 도시 위치. 정확해야 변환 정확. (`packages/shared/src/data/erangel-cities.ts`)
- **명당 (hotspot)** = 영상에서 추출된 **실제 마커 떨어진 위치**. 클러스터링 결과. 데이터 의존. (`validate.png` / `validate.json`)
- 두 데이터, 두 신뢰도 체계. 같은 맵 위에 그려져도 의미 완전히 다름.

**왜 헷갈리나:**
- anchor 시각화 (도시 점)와 hotspot 시각화 (명당 점)가 동시에 같은 erangel.jpg에 빨간 점으로 그려지면 사용자 입장에서 둘 다 "마커"로 보임
- "도시 좌표 정확도 검증"과 "명당 좌표 정확도 검증"이 헷갈리면 작업 시간 낭비

**적용:**
- `mockups/INDEX.md`에 anchor vs hotspot 구분 명시
- 시각화 파일 분리: `anchor-cities-*.png` (변환 기준) vs `validate.png` (실제 결과)
- anchor 보정 = 모든 후속 분석에 영향 (homography 재계산 필요)
- hotspot 변경 = 그 결과만 영향 (anchor 그대로)

### 사건 5 — 5/22 사용자 시각 검증으로 9도시 100m 격자 보정

**원인:** 5/20 anchor 시각 검증 시 일부 도시가 라벨 텍스트 중심 = 마을 가장자리에 위치하거나, OCR 결과가 마을 중심에서 0.0125 (PUBG 100m 격자 1칸) 정도 어긋남.

**보정:** 사용자 시각 검증으로 9도시 100m 단위 보정:

| 도시 | 보정 | (gx, gy) |
|---|---|---|
| Quarry | 위2 | (0.2, 0.655) |
| Ferry | 위1 | (0.341, 0.6965) |
| MyltaPower | 위2 | (0.895, 0.543) |
| Prison | 위1 | (0.768, 0.4635) |
| School | 위2 | (0.52, 0.405) |
| Boatyard | 위2 왼1 | (0.4275, 0.393) |
| Shooting | 위1 | (0.418, 0.2115) |
| Yasnaya | 왼1 | (0.6725, 0.292) |

**원칙:**
- anchor 단위는 **PUBG 작은 격자 = 100m = 1/80 = 0.0125**. 모든 보정은 이 정수배.
- 두 진실원천 동기화 필수: TypeScript (`erangel-cities.ts`) + Python (`myungdang_pov_v3.py`)
- 보정 후 사용자 시각 재검증 받기 — "맞다"고 자가 선언 금지

### 사건 6 — frame 위 detection의 5가지 함정 (5/22 발견)

PUBG (MAP) 영상에서 player 마커 detection 시도 중 발견된 함정들:

1. **다음자기장 빨간 원 = player 아님** (v5/v6 false positive)
   - 큰 빨간 채워진 원 형태 → connected component로 player 빨강팀과 혼동
   - 해결: area >= 200 빨강 영역 별도 마스킹

2. **레드존 = 폭탄 영역, player 아님** (5/22 사용자 지적)
   - 다음자기장과 별도로 PUBG에 "레드존(폭탄 떨어지는 곳)"이 빨간 원으로 표시
   - 큰 빨간 영역 한 번에 둘 다 제외 필요

3. **이름 라벨 박스에 점 찍히는 함정**
   - PUBG player 마커 = 작은 색 원 + 옆에 흰/색 라벨 박스 (IGN 텍스트)
   - HSV detection의 connected component centroid는 박스 안 텍스트 + 박스 영역의 중심 → **라벨 박스 가운데**에 점 찍힘
   - 진짜 player 위치 = 박스 **옆**의 작은 색 원 (dot)
   - 해결: 라벨 박스 (가로 직사각형) detect 후 그 인접 작은 색 dot 찾기

4. **차량 이동 중 player ≠ 명당**
   - PUBG에서 차량 안 player는 "핸들 모양" 또는 차량 아이콘으로 표시 (일반 dot 아님)
   - 이동 중이라 명당 분석에서 제외해야 — shape/모양으로 구분

5. **같은 팀 모인 cluster — 한 점으로 OK** (사용자 결정)
   - hot drop 영역 (4명 모임)에서 같은 색 마커가 한 connected component
   - watershed 분리 안 하고 cluster 가운데 1점으로 충분 (의미 보존)

**교훈**: HSV detection은 색 분류만 가능하지 **shape/맥락 의미** 분석 없음. PUBG UI 요소 (레드존, 차량, 라벨 박스 vs dot)는 별도 모양 기반 필터 필요.

## Future Work (보류)

### 명당 결과의 자연어 표현

현재 validate.json의 hotspot은 `"Hospital 166m"` 식의 거리 단위로 표현되는데, 사용자는 "못 알아먹음" 지적:
> "c.school 242m 이렇게 하면 못 알아먹어 ... 스쿨 아래 산 능선이거나 뭐 이런식으로 표현을 해야 되는데"

**대안:** hotspot 좌표 → 자연어 위치 설명 매핑. 방향(동/서/남/북) + 가까운 도시/지형(산능선/강/사거리/다리/숲)
- ❌ `"Hospital 166m"`
- ✓ `"Hospital 옆 작은 강 건너편 능선"`
- ✓ `"School 아래 산 능선"`

별도 작업으로 분리. 지형 라벨 데이터 또는 LLM 기반 자연어 생성 검토.

## Related

- 메모리 `pub34_city_anchor_lesson` (개인 메모, 같은 사건)
- 메모리 `feedback_verify_dont_wait` (검증 우선, 대기 금지)
- `packages/shared/src/data/erangel-cities.ts` (27도시 anchor 데이터, 시각 검증 완료)
- `apps/services/video-analyzer/myungdang_pov_v3.py` (anchor 기반 homography 구현)
- `apps/services/video-analyzer/grid_ocr.py` (격자 OCR — 보조 신호로만 사용, default fallback 제거 필요)
- `docs/archives/2026-05-23-pub34-pre-yolo/2026-05-21-pub34-validate.png` (검증 루프 결과, YOLO 전환으로 폐기)
- `docs/archives/2026-05-23-pub34-pre-yolo/2026-05-22-pub34-validate-tiers.png` (4계층 신뢰도 분류, 폐기)
- 후속 YOLO 접근: `docs/resources/solutions/architecture-patterns/2026-05-23-pub34-classical-cv-detection-failure.md`
- 같은 "self-confirmation trap" 메타 패턴 (자가검증 X → 사용자 검증 O): `docs/resources/solutions/architecture-patterns/2026-05-24-background-chain-silent-fail-watchdog.md`
