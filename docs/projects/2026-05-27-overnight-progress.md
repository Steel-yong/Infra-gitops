# 🌙 밤샘 자율 진행 기록 (2026-05-27→28)

마스터 로드맵 `2026-05-27-overnight-master-roadmap.md` 자율 진행. 게이트 도달로 기록·보고.
**모드 변경(사용자 지시 2026-05-28)**: 모든 주요 단계 Codex 상시 동반(단독 결론 금지). 상담 로그 `docs/projects/2026-05-27-pub-39-zoom-compare/codex-consult.md`.

---

## ✅ 한 일 (작업 1 — PUB-39 줌, PHASE A)

### A1. 검출 모듈 정리 — 완료·커밋 (9ae14df, b89a54d)
- 줌 프레임 5장에서 **흰 안전구역 원 안정 검출(4/5 정확, inl 2472~3547)**, 기존 **파란 헛원(1.5M px) 완전 제거**.
- 핵심 실측 발견: **파란 벽 라인 색 ≈ 파란 틴트 색**(4v 벽 b-max=65 vs 틴트 72) → 단순 BGR 강도 마스크로 분리 불충분(현 샘플). 파란 벽은 색이 아니라 **구조(lit/dim 경계 윤곽)** 로.
- 흰 원: 흰픽셀 RANSAC + **각도 커버리지 게이트**(그리드선·라벨 가짜원 컷) + Kasa 재피팅.
- Codex 라운드1 반영: **RANSAC seed 고정**(재현성), **wall 포함 sanity gate**(해안선 오인 방지). seed 후 4v는 wrong 큰원 대신 **미검출로 정직 보고**.
- 산출물: `.local/poc_detect_circles.py`, `.local/pub39-shots/det_*.png`, `detections.json`.

### A2. Ground truth — 완료·커밋 (63d2c24)
- **검출기와 독립**으로 작성(Codex 라운드1 BLOCKER): 도시 라벨 비전 식별.
- **줌↔전체맵 matchTable 잠금**: 1페확대↔1페(med-high), 2페확대·2페확대2↔2페(1)(alive 54 동일=high), 2v·4v는 클린 전체맵 없어 **unmatched 분리**.
- 구조: `candidateRegion`(약한앵커) + `visualEvidence_fullmap` + `detectorObservation` 분리(numeric 중심정답 금지 — Codex 라운드2).
- **GATE-1 메트릭 교체**: 절대 err 폐기 → 가용성·identity sanity·후보군 포함률·상대 일관성·기각 품질(Codex 라운드2 Q4).
- 발견: 큰 플레이존 원 중심은 라벨 없는 지형 → 중심-도시는 약한 권역 앵커. `1페.png`는 클린 게임맵, **`2페.png`는 우리 앱 스샷**(게임 원본 아님), `2페 (1).png`가 페2 클린 게임맵.
- 산출물: `.local/pub39-shots/ground_truth.json`.

---

## 🚪 막힌 곳 (GATE) — A3 known 앵커 추출

**상태**: Codex 라운드3에서 기하 접근 잠금(Opt1=도시 control point similarity, 회전0 scale+tx+ty, residual 이중 게이트, leave-one-out anchor sensitivity 필수). 스펙은 `codex-consult.md` 라운드3에 완비.

**왜 멈췄나 (정직)**:
- A3 앵커는 도시 라벨의 **정밀 픽셀 좌표**(control point)가 입력으로 필요. Codex residual gate = world median ≤0.003 (이미지의 ±0.3%).
- 그런데 **에이전트가 정적 스샷에서 눈으로 라벨 위치를 읽는 정밀도는 ±2~4%(이미지폭)** 로 요구치보다 **5~10× 큼**. → 수동 eye-anchor로는 게이트 통과 불가.
- 가짜 정밀 좌표를 지어내 진행하는 것은 허위·단독 결론(사용자 지시·CORE 위배)이라 금지.
- 이는 Codex 라운드3 Q5가 명시한 **"anchor confidence 낮으면 데이터 보강 요청으로 멈춰라"** 조건에 정확히 해당.

---

## ☀️ 아침에 사람이 할 것 (옵션)

A3 게이트를 풀 방법(택1, 또는 조합):

1. **데이터 보강(권장)**: 전체맵(1페/2페) 또는 줌 프레임에서 **도시 4~6개의 픽셀 좌표를 직접 찍어 control point 제공**(또는 라벨링 도구). 그러면 Codex-잠금 A3 스펙을 그대로 실행 → A4~A7 비교 진행. + 가능하면 줌 직전 **전체맵 lock 스샷/짧은 공지윈도우 클립**(같은 게임·같은 원) 제공하면 매칭·정답이 강해짐.
2. **자동 랜드마크 도구 구축**: 도시 라벨 OCR 또는 satellite 템플릿 매칭으로 control point 자동 추출(추가 작업·정확도 불확실). 승인 시 다음 루프에서 PoC.
3. **상대/sanity-only 모드로 진행**: 절대 앵커 없이 방법들을 가용성·identity sanity·상대 일관성(2페확대↔2페확대2)·기각 품질로만 비교. 단 방법이 world 좌표를 내려면 앵커가 입력으로 필요해 한계가 큼(절대 정확도 측정 불가).
4. **작업 1 보류, 작업 2로 전환**: capture-service busy 가드(독립·안전·빠른 승)부터 자율 진행.

> 내 추천: **1번(control point 직접 제공) + 가능하면 lock 스샷**. 그게 PHASE A 비교를 의미있게 만드는 가장 빠른 길. 결정 주시면 즉시 실행.

---

## 안전 준수
- 하드 금지선 전부 준수: **push·main 머지·클러스터 변경·삭제·외부 설치 없음.** develop 로컬 커밋만(9ae14df·b89a54d·63d2c24), `.local` PoC + docs.
- 열린 워크트리 그대로(feature-gameend-next·pub39-v2·pub40-player) — 손대지 않음.
