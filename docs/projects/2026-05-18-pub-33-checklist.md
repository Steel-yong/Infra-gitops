# PUB-33 — 에란겔 명당 정밀 시드 v1 — 체크리스트

> 2026-05-18 시작. mockup 46곳 + WebFetch 추가 보강 → 80+곳 → seed.ts 주입. 정밀도 ±0.05 한계 명시. 결정 근거는 [context-notes](2026-05-18-pub-33-context-notes.md) 참고.

## 데이터 수집

- [x] Agent 4개 병렬 fetch — 영문 핵심 / 영문 보조 / 한국 / 일중·위키
- [x] mockup 46곳 + Agent 결과 통합 → 중복 제거 (영문명 normalize key)
- [x] 위치별 출처 카운트 합산 → tier 결정 (mockup tier 유지 + Agent 다중 출처는 격상)
- [~] 80곳 미만 → 68곳으로 정리됨 (한국 비공식 명칭 4곳은 셀 매핑 불가로 제외)

## 좌표 처리

- [x] mockup 격자값 그대로 사용 (±0.05)
- [x] 동일 좌표 다중 위치 — y +0.005 흩기 (3건: 학교/로족언덕, 조르조폴큰언덕/개미지옥능선, 채석장/지하창고)
- [x] 0~1 범위 검증 통과

## 코드 변경

- [x] `apps/services/location/prisma/seed.ts`
  - 기존 `ERANGEL_PRO` 더미 20개 제거
  - 새 68곳 데이터 (mockup 46 + Agent 22) + tier (S 11 / A 29 / B 28)
  - 비밀창고(`ERANGEL_STASHES`), 페이즈 데이터, 태이고 더미는 손대지 않음
- [x] schema 변경 없이 진행 (H tier → B + memo에 [핫드롭] 표시 방식)
- [x] deleteMany 쿼리 단순화 (`er-*` 전체 + `tg-pro-*`)

## 검증

- [ ] `pnpm --filter location test` — 기존 단위 테스트 통과
- [ ] `pnpm --filter location test:coverage` — 95% 임계 유지
- [ ] `pnpm --filter location build` — 빌드 성공
- [ ] `pnpm --filter location prisma:migrate:dev` — 마이그레이션 없음 확인 (스키마 미변경)
- [ ] `pnpm --filter location db:seed` — 시드 실행 → 80+ 행 삽입 로그 확인
- [ ] frontend 동작 검증 — 자기장 추출 후 명당 마커가 원 안에 표시되는지 (사용자 시각 확인)

## 산출물

- [ ] 커밋 1~3개 (논리 단위)
- [ ] PR base=develop, head=feature/PUB-33
- [ ] 사용자 시각 확인 후 머지 → 워크트리 정리

## 비고

- 태이고는 별도 후속 (이번 PR 범위 외)
- 좌표 정밀화(어드민 클릭 UI, Telemetry API)는 별도 이슈로 분리
- ERANGEL_PRO 더미 데이터 제거 시 기존 테스트가 더미 ID에 의존하는지 점검 필요
