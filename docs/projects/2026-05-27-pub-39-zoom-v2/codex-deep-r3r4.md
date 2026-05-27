# 줌 자기장 로컬라이제이션 — Claude↔Codex 3·4라운드 (보고서 결정 재검증)

원문(raw): `.local/zoom-debate-r3-codex.txt`, `.local/zoom-debate-r4-codex.txt`
프롬프트: `.local/zoom-debate-r3-prompt.md`, `.local/zoom-debate-r4-prompt.md`
검수 대상: `docs/resources/mockups/2026-05-27-report-zoom-decisions.html` (기존 3계층 결정)

## 배경
보고서의 기존 결정은 ①플레이어 아이콘 앵커+미니맵 오도메트리(주력) ②원 ruler 재앵커(fallback) ③지도앵커(보정)였다.
Claude가 이 결정에 5개 반론을 세워 Codex와 3라운드, 이어 Claude의 4개 refinement로 4라운드를 진행했다.
**결과: Codex가 9개 항목 전부 동의/부분동의/대안 수용 → 보고서 결정을 뒤집고 phase-aware 이벤트 기반 설계로 수렴.**

## 3라운드 — Claude 5개 반론 → Codex 판정

| # | 반론(Claude) | Codex 판정 |
|---|---|---|
| 1 | 줌 상시 로컬라이제이션 자체가 과설계. 문제는 "다음 존 공지 시점 1회 lock"으로 좁혀진다 | **인정** — 이벤트 기반 next-circle lock으로 재정의 |
| 2 | 결정1은 플레이어 아이콘이 줌 프레임 밖이면 붕괴. 후반 줌 목적(로테이션·존가장자리)은 플레이어에서 멀다 | **인정** — 플레이어 앵커는 "보이면 강한 재앵커"로 강등 |
| 3 | 미니맵 경계기하 F가 후반 주력에 더 맞다(줌 글랜스 불필요) | **대안** — F를 플레이어 앵커보다 위로, 측정 1순위 |
| 4 | 3계층을 짓기 전 측정했어야(미니맵 중심·회전·아이콘 가시율·flow drift) | **인정** — 빌드 전 측정 게이트 추가 |
| 5 | scale 출처(원 반경)가 단일 실패점. fallback이 독립적이지 않다 | **대안** — 원 반경 단독 확정 금지, 독립 scale ≥1 일치 시만 |

## 4라운드 — Claude 4개 refinement → Codex 검증

| # | refinement(Claude) | Codex 판정 |
|---|---|---|
| 1 | F는 phase 의존적. 중반 큰 원=미니맵 호 직선→법선 모호→헛중심. 후반만 강함 | **동의** — F는 5·6페 주력, 4페 조건부, 2·3페 보조 gate |
| 2 | 독립 scale 진짜 1순위는 "양자화된 줌 레벨 분류 + 보정 테이블"(격자·라벨은 고배율서 부재) | **부분동의** — classifier 실측 보정 선행 조건부 1순위 |
| 3 | "1회 lock"이 아니라 "공지~수축 윈도우 multi-frame lock"(N-of-M 수렴 confidence) | **동의** — 트리거를 lock window + 중심 cluster 합의로 |
| 4 | 미니맵 오도메트리 불필요. 윈도우마다 전체맵 lock으로 P_world 재설정하면 됨 | **부분동의** — MVP 주력서 제거, degraded-mode holdover로 격하 |

## 최종 수렴 결론 (phase-aware)

**프레이밍 전환**: "줌 상시 절대 로컬라이제이션" → "새 존 공지 → lock window 열기 → 윈도우 내 multi-frame 후보를 phase·scale·parent containment로 gate → 중심 cluster 분산·N-of-M 동의·시간 일관성으로 commit".

**측정 게이트 6개(빌드 전 선행)**:
1. 미니맵 중심 = 플레이어 위치인가.
2. 미니맵 회전 설정·실제 회전 빈도.
3. 후반 줌 글랜스에 플레이어 아이콘 들어오는 프레임 비율.
4. 후반 미니맵에 자기장 경계 호 보이는 비율 + arc span·곡률.
5. 미니맵 광학흐름이 핑·팀원·연막·차량서 내는 drift.
6. 원 반경 scale ↔ 줌레벨/격자/미니맵/초기 전체맵 scale 교차검증 가능성.

**phase 구간별 주력**:
- 2·3페(큰 원): 줌레벨 scale + 전체맵 플레이어 아이콘 P_world + 원 ruler 재앵커. F는 보조 gate.
- 4페: F 조건부 승격, arc 관측성 낮으면 ruler로 회귀.
- 5·6페(작은 원): 미니맵 경계기하 F + 전체맵 P_world 재설정 = 주력.

**scale 우선순위**: ①줌레벨 분류+보정 테이블 ②격자 간격 ③미니맵 배율 ④초기 전체맵 viewport scale. 원 반경 단독 확정 금지 → ≥1 독립 소스와 일치 시만.

**강등/제거**:
- 플레이어 아이콘 앵커: 주력 → "보이면 강한 재앵커".
- 미니맵 오도메트리: MVP core 제거 → optional degraded holdover.
- factor graph: 첫 빌드 아님. 나중에 관측 합치는 얇은 confidence scorer로만.
- ML: 보류 유지. deterministic 앵커로 auto-label 쌓인 뒤 애매 crop ranking 보조 재평가.

## 보고서와의 차이 (무엇을 바꿔야 하나)
- 결정1(플레이어+오도메트리 주력) → 후반은 F, 전반은 ruler. 플레이어는 보조. 오도메트리 빠짐.
- 상시 로컬라이제이션 → 공지 이벤트 윈도우 lock.
- 측정 게이트가 빌드의 0단계로 신설.
- scale 단일 소스 → 교차검증 필수.
