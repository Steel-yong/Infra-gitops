# PUB-40 체크리스트 — 유저 실시간 위치

## 0. 선검증 (게이트)
- [ ] 미니맵 영역 크롭 좌표 확정 (스크린샷에서 우하단 미니맵 bbox 측정)
- [ ] PoC — 미니맵 크롭에 AKAZE 호모그래피, inlier 수 측정 (.local에 스크립트)
- [ ] inlier 임계 통과 판정 → 통과면 1번으로, 실패면 ML 결정 목업 재작성

## 1. 백엔드 (capture)
- [ ] `shared`에 `PlayerPosition{x, y, heading}` 타입 추가
- [ ] `capture`에 `detectPlayer(base64)` — 미니맵 크롭 → 호모그래피 → 중심 게임좌표 + 화살표 방향
- [ ] PUB-39 `sift-zone`의 호모그래피 코드 재활용 (중복 제거 검토)
- [ ] 유닛 테스트 — 합성 미니맵 + 실제 픽스처(.claude/images), 좌표 허용오차 비교
- [ ] WebSocket 이벤트로 `PlayerPosition` 전송

## 2. 프론트
- [ ] `PlayerMarker` 컴포넌트 — `[1-y, x]` 변환 + heading 회전
- [ ] WebSocket 수신 → 마커 실시간 갱신
- [ ] 라이브 테스트 (플레이 중 위치·방향 표시 확인)

## 3. 마무리
- [ ] Codex 검수 (review)
- [ ] capture 컨테이너 재빌드/재시작
- [ ] 빌드·테스트 결과 보고
