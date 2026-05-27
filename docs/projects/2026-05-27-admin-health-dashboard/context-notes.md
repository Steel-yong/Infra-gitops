# 어드민 헬스 대시보드 (ArgoCD식) — 컨텍스트 노트

## 요구 (사용자)
ArgoCD UI처럼 — 서비스별로 무슨 서비스인지 설명 + 옆 버튼으로 직접 백엔드 API 요청 + **10~15초마다 모든 서비스 자동 헬스 요청** + 정상=초록/문제=빨강 테두리.

## 설계 결정
- **브라우저 폴링** 채택 — 3 서비스(capture/location/alert) 모두 `enableCors()` 확인, `/health`→`{"status":"ok"}`. 기존 앱도 `NEXT_PUBLIC_*_SERVICE_URL`(127.0.0.1:port)로 브라우저에서 호출.
  - 서버사이드 프록시는 불가: location/alert 컨테이너가 **다른 compose 네트워크**(feature-pub-34-*)라 frontend에서 서비스명으로 못 닿음(ENOTFOUND 확인). host.docker.internal은 되지만 브라우저 폴링이 더 단순·CORS 무문제.
- **상태 판정**: HTTP 200=ok(초록), 비200/네트워크실패=error(빨강), 요청중=checking(노랑 pulse), 미확인=unknown(회색). 좌측 border 색 = ArgoCD식.
- **폴링 10초** (`POLL_MS`). 자동 + '전체 새로고침' + 카드별 '지금 확인'.
- **요청 순번 가드**(reqId ref): 겹친 폴링에서 느린 옛 응답이 최신을 덮지 않게(Codex MINOR 반영).
- 언마운트 후 setState 가드(mounted ref).

## 파일
- `hooks/useServiceHealth.ts` — 폴링 훅(probe 4s 타임아웃, 예외 안던짐).
- `app/admin/page.tsx` — 대시보드(카드+상태색+버튼). 기존 probe 패널 대체.
- `admin.module.css` — 상태별 border·dot pulse.

## 검증
- 유닛 13/13(useServiceHealth 5 + 대시보드 8). Codex APPROVED(MINOR 반영).
- 라이브: 사용자 직접 — /admin 로그인 후 카드 색·자동갱신·버튼 확인.
