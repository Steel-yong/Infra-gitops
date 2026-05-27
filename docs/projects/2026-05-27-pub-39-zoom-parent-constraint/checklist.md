# PUB-39 줌 자기장 parentCircle 제약 — 체크리스트

- [x] `zone-geometry.ts` 순수 헬퍼 `isZoneInsideParent` 작성 (opencv 무관).
- [x] `sift-zone.service.ts` detectZone/fitZone/fitCenterFixedRadius에 parent 인자 + 부모 밖 중심 기각.
- [x] 3점 RANSAC 경로에도 제약 적용.
- [x] `capture.service.ts`에서 parentCircle을 detectZone에 전달.
- [x] `zone-geometry.spec.ts` 유닛 테스트 7/7 통과.
- [x] 타입 검증 — 변경 파일 신규 에러 없음.
- [x] Codex 리뷰.
- [ ] 라이브 검증 — 화면공유 줌인에서 자기장 복원 (SIFT_ZONE_ENABLED=true, tol·MIN_STRONG_INLIERS 튜닝).
- [ ] develop PR.
