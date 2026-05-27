# PUB-40 유저 위치 (재착수) — 체크리스트

## 토대 (접근 무관, 완료)
- [x] `shared.PlayerPosition {x, y, heading?}` 타입 + export.
- [x] `SocketEvents.PLAYER_RESULT` 이벤트.
- [x] 접근 재결정 시각화 HTML.

## 결정 대기 (사용자)
- [ ] 접근 선택 — A(미니맵 템플릿매칭) / B(전체맵 화살표) / C(ML). → 시각화 참고.

## 결정 후 (A 가정)
- [ ] 미니맵 원본 프레임 확보(체인 영상 추출 또는 사용자 제공).
- [ ] NCC 템플릿매칭 PoC — 미니맵 중심 위치 오차 측정.
- [ ] capture `detectPlayer(base64)` → `PlayerPosition`.
- [ ] WebSocket `PLAYER_RESULT` 송신 + 프론트 수신.
- [ ] 프론트 `PlayerMarker`(`[1-y,x]` + heading 회전).
- [ ] 유닛 테스트 + Codex 리뷰.
- [ ] 라이브 검증(사용자).
