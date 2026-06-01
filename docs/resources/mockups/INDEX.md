# mockups/ — 사용자가 봐야 할 시각 산출물

> mockups는 **사용자 확인용 HTML 시각화**.
> 영구 자산 (anchor 등) → `docs/resources/maps/`, 모드별 명당 시각화 → `docs/resources/modi-maps/`.
> 결정 끝나거나 다음 iteration이 나온 산출물은 즉시 삭제 (의미 없는 자료 누적 방지).

## 컨벤션 (2026-06-01 업데이트)

- 사용자가 "보고서 만들어라" 시킨 결과물 → `mockups/YYYY-MM-DD-한국어-주제/index.html` (별도 폴더 + 한국어 제목).
- 단발 결정용 HTML → `mockups/YYYY-MM-DD-decision-주제.html` (결정 끝나면 삭제).
- 검증 iteration 결과 → 폴더로 묶고 latest만 유지, 이전은 삭제.

## 현재 (2026-06-01)

| 폴더·파일 | 주제 |
|---|---|
| **`2026-06-01-배그-자기장-시스템-리서치/index.html`** | PUBG 자기장 시스템 deep research (PUB-41 입력). 9 phase 표 + 픽셀 수치 + 우리 코드 검증 |

## 영구 자산은 여기로

- 에란겔 27도시 + 태이고 19지명 anchor → `docs/resources/maps/`
- 명당 시각화 (v1~v7) → `docs/resources/modi-maps/`

## 폐기 산출물 보관 위치 (참고)

- PUB-34 명당 도출 과정 → `docs/archives/2026-05-26-pub34-myungdang-process/`
- PUB-34 정품 combiner 이전 → `docs/archives/2026-05-25-pub34-pre-cleanchain/`
- YOLO v1→v7 iteration → `docs/archives/2026-05-24-pub34-yolo-iterations/`
- YOLO 전 시도 → `docs/archives/2026-05-23-pub34-pre-yolo/`

## 회고 문서

- 고전 CV player detection 실패 → `docs/resources/solutions/architecture-patterns/2026-05-23-pub34-classical-cv-detection-failure.md`
- 합성 데이터 6번 iteration 교훈 → `docs/resources/solutions/architecture-patterns/2026-05-24-pub34-synth-data-iteration-lessons.md`
- 좌표 변환 anchor 검증 → `docs/resources/solutions/architecture-patterns/pub34-coordinate-transform-anchor-verification-2026-05-22.md`

## 정리 이력

- 2026-06-01. 18개 단일 HTML + 3개 iteration 폴더 삭제 (PUB-34 명당 결정·PUB-39 zoom 결정·PUB-41 r9 r10 검증). 모두 결정 완료 또는 다음 iteration 대체됨. INDEX 새로 작성.
