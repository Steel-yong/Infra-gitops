# PUB-39 체크리스트 — 확대 자기장

## v1 (배포됨)
- [x] SiftZoneService — AKAZE 호모그래피 + 호 피팅 + 페이즈 추정
- [x] capture.service 폴백 연결 (전체맵 실패 시 detectZone)
- [x] @techstark/opencv-js(WASM) 의존성 추가
- [x] PoC 검증 (줌.png: erangel inlier 808)

## v2 — OCR 페이즈 힌트
- [ ] detectZone(base64, hintPhase?) 시그니처 추가
- [ ] capture.service에서 hintPhase를 detectZone에 전달
- [ ] fitZone에 hintPhase 경로 — 반경 고정 + 중심만 RANSAC (작은 호 견고)
- [ ] hintPhase 없을 때 v1 폴백 유지
- [ ] Codex 검수 (review)
- [ ] capture 컨테이너 재빌드/재시작
- [ ] 라이브 테스트 (적당한 확대에서 표시 확인)

## v3 (추후)
- [ ] 흰 픽셀 오염 제거 — 자기장 호만 분리
- [ ] 단색 지형(물·평지) 대응
