# PUB-40 유저 위치 — 컨텍스트 노트 (재착수)

## 상태: 핵심 접근 결정 대기
- 원 계획(`docs/projects/2026-05-26-pub-40-user-position-plan.md`) = 사용자 승인 "실시간 미니맵 + AKAZE 호모그래피".
- **PoC에서 미니맵 AKAZE inlier=4로 실패** → 승인된 접근이 데이터로 무효화.
- 재결정 시각화: `docs/resources/mockups/2026-05-27-decision-pub40-approach.html` (A 템플릿매칭 / B 전체맵 화살표 / C ML).

## 이번 브랜치에서 한 것 (접근 무관 토대)
- `packages/shared/src/types/player.ts` — `PlayerPosition {x, y, heading?}` (0~1 이미지 좌표 + 도 단위 방향).
- `index.ts` export, `SocketEvents.PLAYER_RESULT` 이벤트 추가.
- 좌표계: 기존 규약대로 이미지 좌표(위 0→아래 1). 프론트 마커는 `[1-y, x]`.

## 왜 더 진행 안 하고 멈췄나 (근거)
- 핵심 CV(미니맵 로컬라이제이션) 접근이 미결이고, 승인 접근이 PoC로 깨졌다.
- 결정 전에 하드 CV(템플릿매처)를 만들면, 틀린/실패할 방향에 노력 낭비 위험 → 바이블 "확실하지 않으면 묻는다 / 결정 필요 시 시각화" 적용.
- A의 PoC에는 인게임 미니맵 원본 프레임이 필요한데 현재 자산엔 없음(풀맵·앱스샷·종료화면뿐). 체인 영상 추출 또는 사용자 제공 필요.

## 결정되면 다음
- A → 미니맵 프레임 확보 → `.local/poc_player_template.py`(NCC) → 통과 시 capture `detectPlayer()` + 프론트 `PlayerMarker`.
- B → 전체맵 흰 화살표 검출(전체맵 좌표계 재활용).
- C → 라벨·학습(대형 별도 이슈).
