# PUB-39 줌 자기장 parentCircle 제약 — Codex 리뷰 응답

## Response To Blocking
- 없음.

## Response To Major
- [zone-geometry.ts:16 절대 tol 과대] **반영함.** `tol=0.05`(절대) → `tolFrac=0.2`(부모 반경 비례, 임계 = `parent.r - r + parent.r*tolFrac`). 후반 페이즈(부모 r≈0.02)에서 여유가 기하 한계를 압도하던 문제 해소. Codex 예시(phase5→6)를 회귀 테스트로 고정.
- [sift-zone.service.ts 3점 RANSAC 스냅 후 미검증] **반영함.** `best.r`로 통과시켜도 페이즈 반경으로 스냅하면 더 커질 수 있으므로, 반환 직전 `snappedR`로 `isZoneInsideParent` 재검증 후 실패 시 null.

## Changes
- `apps/services/capture/src/capture/zone-geometry.ts` — 신규 순수 모듈: `ParentZone`, `isZoneInsideParent`(비례 tol).
- `apps/services/capture/src/capture/sift-zone.service.ts` — detectZone/fitZone/fitCenterFixedRadius에 `parent` 인자, fixed-radius·3점 RANSAC 양쪽 부모 밖 기각 + 스냅 반경 재검증.
- `apps/services/capture/src/capture/capture.service.ts` — `detectZone(base64, hintPhase, parentCircle)`.
- `apps/services/capture/src/__tests__/zone-geometry.spec.ts` — 9 테스트(부모 없음·내부·동심·밖·과대·tol 경계·후반 페이즈 회귀 2).

## Verification
- `vitest run zone-geometry.spec.ts` → 9/9 통과 (capture 컨테이너).
- 타입: 변경 파일 신규 에러 없음(기존 gateway spec 목·rootDir 경고는 무관).

## Instruction Compliance
- CLAUDE.md 준수: worktree(feature/PUB-39-zoom) 작업, develop 기반, 새 소스 첫 줄 한국어 주석, any/console.log/시크릿 없음, 산출물 3종 작성.
- Codex 피드백 준수: MAJOR 2건 모두 반영 + 회귀 테스트 추가.
- 미해결(라이브 검증): SIFT_ZONE_ENABLED off 기본, tol·MIN_STRONG_INLIERS 화면공유 튜닝 필요 → live-test 체크리스트 C.
