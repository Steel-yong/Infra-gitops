# 트랙 A 체크리스트 — 줌 자기장 추출

> 완료 시 즉시 체크. 참조 [[plan]].

## 선행 결정
- [ ] D-TEL: broadcast telemetry 접근 가능 여부 확인(사용자/조사)
- [ ] D-GATE: 부모 제약 = 검출 prior(full-inside) / 학습 게이트(center-inside) 분리 확정
- [ ] Linear 이슈번호 부여(A-1~A-6)

## A-1 페이즈 반경 단일 테이블
- [ ] shared에 prior 테이블 정의(SUPER shrink → radius_norm 생성)
- [ ] radius_norm이 리서치 §3.2와 유닛 일치
- [ ] circle.service.ts / probe_ring_bbox.py 테이블 참조로 교체
- [ ] P5~7 불일치 제거 확인
- [ ] map_side 8000→8160, radius/diameter 정리(grep 8000 잔존 0)

## A-2 좌표변환 배선
- [ ] detectZoneZoom()에서 deriveZoomTransform()+localizeNextZone() 호출
- [ ] 2v/4v 실프레임 ±1% 일치
- [ ] 앵커 부재 null 가드 유닛테스트
- [ ] 반환 phase 일관성 검증

## A-3 맵-square 검출
- [ ] map_square_px 검출(4꼭지점/한 변)
- [ ] 샘플 ≥10장 수동 측정 대비 ±2%
- [ ] r_px = radius_norm·map_square_px 적용, 고정 해상도 가정 제거
- [ ] 방송별 보정상수 캐시, 다른 프레임 ≤1%

## A-4 줌단계 식별 + soft gate
- [ ] soft gate(phase+r+arc+center+isGame) 구현
- [ ] 가짜원 프레임셋 오검출률 hard 대비 감소
- [ ] 줌단계 모호성 해소(휠카운트 or 반경비), 19장 분류정확도
- [ ] scale_from_ring 기록·보정상수 일치

## A-5 telemetry 검증 하네스 (D-TEL 후)
- [ ] GameState 자기장 시계열 파싱
- [ ] 추출 vs telemetry residual HTML 리포트
- [ ] telemetry 불가 시 수동라벨 ≥20장 폴백 리포트

## A-6 (후순위)
- [ ] 다음 원 안정화(반경비+흰픽셀)
- [ ] 콜드스타트 폴백 설계 분리 이슈
