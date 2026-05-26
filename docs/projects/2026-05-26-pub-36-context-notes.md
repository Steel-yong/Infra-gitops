# PUB-36 컨텍스트 노트 — 결정과 이유

> 다음 세션이 이어갈 근거. 작업 중 내린 결정 기록.

## 왜 정적 JSON (DB 시드 아님)

명당은 영상 분석으로 **오프라인 계산된 정적 참조 데이터** — 런타임에 안 변하고, 사용자 입력·트랜잭션 아님. 전체 표시 + 클라이언트 등급 토글이 전부라 서버 쿼리 불필요(737개는 브라우저가 가볍게 처리). DB는 데이터가 수십만 개거나 서버측 복잡 쿼리·사용자 편집이 필요할 때만. → CDN 캐시·백엔드 부하 0·배포 단순. 원래 location-service의 `/recommend`는 더미 흐름이라 제거 대상.

## 왜 도넛 + 색/크기

- 도넛(`fillOpacity:0`) — 737개를 꽉 찬 원으로 그리면 지도가 가려짐. 사용자 요청 = 지도 안 가리게.
- 색 S빨강/A주황/B노랑/C하늘 — 기존 금/은/동(`LocationMarkers`) 대신. C는 회색이 지도에서 안 보여 하늘색(#4db8ff)으로.
- 크기 최대 = A(주황). 빨강(S)이 너무 커 보여서 A와 동일 캡. (사용자 피드백.)

## 데이터 출처

`docs/resources/modi-maps/2026-05-26-myungdang-06-grid-merged.json` (develop 브랜치/메인 폴더). 100m 격자병합 + 거의붙은(67m) 십자 병합 + 조건부(P(방문│자기장포함)+Wilson) 등급. 737개. 생성 스크립트 `.local/pub34-yolo-backup/render_grid_merged.py`.

## 명당 vs 비밀창고 vs 자기장 추천

- **명당** (이 작업) = 영상에서 추출한 프로 위치. 정적 JSON. S/A/B/C.
- **비밀창고** (유지) = `StashMarkers`/`useStashLocations`. location-service `/locations`에서 `proTeamNames` `비밀창고` 필터. 그대로 둠.
- **자기장 추천** (삭제) = `LocationMarkers`/`useLocations`. 더미 데이터. 제거.

## 좌표계 (주의)

명당 gy = 이미지 좌표(위 0 → 아래 1). Leaflet CRS.Simple = 아래 0 → 위 1. → 마커 center `[1 - gy, gx]` (기존 `LocationMarkers`와 동일 규칙).

## 진행 로그

- 2026-05-26 — 이슈 생성(PUB-36), 워크트리 생성, 계획 3종 작성. 구현 시작 전.
