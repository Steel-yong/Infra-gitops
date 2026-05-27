# 어드민 페이지 (env 비번 + API 테스트 UI) — 계획

## 목적
운영자가 capture/location/alert 백엔드 API의 응답·동작을 한 화면에서 확인하는 내부 도구. 간단한 env 비밀번호로 접근 제한.

## 범위
- Next.js 14 App Router `/admin` 라우트.
- **서버사이드 비번 게이트** — `ADMIN_PASSWORD`(server-only env) 검증.
- **API 테스트 UI** — 버튼 → 서비스 호출 → 응답(JSON/상태) 표시.

## 설계
### 인증 (서버사이드 — NEXT_PUBLIC 금지)
- `POST /api/admin/login` route handler: body `{password}` 가 `process.env.ADMIN_PASSWORD`와 일치하면 httpOnly 쿠키 `admin_auth`(값=비번) 설정, 아니면 401.
- `src/middleware.ts`: `/admin`(단 `/admin/login` 제외) 요청에 쿠키 `admin_auth === ADMIN_PASSWORD`가 없으면 `/admin/login`으로 리다이렉트.
- 게이트 판정은 순수 헬퍼 `isAdminAuthed(cookie, password)`로 분리해 단위 테스트.
- `POST /api/admin/logout`: 쿠키 삭제.

### API 테스트 UI (클라이언트 — 기존 패턴)
- 기존처럼 `NEXT_PUBLIC_{CAPTURE,LOCATION,ALERT}_SERVICE_URL`로 브라우저에서 직접 호출(CORS·소켓 이미 동작).
- 패널: capture `GET /health`, location `GET /health`·`GET /locations?mapType=`, alert `GET /health`. 버튼→fetch→상태코드+본문 표시.

### env
- `docker-compose.yml` frontend에 `ADMIN_PASSWORD` 추가(기본 개발값). 시크릿은 운영에서 주입.

## 검증
1. 헬퍼 `isAdminAuthed` 단위 테스트 → 일치/불일치/빈값.
2. login route handler 테스트 → 정답(쿠키 set)/오답(401).
3. admin page 컴포넌트 테스트 → 패널 버튼 렌더 + fetch mock 결과 표시.
4. 라이브(사용자) → 비번 게이트 + 각 버튼 실제 응답.

## 비범위 (후속)
- 비번 해시·세션 토큰(현재 plaintext httpOnly 쿠키 = 간단 게이트).
- 서비스별 쓰기 작업 트리거(현재 조회·헬스만).
