# PUB-39 줌 자기장 parentCircle 제약 — Codex 리뷰 기록

## 1차 — CHANGES_REQUESTED
- [MAJOR] zone-geometry.ts — `tol=0.05`(절대)는 후반 페이즈에서 과대. phase5(r=0.02036)→phase6(r=0.01018)의 실제 허용 중심거리는 ~0.01018인데 0.06018까지 허용 → 부모 밖도 통과.
- [MAJOR] sift-zone.service.ts(3점 RANSAC) — `best.r`로 부모 포함 검사 후 페이즈 반경으로 스냅. 스냅 반경이 더 커질 수 있어 반환 직전 스냅 반경으로 재검증 필요.

## 2차 (반영 후) — APPROVED
- tol 비례화 + 스냅 반경 재검증 + 후반 페이즈 회귀 테스트 2건 추가 확인. VERDICT: APPROVED.
