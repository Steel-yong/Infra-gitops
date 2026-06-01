# modi-maps — 우리가 계속 수정하는 맵 (작업 중 최신본)

> 명당 도출처럼 **반복 수정하는 맵 산출물**을 여기 모은다. 흩어져서 찾기 힘든 문제 해결용.
> 영구 확정본은 `../maps/`, 폐기/과정본은 `../archives/`, 결정용 임시 HTML은 `../mockups/`.

## 현재 명당 버전 (PUB-34, 2026-05-26)

| 파일 | 병합 방식 | 등급 기준 | 점(개별마커) |
|---|---|---|---|
| `2026-05-26-myungdang-01.png` | DBSCAN 32m·3개↑ | 절대횟수 | 있음 |
| `2026-05-26-myungdang-02-conditional.png` | DBSCAN | 조건부 P+Wilson | 있음 |
| `2026-05-26-myungdang-03-no-dots.png` | DBSCAN | 절대횟수 | 없음 |
| `2026-05-26-myungdang-04-grid-merge.png` | 격자 100m | 절대횟수 | 없음 |
| **`2026-05-26-myungdang-05-merge-conditional.png`** | **격자 100m** | **조건부 P+Wilson** | 없음 |

- 공통 — 바다 제거, static(player)만(비행·차량 제외), 에란겔.
- `*.json` = 각 맵의 명당 좌표·등급·점수 원본 수치.
- **조건부** = P(방문│자기장포함)+Wilson 보정 (편향 보정). **격자병합** = 능선 등 분산 사용 자리 보존.

## 생성 스크립트 (`.local/pub34-yolo-backup/`)

| 스크립트 | 출력 |
|---|---|
| `render_no_sea.py` | 01 |
| `render_variants.py` | 02, 03 |
| `render_merge.py` | 04 |
| `render_merge_conditional.py` | 05 |

입력 — `results_chain_map/`(98편 검출), `2026-05-24-pub34-myungdang-chain.json`(클러스터), `apps/frontend/public/maps/erangel.jpg`(바다 판정).
