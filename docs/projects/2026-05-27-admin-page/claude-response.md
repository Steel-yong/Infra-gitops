# 어드민 페이지 — Codex 리뷰 응답

## Response To Blocking
- [docker-compose 기본 비번 하드코딩] **반영함.** `${ADMIN_PASSWORD:-pubg-admin}` → `${ADMIN_PASSWORD:-}`. 미설정 시 빈값 → `isAdminAuthed`가 false 반환(fail-closed). 운영/개발 모두 주입 필요.

## Response To Major
- [쿠키 값=원문 비번] **반영함.** `adminToken()`(SHA-256 hex)으로 토큰화해 쿠키에 저장. 쿠키 유출돼도 비번 비노출(preimage 저항). `isAdminAuthed`도 토큰 비교로 변경(async). 테스트로 "원문 비번 쿠키는 거부" 고정.
- [쿠키 secure 누락] **반영함.** login/logout 쿠키에 `secure: process.env.NODE_ENV === 'production'` 추가(개발 http 유지, 운영 https 강제).

## Changes
- `apps/frontend/src/lib/admin-auth.ts` — `adminToken`(SHA-256) + async `isAdminAuthed`.
- `apps/frontend/src/middleware.ts` — `/admin` 게이트(async), `/admin/login` 제외.
- `apps/frontend/src/app/api/admin/login/route.ts`·`logout/route.ts` — 토큰 쿠키 + secure.
- `apps/frontend/src/app/admin/{login/,}page.tsx` + `admin.module.css` — 로그인 폼 + API 테스트 패널.
- `docker-compose.yml` — frontend `ADMIN_PASSWORD`(서버 전용, 기본값 없음).
- 테스트 3파일 18개.

## Verification
- `vitest run` (frontend 컨테이너) → admin-auth 9 / login-route 4 / pages 5 = **18/18 통과**.

## Instruction Compliance
- worktree(feature/admin) 작업, develop 기반, 새 소스 첫 줄 한국어 주석, any/console.log/하드코딩 시크릿 없음(기본 비번 제거), 산출물 5종.
- Codex 피드백: BLOCKER 1 + MAJOR 2 모두 반영 → 재검수 APPROVED.
- 미해결(라이브): 비번 게이트 리다이렉트·각 서비스 응답 → split-test-plan 및 아래 체크리스트.
