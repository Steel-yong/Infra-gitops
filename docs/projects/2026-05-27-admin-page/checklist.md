# 어드민 페이지 — 체크리스트

- [x] `src/lib/admin-auth.ts` — 쿠키명 상수 + `adminToken`(SHA-256) + 순수 헬퍼 `isAdminAuthed`.
- [x] `src/middleware.ts` — `/admin` 게이트(쿠키 없으면 `/admin/login` 리다이렉트).
- [x] `src/app/api/admin/login/route.ts` — POST 비번 검증 + httpOnly 토큰 쿠키(secure).
- [x] `src/app/api/admin/logout/route.ts` — POST 쿠키 삭제.
- [x] `src/app/admin/login/page.tsx` — 로그인 폼.
- [x] `src/app/admin/page.tsx` — API 테스트 패널.
- [x] `src/app/admin/admin.module.css` — 다크 테마 스타일.
- [x] `docker-compose.yml` — frontend에 `ADMIN_PASSWORD` env(기본값 없음, fail-closed).
- [x] 유닛: admin-auth(9) / login route(4) / admin pages(5) = 18/18.
- [x] Codex 리뷰 — BLOCKER 1·MAJOR 2 반영 → APPROVED.
- [ ] 라이브 검증(사용자) — 비번 게이트 리다이렉트 + 각 서비스 응답.
