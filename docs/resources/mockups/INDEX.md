# mockups/ — 작업 중인 임시 시각화

> mockups는 **현재 진행 중 작업의 시각 검증용 임시 산출물**.
> 영구 자산은 `docs/resources/maps/`, 폐기/완료는 `docs/archives/`.

## 현재 (PUB-34 명당 도출 — 98편 1080p + 조건부 명당)

| 파일 | 무엇 |
|---|---|
| **`2026-05-26-conditional-myungdang-full.png`** | **맵 전체 조건부 명당** — P(방문\|자기장포함)+Wilson, 828격자 (자기장 어디 떠도 추천) |
| `2026-05-26-myungdang-v1-grid-relative.png` | 명당 버전1 (격자 상대순위) — **사용자 선택 대기** |
| `2026-05-26-myungdang-v2-city.png` | 명당 버전2 (27도시 단위) — **사용자 선택 대기** |
| `2026-05-25-decision-pub34-data-midcheck.html` | 검수 리포트 (combiner 오염 제거) |
| `2026-05-24-pub34-myungdang-chain.png/json` | combiner 클러스터 명당 (참고) |

진행 문서: `docs/projects/2026-05-25-pub34-map-chain-resume.md`, `2026-05-25-pub34-detection-improvement.md`

## 영구 자산은 여기로 이동됨

- 에란겔 27도시 anchor → `docs/resources/maps/erangel-anchor{,-grid}.png`
- 태이고 19지명 anchor → `docs/resources/maps/taego-anchor{,-grid}.png` (2026-05-26)

## 폐기/완료 산출물 위치

- **명당 도출 과정 (이번 세션 39개)** → `docs/archives/2026-05-26-pub34-myungdang-process/`
- **정품 combiner 이전 (오염 클러스터 기준 산출물)** → `docs/archives/2026-05-25-pub34-pre-cleanchain/` (11 파일)
- **YOLO iteration 진화 (v1→v7)** → `docs/archives/2026-05-24-pub34-yolo-iterations/` (25 파일)
- YOLO 전 시도 → `docs/archives/2026-05-23-pub34-pre-yolo/`
- 5/22 일괄 정리 → `docs/archives/2026-05-22-pub34-cleanup/`
- 5/21 중간 → `docs/archives/2026-05-pub34-intermediate/`
- 5/20 1차 시도 → `docs/archives/2026-05-20-pub34-1차-시도/`

## 회고 문서 (다음 번 같은 실수 안 하도록)

- 고전 CV로 player detection 실패: `docs/resources/solutions/architecture-patterns/2026-05-23-pub34-classical-cv-detection-failure.md`
- 합성 데이터 6번 iteration 교훈: `docs/resources/solutions/architecture-patterns/2026-05-24-pub34-synth-data-iteration-lessons.md`
- 좌표 변환 anchor 검증: `docs/resources/solutions/architecture-patterns/pub34-coordinate-transform-anchor-verification-2026-05-22.md`

## 컨벤션

- 신규 산출물: `YYYY-MM-DD-[topic]-[descriptor].{png,html,json}` 패턴
- 검증 통과 + 영구 자산화 → `docs/resources/maps/` 같은 적절한 폴더로
- 검증 실패 또는 iteration 폐기 → `docs/archives/YYYY-MM-DD-[topic]/` 로
- mockups에는 **현재 작업의 최신 결과만** 남김
- "검수 통과"는 사용자 본인 시각 검증만 인정
