# PUB-37 체크리스트 — 게임 종료 인식

## 인식
- [ ] 치킨 감지 (노란 픽셀 비율 임계) — `.claude/images/치킨.png` 기준 튜닝
- [ ] 죽음 감지 (OCR "로비로 나가기"/"관전"/"데스 캠") — `.claude/images/데스.png` 기준
- [ ] `useGameEndDetect` 훅 + 테스트 (치킨/죽음/일반 구분)

## 배선
- [ ] page.tsx: `gameEnded` → `unlockCircle()` + 알람 리셋, 1회만
- [ ] `useAlertTimer` 리셋 경로 (notified/pending 클리어)
- [ ] 배선 테스트

## 검증
- [ ] 도커 빌드 통과
- [ ] 유닛 테스트 + 커버리지 95% (node 컨테이너)
- [ ] 도커로 띄워 수동 확인 (치킨/죽음 화면 → 알람 멈춤 + UI 초기화)
- [ ] 커밋 → PR(base develop)
