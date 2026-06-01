# 트랙 A 컨텍스트 노트 — 결정과 이유 (Codex 검수용 근거)

> 다음 세션·Codex가 "왜 이렇게 했나"를 검수할 수 있게 근거를 남긴다. 참조 [[plan]], [[01-research-findings]].

## 왜 이 트랙이 "막힘"이 아니라 "배선·검증" 문제인가
- 검출(`zoom-detect`)·변환(`zoom-localize`)·제약(`zone-geometry`) 3모듈 모두 유닛 통과 완료. 막힌 건 `detectZoneZoom()`이 변환을 호출 안 하고 앵커를 반환(106줄)하는 배선 누락과, A3 게이트가 ±0.3% GT 부재로 멈춘 검증 공백. → 알고리즘 재설계 아님. (근거 [[00-reference-past-decisions]] §1.3)

## 왜 SIFT를 되살리지 않는가
- 줌 프레임 inlier 4~29개(게이트 120 미달), 과확대+단조지형으로 특징점 물리적 부재. 라이브 확정. 부활 시 같은 실패 반복. (근거 §1.2)

## 왜 페이즈 비율은 SUPER, 절대값은 crop 보정인가 ★
- SUPER shrink로 만든 누적반경 비율(P2/P1=.55, P3/P2=.60)이 우리 실측 비율(.551,.593)과 일치 → 비율 신뢰. 그러나 실측 절대 .2492 ≠ 이론 .175(~1.42배차)는 방송 observer crop_side ≠ 월드 8160m 때문. 절대값을 이론으로 박으면 모든 프레임이 어긋남. → 비율=공식, 절대=방송 한 프레임 보정. (근거 [[01-research-findings]] A1)

## 왜 telemetry를 검증 정답으로 도입하나 ★
- A3 게이트 멈춤의 근본은 에이전트 눈측정 ±2~4% << 요구 ±0.3%. telemetry `GameState.safetyZoneRadius/Position`은 객관 정답이라 이 공백을 메움. 단 broadcast 경기 telemetry 접근 가능성(D-TEL)이 사실관계 전제. 불가 시 수동라벨 폴백. (근거 [[01-research-findings]] A2)

## 왜 hard 반경 게이트 대신 soft 게이트인가
- 줌서 원이 crop 밖 잘림/blue zone과 white circle 동시/현재·다음 원 혼동 → 단일 반경 hard check 취약(Codex 리뷰 MAJOR). phase+r+arc+center+isGame 결합 soft가 robust. (근거 [[01-research-findings]] A4)

## 왜 부모 제약을 검출 prior와 학습 게이트로 분리하나 (D-GATE)
- 줌 자기장 **검출 후보 prior**로는 full-inside가 유효(esports 기하상 중심 이동 ≤ R-r). 그러나 **학습 라벨 확정 게이트**로 full-inside를 강제하면 spread/edge 케이스서 정답을 버림. 그래서 학습은 center-inside soft. 트랙 B와 공통. (근거 [[01-research-findings]] A4, Codex 리뷰 MAJOR)

## 미해결/리스크
- D-TEL 불가 시 검증 정밀도 한계(수동라벨 노이즈).
- 줌단계 모호성(같은 r_px 중복): 휠카운트가 가장 단순하나 화면공유서 휠 이벤트 캡처 가능 여부 확인 필요.
- 단독 결론 금지(바이블 10부) → 본 플랜·구현은 Codex 검수 경유.
