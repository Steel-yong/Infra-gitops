# PUB-39 줌 자기장 — parentCircle 포함 제약 (컨텍스트 노트)

## 배경
- 줌인(전체맵 확대) 화면에서는 circle.service(전체맵 전제)가 실패 → SIFT-zone 폴백이 자기장을 복원해야 한다.
- PoC(.local/poc_ce.py, sift_zone_prototype) 결과: AKAZE 전체매칭 inlier가 낮아(줌 C 4~29) 호모그래피가 **불안정**. 단독으로는 허위 중심을 만든다.

## 이번 변경의 핵심 결정
- **부모 자기장(이전 페이즈 락된 원) + 페이즈 반경 고정**을 제약으로 써서 약한 호모그래피의 허위 결과를 거른다.
- PUBG 규칙: 다음 존은 항상 현재 존 **내부**. → 새 중심거리 `d ≤ 부모r − 새r + tol`.
- 제약을 순수 모듈 `zone-geometry.ts`(opencv 무관)로 분리 → 단독 유닛 테스트 가능(WASM import 회피).

## 적용 지점
- `fitCenterFixedRadius`(페이즈 알 때 중심만 RANSAC) — 부모 밖 중심 후보 즉시 기각.
- 3점 RANSAC(페이즈 모를 때) — 부모 밖 원 후보 기각.
- `capture.service` → `detectZone(base64, hintPhase, parentCircle)`로 부모 전달.

## tol = 0.05 근거
- 정규화 0~1 좌표에서 검출 오차 여유. 너무 작으면 정상 줌도 기각, 너무 크면 제약 무력화.
- 라이브 검증에서 조정 가능(아래 미해결).

## 미해결 / 라이브 검증 필요
- `SIFT_ZONE_ENABLED`는 기본 off(매 프레임 AKAZE 비용). 줌 검증 시 env로 켠다.
- 제약은 허위 결과를 **거르기만** 한다 — 호모그래피 자체 정확도는 줌 정도에 의존(과도 줌은 여전히 실패 가능).
- tol 값, MIN_STRONG_INLIERS(120)는 실제 화면공유로 튜닝 필요. → live-test 체크리스트 C 항목.

## 검증
- `zone-geometry.spec.ts` 7/7 통과(부모 없음·내부·동심·밖·과대·tol 경계 양쪽).
- 타입: 변경 파일에 신규 에러 없음(기존 gateway spec 목·rootDir 경고는 이번 변경과 무관).
