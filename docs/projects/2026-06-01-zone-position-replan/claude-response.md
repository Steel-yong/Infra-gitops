# Claude 응답 — 2026-06-01 Codex 검수 반영

> 대상 검수: `codex-review.md`(VERDICT: CHANGES_REQUESTED, BLOCKER2/MAJOR6/MINOR2). 이후 telemetry 실측으로 트랙 구조를 3-플랜으로 재편([[README]]). 항목별 반영.

## Response To Blocking
- **[B-6 telemetry가 프로위치 라벨 자체를 검증 못함]** 반영함(구조 해소). 유튜브 영상 추출(pseudo-label) 자체를 **중단**하고 프로위치를 telemetry에서 **직접** 가져오므로 pseudo-label 검증 문제가 소멸. telemetry는 선수명·정확좌표를 직접 제공해 라벨 추정·검증이 불필요. (플랜1)
- **[D-SEED findings 해결 vs B-3 "결정 후" 모순]** 반영함. 유튜브 트랙(재seed anchor 포함) 보류로 D-SEED 자체가 무의미해짐. 라이브 재seed는 플랜3 줌 좌표변환으로 일원화. 모순 제거.

## Response To Should Fix
- **[B-1 한 이슈에 IP우회+수집+비교 혼재]** 반영함(소멸). 유튜브 수집 보류. telemetry 수집(플랜1 P1-1)은 IP우회 불필요.
- **[B-4 YOLO 출력/fps 선행조사 미분리]** 반영함(소멸). YOLO correspondence 자체가 telemetry 전환으로 불필요.
- **[B-3 검증기준 "추출 성공" 모호]** 반영함. 플랜1은 "자기장안+비차량+정지3" 정량 기준 + 수동 대조(P1-4)로 측정.
- **[A-5 검증 임계 비었음]** 반영함. 플랜2 P2-4에서 phase별 중심·반경 오차 임계·표본수 명문화. telemetry 접근 확정(D-TEL 종결)으로 "D-TEL 후" 불확정 제거.
- **[A-4 오검출률 측정 불가]** 반영함. 플랜3 P3-3에서 baseline 오검출 데이터셋·arc_ratio 임계·목표치 명문화.
- **[A-1 ruleset 선택 경로 불명확·회귀위험]** 반영함. 플랜3 P3-4를 별 이슈로 분리, 런타임 ruleset 선택 + 기존 화면공유 회귀 테스트.
- **[A-3 map_square 줌서 경계 안보임]** 반영함. 플랜3 P3-2에서 전체맵 캐시 vs 줌 실패 분리, 추정 폴백 금지.
- **[MINOR 체크리스트 값 비었음/깨짐]** 반영함. 신규 plan-1/2/3 checklist는 정량 기준으로 작성, 표본수·임계 채움(일부는 P1-4/P2-4서 확정 표기).

## Changes
- 신규: `02-telemetry-verified.md`(telemetry 실측 검증), `README.md`(3-플랜 인덱스), `plan-1-pro-position-telemetry/`, `plan-3-live-zone-extraction/`(라이브 추출+발전+검증 통합) 각 plan/checklist/context-notes.
- 재배치: 유튜브 추출 = `plan-2-youtube-pro-position/`(보류 보존). 발전·검증은 별도 플랜이 아니라 플랜3에 통합. `trackA-zoom-zone/`→플랜3 통합.
- 스크립트: `.local/verify-pubg-telemetry.py`·`explore-telemetry.py`·`extract-pro-holdings.py`. 시각화: `docs/resources/mockups/2026-06-01-telemetry-탐색/`.

## Verification
- telemetry 접근·자기장·프로위치·명당추출 실데이터 실행 검증(에란겔 1경기: 명당 480개 P1~6, 차량1400 제외). 자기장 반경 telemetry vs 실측 ≤0.1% 일치.
- 코드 구현 전 단계(계획)라 유닛테스트는 각 plan의 검증 항목으로 정의. 구현 착수 시 실행.

## Instruction Compliance
- Linear: 조회 불가 → 이슈번호 사용자 확정 대기(명시).
- 계획·checklist·context-notes 3종: 3개 플랜 모두 작성.
- HTML 시각화: 결정·분석 자료 `2026-06-01-telemetry-탐색/index.html` 작성(바이블 4부).
- 한국어 종결·새 파일 한국어 주석: 스크립트 첫줄 주석 준수.
- 단독 결론 금지: 본 재편 plan은 Codex 재검수 대상(권장).
- 위반: 메인 폴더 미커밋 다수(기존 포함) — 커밋은 사용자 승인 대기.
