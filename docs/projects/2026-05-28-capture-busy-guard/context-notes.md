# capture busy 가드 (skip-to-latest) — 컨텍스트 노트

## 목적
프론트가 0.5초마다(2장/초) 프레임 전송하는데 백엔드 검출은 2~3초/장 → busy 가드 없으면 백로그·동시처리로 과부하·밀림. (docs/areas/capture-scaling.md 4안 중 ①.)

## 설계 결정
- **순수 `FrameThrottle<T>` 클래스**로 skip-to-latest 분리 → opencv 무관, 단독 유닛 테스트(컨테이너 opencv import 행 회피).
- 동작: 처리 중이면 들어온 항목을 `pending`에 **최신만** 저장(옛것 폐기) + 즉시 반환. 한가하면 처리 시작 후 while로 그동안 쌓인 최신 pending까지 드레인.
- gateway: **OCR 게이트키퍼(저비용)는 스로틀 이전** 즉시 처리. 무거운 검출(detectAndEmit)만 클라별 스로틀로 직렬화. 기존 processFrame+isShrinking+emit 로직 그대로 이동(회귀 0 목표). OnGatewayDisconnect로 sessions·throttles 맵 정리(누수 방지).

## Codex 반영
- **[BLOCKER]** run이 throw하면 busy만 풀리고 pending 잔존 → 이후 stale 처리로 skip-to-latest 깨짐. → **반영**: while 안에서 run을 try/catch로 감싸 throw를 잡고(onError 콜백) loop 계속 드레인 → stale 안 남고 파이프라인 안 막힘. gateway는 onError로 Logger.warn.

## 검증
- frame-throttle.spec 5/5 (즉시처리 / 최신만-중간폐기 / 순차 / throw-onError-계속 / throw중-pending-회귀).
- 기존 capture.gateway.spec은 opencv import로 vitest 행 → 회귀는 변경의 외과성 + Codex 검수로 갈음(라이브에서 최종 확인).

## 비범위 (플랜만, 구현 X)
capture-scaling ②전송률↓ ③클라사이드 검출 ④최적화·수평확장 — 아키텍처 큼, 이번 아님.
