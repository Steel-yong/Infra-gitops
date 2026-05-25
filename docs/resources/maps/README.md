# 맵 진실원천 (Erangel + Taego anchor)

> PUB-34 좌표 변환·시각화·learning의 영구 기준.
> 이 폴더 파일은 변경 시 코드 [[erangel-cities.ts]] / [[myungdang_pov_v3.py]] 동기 필요.

## 파일

| 파일 | 용도 |
|---|---|
| **`erangel-anchor.png`** | 에란겔 27도시 anchor 점만 — 좌표 변환·SIFT 매칭 기준 |
| **`erangel-anchor-grid.png`** | 에란겔 anchor + 100m 격자 + A~I/I~Q 라벨 (탐색용) |
| **`taego-anchor.png`** | 태이고 19지명 anchor (2026-05-26) — OCR(easyocr)로 추출 + A~I/I~Q 격자 보정. 코드 `full_pipeline.py` `TAEGO_CITIES` |
| **`taego-anchor-grid.png`** | 태이고 anchor + A~I/I~Q 격자 |

## 코드 동기

- TypeScript: `packages/shared/src/data/erangel-cities.ts`
- Python: `apps/services/video-analyzer/myungdang_pov_v3.py` (`CITIES`)

## 격자 표기

- 가로 9개: **A B C D E F G H I** (A=좌끝, I=우끝)
- 세로 9개: **I J K L M N O P Q** (I=상단, Q=하단)
- 1km 격자 (큰 청록선), 100m 격자 (얇은 흰선)

## anchor 5/22 보정 이력

| 도시 | 보정 | 새 (gx,gy) |
|---|---|---|
| Quarry | 위2 | (0.2, 0.655) |
| Ferry | 위1 | (0.341, 0.6965) |
| MyltaPower | 위2 | (0.895, 0.543) |
| Prison | 위1 | (0.768, 0.4635) |
| School | 위2 | (0.52, 0.405) |
| Boatyard | 위2 왼1 | (0.4275, 0.393) |
| Shooting | 위1 | (0.418, 0.2115) |
| Yasnaya | 왼1 | (0.6725, 0.292) |
| MilBase | (참고) | (0.552, 0.804) |

단위: 0.0125 = 1/80 = PUBG 100m 격자.

## 핵심 통찰

**anchor 좌표 ≠ 명당 좌표.**
- **anchor** = 변환·시각화 기준점 (이 폴더 파일)
- **명당** = 영상에서 추출된 마커 떨어진 위치 (YOLO 추론 결과 → PUB-33)
