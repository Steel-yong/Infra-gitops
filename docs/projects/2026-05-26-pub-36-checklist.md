# PUB-36 체크리스트 — 명당 지도 표시

## 데이터
- [x] 6번 JSON → `public/data/myungdang-erangel.json` 변환 (737개, {gx,gy,tier,count})
- [x] 개수·등급수 검증 (737 / S14 A43 B109 C571)

## 타입
- [x] 명당 포인트 타입 정의 (`MyungdangTier`, `MyungdangPoint`) — `useMyungdang.ts`에 정의

## 훅
- [x] `useMyungdang(mapType)` 작성 (정적 JSON fetch, 실패 시 빈배열)
- [x] 테스트 — 로드 성공 / 실패(빈배열) / 맵전환 / URL (`useMyungdang.test.ts`)

## 마커 컴포넌트
- [x] `MyungdangMarkers` 작성 — 도넛(fillOpacity 0), 색 S/A/B/C, 크기 A캡, 좌표 [1-gy,gx]
- [x] `visibleTiers` prop 필터 + `zone` 자기장 내부 필터
- [x] 테스트 — 개수 / 도넛 / 색 / 크기캡 / 등급필터 / 자기장필터 / 좌표 (`MyungdangMarkers.test.tsx`)

## 토글 UI
- [x] page.tsx `visibleTiers` 상태 (초기 전부 켜짐)
- [x] 지도 위 S/A/B/C 버튼
- [x] 토글 동작 테스트 (page.test.tsx)

## 더미 제거
- [x] page.tsx `LocationMarkers`→`MyungdangMarkers` 교체, `useLocations` 제거
- [x] 우측 패널 → `MyungdangPanel`(명당 범례·등급수)로 용도변경
- [x] `LocationMarkers`/`LocationPanel`/`useLocations` + 테스트·css 삭제 (7파일)
- [x] 죽은 import·고아 정리 (참조 0 확인)

## 검증
- [ ] 프론트 도커 빌드(`next build`=타입체크) 통과 — **진행 중**
- [ ] 유닛 테스트 통과 (node 컨테이너)
- [ ] 커버리지 95%↑
- [ ] 비밀창고·자기장 원 정상 (수동 확인)
- [ ] 커밋 → PR(base develop)
