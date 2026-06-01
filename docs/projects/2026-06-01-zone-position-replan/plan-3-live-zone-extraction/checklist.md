# 플랜 3 체크리스트 — 자기장 시스템 (라이브 추출 + 발전 + 검증)

> 완료 시 즉시 체크. 참조 [[plan]].

## 선행
- [ ] Linear 이슈번호 부여(P3-1~P3-9)

## A. 라이브 추출
### P3-1 줌 좌표변환 배선
- [ ] detectZoneZoom()에서 deriveZoomTransform()+localizeNextZone() 호출
- [ ] 2v/4v 실프레임 ±1%
- [ ] 앵커 부재 null 가드
### P3-2 맵-square + 실패모드
- [ ] 전체맵서 map_square_px 검출·캐시, 샘플 ±2%
- [ ] 줌서 경계 없으면 캐시/명시적 실패(추정 폴백 금지)
### P3-3 줌단계 + soft gate
- [ ] soft gate 임계 명문화(arc_ratio 등)
- [ ] 오검출률 baseline 대비 ≤목표
- [ ] 19장 (페이즈,줌) 분류 정확도 ≥목표
### P3-4 ruleset 선택
- [ ] 런타임 ruleset 선택 기준
- [ ] 기존 화면공유 검출 회귀 없음
### P3-5 부모 제약(검출 prior)
- [ ] full-inside 비례 tol 유지, 후반 페이즈 회귀 9/9

## B. 발전
### P3-6 반경 테이블 telemetry 확정
- [ ] shared 테이블(ruleset/map/phase/radius_norm/diameter_norm/shrink/source)
- [ ] radius_norm이 telemetry+ml-zoom-verify ≤1%
- [ ] circle.service.ts/probe 통일, P5~7 불일치 제거, map_side 8160, grep 8000=0
### P3-7 다음존 시프트 예측
- [ ] (현재중심·반경, 다음중심) 분포 수집
- [ ] 시프트 모델(이동 ≤ R-r), 확률분포
- [ ] hold-out 예측 vs 실제 오차분포 + 커버리지율

## C. 검증
### P3-8 telemetry 검증 하네스
- [ ] broadcast 프레임 ∩ telemetry 매치 대조 HTML residual
- [ ] 동일매치 ≥N장 중심·반경 오차분포
- [ ] 합성(telemetry 렌더) 회귀
### P3-9 검증 임계 확정
- [ ] phase별 중심오차 ≤X, 반경오차 ≤Y%, 표본 ≥N 명문화
