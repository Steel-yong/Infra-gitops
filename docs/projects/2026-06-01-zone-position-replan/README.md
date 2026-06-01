# 재계획 인덱스 — 자기장 & 프로위치 (telemetry 전환판)

> 2026-06-01. telemetry 실측 검증 후 3개 플랜으로 재편. Linear 조회 불가 → 이슈번호 사용자 확정.

## 토대 문서
- [[00-reference-past-decisions]] — 과거 결정·폐기·블로커 압축.
- [[01-research-findings]] — 딥리서치(SUPER·좌표·게이트) 반영.
- [[02-telemetry-verified]] — telemetry 접근·자기장·프로위치·명당추출 **실측 검증**(핵심 토대).

## 3개 플랜
| # | 플랜 | 목표 | 상태 | 폴더 |
|---|---|---|---|---|
| 1 | 프로위치 telemetry 추출 | 페이즈별(P1~5) "자기장 안 정지" 명당 DB (절대좌표) | 활성 | `plan-1-pro-position-telemetry/` |
| 2 | 유튜브 영상추출 | 영상 YOLO 프로위치 추출 (이전 접근) | **폐기(ARCHIVED)** | `archives/2026-06-01-plan2-youtube-pro-position-archived/` |
| 3 | 자기장 시스템 | 라이브 추출 + telemetry prior 발전 + 검증 (셋 통합) | 활성 | `plan-3-live-zone-extraction/` |

- `trackA-zoom-zone/` — **플랜3로 통합**(A-* → P3-*). 원문 보존.

## 플랜2 폐기 사유 (2026-06-01 사용자 승인)
- telemetry가 **최근 대회(2026-05-31)까지 전구간·정확·합법**으로 프로 위치를 직접 제공 → 유튜브 영상추출(검출10%·1페이즈·저작권 회색) **완전 대체**. 보존 명분이던 비-토너먼트/일반 스트리머 fallback도 제품 목적(프로 명당 추천)엔 불필요해 **폐기**. 원문은 `docs/archives/2026-06-01-plan2-youtube-pro-position-archived/` 보존. (바이블 6부 보존규칙: 삭제 아닌 archives 이동.)

## 의존 관계
```
[1] 명당 DB(telemetry) ── 독립, 즉시 착수
[3] 발전(P3-6 반경테이블) → 라이브 추출(P3-1~3) → 검증(P3-8 telemetry 대조)
제품 통합: [3] 라이브 자기장(절대) ∩ [1] 절대 명당 DB → 추천
```
- 즉시 착수: **[1] 전체**(telemetry 독립) + **[3] P3-6**(반경 테이블).

## Codex 검수 반영
- 2026-06-01 Codex 검수(VERDICT: CHANGES_REQUESTED)는 옛 트랙 대상. 재편으로:
  - track B BLOCKER(pseudo-label·D-SEED)는 유튜브 보류로 소멸.
  - track A MAJOR(ruleset·map_square·검증임계·soft gate)는 플랜3에 명문화.
- 항목별 응답: `claude-response.md`. **신규 3-플랜 재검수 권장.**
