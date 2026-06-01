# 플랜 3 컨텍스트 노트 — 결정과 이유 (Codex 검수용)

> 참조 [[00-reference-past-decisions]] §1, [[01-research-findings]], [[02-telemetry-verified]].

## 왜 추출·발전·검증을 한 플랜에 묶나 (사용자 결정)
- 셋 다 "자기장 시스템" 한 덩어리. 발전(반경 prior)이 추출의 입력이고, 검증이 추출 정확도를 채점. 분리하면 의존이 끊겨 보임. → 함께. (사용자 2026-06-01)

## 왜 라이브 추출은 telemetry로 대체 불가 ★
- telemetry는 과거 대회. 제품은 사용자 화면공유의 실시간 게임 자기장을 읽음 → 그 경기엔 telemetry 없음. 추출(트랙 A)은 제품의 심장. telemetry는 prior 발전·검증에 쓰일 뿐. (근거 [[02-telemetry-verified]] §7)

## 왜 SIFT를 되살리지 않나
- 줌 inlier 4~29개(게이트 120 미달), 과확대+단조지형 특징점 부재. 물리적 불가 확정. (§1.2)

## 왜 배선 문제지 알고리즘 문제가 아닌가
- 검출·변환·제약 3모듈 유닛 통과. `detectZoneZoom()`이 변환 미호출, 앵커만 반환(106줄). (§1.3)

## 왜 반경 테이블을 telemetry로 단일화하나 (Codex BLOCKER)
- `circle.service.ts`와 `probe_ring_bbox.py`가 P5~7 불일치 → 검출·학습이 다른 정답. telemetry 실측(P1 0.2496…)으로 한 테이블 고정, SUPER 비율 정합. (근거 [[02-telemetry-verified]] §2)

## 왜 다음존을 분포로 예측하나
- 자기장 중심 랜덤(spread/landRatio). 단일 확정 위험 → 확률분포, 이동 ≤ R-r. (근거 [[01-research-findings]] A)

## 왜 broadcast 프레임으로 검증하나
- 라이브는 사용자 실시간이라 telemetry 없음. 토너먼트 broadcast 전체맵 프레임(telemetry 존재)에 추출기 돌려 정답 대조 → 객관 정확도. 매칭 불가는 telemetry 렌더 합성 회귀.

## 왜 map_square 실패모드 분리·ruleset 선택 (Codex MAJOR)
- 줌서 맵 경계 안 보이면 추정 폭주 → 캐시만 쓰고 없으면 실패. ruleset 무분별 교체는 기존 검출 회귀 → 런타임 선택.

## 왜 검증 임계 명문화 (Codex MAJOR)
- "오차 감소"는 통과 판정 불가. phase별 임계·표본수 명시.

## 리스크
- broadcast↔telemetry 매치ID 매칭 난이도. 콜드스타트 폴백 미구현(후순위). 단독 결론 금지 → Codex.
