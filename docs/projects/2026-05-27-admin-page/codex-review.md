# 어드민 페이지 — Codex 리뷰 기록

## 1차 — CHANGES_REQUESTED
- [BLOCKER] docker-compose.yml — `ADMIN_PASSWORD: ${ADMIN_PASSWORD:-pubg-admin}` 기본 비번 하드코딩 → 알려진 기본값으로 위조/통과 가능, fail-closed 설계와 충돌.
- [MAJOR] login/route.ts — 쿠키 값이 원문 `ADMIN_PASSWORD` → 쿠키 유출 시 비번 그대로 노출.
- [MAJOR] login/route.ts — 쿠키에 `secure` 없음 → HTTPS 운영에서 비보안 요청에 쿠키 노출.

## 2차 (반영 후) — APPROVED
- 기본 비번 제거(fail-closed), SHA-256 토큰 쿠키, `secure: production` 추가, 테스트 18개. VERDICT: APPROVED.
