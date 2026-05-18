# PUB-31 — 위치 추천 UI 우측 사이드바 분리 체크리스트

> 2026-05-18 시작. B안 (최소 변경) 채택. 결정 근거는 [context-notes](2026-05-18-pub-31-context-notes.md) §1 참고.

## 구현

- [ ] `page.module.css`에 `.rightSidebar` 스타일 추가 — 좌측 사이드바와 대칭 (border-left).
- [ ] `page.tsx`에서 좌측 사이드바 하단 `LocationPanel`을 감싼 `sideSection` 제거.
- [ ] `page.tsx` 우측에 `<aside className={styles.rightSidebar}>` 신설 + `LocationPanel` 이동.
- [ ] `.body` flex 순서: 좌사이드바 → 캡처섹션 → 맵 → 우사이드바.
- [ ] (선택) 1366px 이하 미디어쿼리로 우측 280px 축소.

## 검증

- [ ] `pnpm --filter frontend test` — 단위 테스트 통과.
- [ ] `pnpm --filter frontend test:coverage` — 95% 임계 유지.
- [ ] `pnpm --filter frontend build` — 빌드 성공.
- [ ] 1920×1080 브라우저에서 시각적 확인 (사용자 검증).
  - [ ] 자기장 락 → 우측에서 위치 추천 리스트 표시.
  - [ ] 자기장 락 해제 → 우측 사이드바가 비거나 자연스럽게 처리.
  - [ ] 알림/타이머/맵 선택 모두 기존대로 동작.

## 산출물

- [ ] 커밋 1개: `feat(frontend): LocationPanel 우측 사이드바로 분리 (PUB-31)`
- [ ] PR base=develop, head=feature/PUB-31
- [ ] 사용자 시각 확인 후 머지 → 워크트리 정리

## 비고

- LocationPanel 컴포넌트 자체는 건드리지 않는다 (감싼 컨테이너만 이동).
- A안(3분할 재구성)으로의 진화는 PUB-30 §7.1 (맵 확대 자기장 인식) 완료 후 별도 이슈에서 검토.
