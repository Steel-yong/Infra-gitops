# 2026-05-26 PUB-34 명당 도출 과정 산출물 (39개)

2026-05-25~26 세션에서 명당을 도출하기까지의 **중간·과정 시각화** 보관. 최종 결과물은 아래 두 곳에 있다.

- **최종 명당**: `docs/resources/mockups/` — `2026-05-26-conditional-myungdang-full.png`, `myungdang-v1-grid-relative.png`, `myungdang-v2-city.png`
- **태이고 anchor**: `docs/resources/maps/taego-anchor.png`, `taego-anchor-grid.png`

## 분류

| 그룹 | 파일 | 내용 |
|---|---|---|
| 검출 개선 | namebox-union-proto, verify-coords/raw/overlay/zoom, 1080p-missed-check | 이름박스 union + 고화질(1080p) 검출률 검증 |
| 태이고 좌표화 | taego-anchor-v1~v5, taego-named-ref/grid/AHIP, taego-scan, taego-align | anchor v1→v5 진화 (최종 v5는 maps/로). SIFT 매칭 0.32px |
| 프로 위치 검증 | erangel/taego-pro-verify, sift-matchlines | SIFT 정렬 0.30px 입증 (영상↔지도) |
| 명당 과정 | highres-myungdang, 47videos-distribution, conditional-myungdang(3영상), video-compare | 절대횟수→조건부확률 전환 과정 |

## 경위 문서

- `docs/projects/2026-05-25-pub34-detection-improvement.md` — 검출률 ~10% 문제 + 이름박스 union + 고화질
- `docs/projects/2026-05-25-pub34-map-chain-resume.md` — chain·우회·1080p 재수집 진행
- `docs/resources/mockups/2026-05-25-decision-pub34-data-midcheck.html` — combiner 오염 검수
