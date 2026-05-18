# PUB-32 — 태이고 자기장 검출 알고리즘 튜닝 체크리스트

> 2026-05-18 시작. raw 캡처 측정 후 단일 라인 수정 채택. 측정 근거는 [context-notes](2026-05-18-pub-32-context-notes.md) 참고.

## 구현

- [ ] `circle.service.ts:180` — `g < r + 25` → `g < r + 40` 한 줄 변경.

## 검증

- [ ] `pnpm --filter capture test` — 기존 단위 테스트 통과.
- [ ] `pnpm --filter capture test:coverage` — 95% 임계 유지.
- [ ] `pnpm --filter capture build` — 빌드 성공.
- [ ] 도커 capture 컨테이너 재빌드 + 재기동.
- [ ] 실 게임 테이고 페이즈 2/3/4 검출 확인 (사용자 시각 검증).
- [ ] 실 게임 에란겔 페이즈 1~4 회귀 없음 확인 (사용자 시각 검증).

## 산출물

- [ ] 커밋 1개: `fix(capture): 위험 구역 파란 임계값 완화 — 태이고 검출 가능 (PUB-32)`
- [ ] PR base=develop, head=feature/PUB-32
- [ ] 사용자 시각 확인 후 머지 → 워크트리 정리

## 비고

- 변경은 단일 라인. 다른 알고리즘 변경 없음.
- 페이즈 1 wait/형성 직후엔 외부 파란 자체가 0% 수준이라 알고리즘 완화해도 false positive 위험 0 (측정 확인).
- 운영 로그 `파란 0~3.7%` 원인 (캡처 영역? JPEG 압축? OCR 오인식?)은 본 PR 범위 외 — 별도 디버깅.
