# 어드민 페이지 — 컨텍스트 노트 (결정과 이유)

## 왜 서버사이드 게이트인가
- `NEXT_PUBLIC_*` env는 번들에 박혀 브라우저에 노출 → 비번으로 못 쓴다.
- 프론트는 `output: export`가 아니라 `next dev`(풀 서버)라 middleware·route handler 사용 가능 → 비번 검증을 서버에서 한다.
- 쿠키는 httpOnly(JS 접근 불가). 쿠키 값 = 비번이라 위조하려면 비번을 알아야 함 → "간단 env 비번" 요구에 맞는 최소 보안.

## 왜 게이트 판정을 헬퍼로 분리했나
- middleware는 Edge 런타임이라 단위 테스트가 번거롭다. 판정 로직 `isAdminAuthed(cookie, password)`를 순수 함수로 빼서 테스트.

## 왜 API 호출은 클라이언트사이드인가
- 메인 앱이 이미 `NEXT_PUBLIC_*_SERVICE_URL`로 브라우저에서 capture(소켓)·location(fetch)을 호출 중(CORS 동작). 같은 패턴 재사용 → 서버 프록시 불필요, 단순.
- 게이트(비번)만 서버사이드, 테스트 호출은 기존 방식.

## 호출 대상 (현재 컨트롤러 기준)
- capture: `GET /health` (그 외는 WebSocket).
- location: `GET /health`, `GET /locations?mapType=`.
- alert: `GET /health`.
- 쓰기/트리거는 비범위(조회·헬스만).

## 트레이드오프 / 미해결
- plaintext 비번 쿠키 — 해시·서명 토큰은 후속. 내부 도구라 현 수준 허용.
- `ADMIN_PASSWORD` 미설정 시 동작: 비번이 빈 문자열이면 게이트 무력화 위험 → 헬퍼에서 password가 빈값이면 인증 거부(아래 구현).
- 라이브 검증 필요: 실제 서비스 응답·리다이렉트.
