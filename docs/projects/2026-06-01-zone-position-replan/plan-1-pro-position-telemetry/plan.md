# 플랜 1 — 프로위치 telemetry 추출 (명당 DB)

> 참조 [[02-telemetry-verified]]. Linear 조회 불가 → 이슈번호 placeholder `P1-n`. 유튜브 영상 추출([[trackB-pro-position/plan]])은 **중단(PAUSED)**, 본 플랜이 대체.

## 목표
공식 PUBG telemetry로 **페이즈별(P1~P6) "자기장 안에서 자리 잡은(정지)" 프로 위치**를 추출해 **절대좌표 명당 DB**를 구축한다.

## 확정 스펙 (사용자)
- **착지지점 X.** "자기장 안에서 자리 잡은" 위치만.
- **자기장 안만**(`isInBlueZone`=false). **차량 제외**(`isInVehicle`). **공중 제외**(착지 전).
- **정지 판정**: 위치 ~10초 주기. **3샘플 연속(~20~30초) 이동량 < T** 이면 그 중심을 명당으로.
- **P1~P5만.** P6~9는 자기장 극한 축소로 교전 강제 자리·사람 흩어짐·표본 희소 → 명당 무의미.
- **절대좌표 저장.** 자기장은 랜덤이나 지형은 절대 고정 → 명당은 절대 위치. (자기장 컨텍스트는 메타.)

## 검증 완료 (1경기)
자격표본 6011, 차량제외 1400, 존밖 196 → **명당 458개(T=10m)** P1 283 / P2 68 / P3 38 / P4 39 / P5 30. 로직 동작 확인([[02-telemetry-verified]] §4).

## 이슈 분할

### P1-1. telemetry 수집 파이프라인  `worktree: feature/pos-telemetry-collect`
1. tournaments 열거 → 대상 대회(예 PGS5) 매치ID → telemetry URL → 다운로드·로컬 캐시(맵명·경기시각 메타).
   → 검증: N개 매치 telemetry 캐시 성공, 맵별 경기수 집계 출력.
2. 키는 목록조회에만(10 RPM), telemetry는 무키. 재실행 시 캐시 스킵.
   → 검증: 2회 실행 시 2회차 네트워크 호출 0.

### P1-2. holding 추출기 제품화  `worktree: feature/pos-holding-extractor`
`extract-pro-holdings.py` 로직을 모듈로(자기장안 + 비차량 + 착지후 + 3샘플 정지 + P1~6).
1. 순수 함수 분리(샘플열 → holding 목록).
   → 검증: 합성 트랙 유닛테스트 — 정지/이동/차량/존밖/공중/P7+ 각 케이스 분류 정확.
2. 절대 정규화 좌표(cm/map_side) 출력 + 자기장 컨텍스트 메타(당시 안전지대 중심·반경).
   → 검증: 출력 좌표 0~1 범위, 메타 부착 확인.

### P1-3. 착지/공중 필터 정교화  `worktree: feature/pos-air-filter`
현재 `skip_air=0`(LogParachuteLanding 이름매칭 미작동) 수정.
1. accountId 기준 매칭 + 착지 elapsedTime 이전 표본 제외. 착지 이벤트 없는 선수 폴백(첫 지상 표본).
   → 검증: 착지 전 위치 표본이 실제로 제외(존재 시 skip_air>0), 합성 케이스 통과.

### P1-4. 정지 임계 T 확정  `worktree: feature/pos-threshold`
1. T=5/10/20/50m 분포 비교(확보됨) + 알려진 hold 스팟 수동 대조로 명당 정의 확정.
   → 검증: 채택 T에서 추출 명당이 실제 건물·엄폐 지형과 일치하는 비율(수동 표본 ≥20).

### P1-5. 다경기 집계 → 명당 DB 스키마  `worktree: feature/pos-myungdang-db`
1. 여러 경기 holding 합산 → `{map, phase, x_abs, y_abs, freq, avg_dur, zone_ctx[]}` 절대좌표 핫스팟.
   → 검증: 한 맵 N경기 합쳐 페이즈별 절대 히트맵 생성, 핫스팟 군집 확인.
2. 맵별 분리(에란겔/미라마/태이고/비켄디/론도 우선).
   → 검증: 맵 분류 정확(mapName).

### P1-6. 자기장 컨텍스트 메타 (조건부 랭킹용)  `worktree: feature/pos-zone-context`
절대좌표가 1차 키. **추가로** 각 명당에 "당시 안전지대 중심·반경"을 메타로 달아, 추후 "자기장이 이쪽일 때 이 명당이 더 좋다" 조건부 랭킹을 가능하게.
1. holding마다 zone_ctx 저장, 추천 시 라이브 자기장과의 정합도 점수.
   → 검증: 같은 명당이 자기장 위치별로 빈도 차 보이는지 분석.

## 의존
- 트랙 3(라이브 자기장)·플랜2와 **독립 → 즉시 착수 가능.** 제품 통합(라이브존 ∩ 명당) 시 플랜3 산출물과 결합.

## 자료
[[02-telemetry-verified]] §5 스크립트·데이터. 도시 anchor·맵 메타 재사용.

## 상시 지침
이슈별 worktree, PR base develop, 새 파일 첫줄 한국어 주석, `any`/`console.log` 금지, 완료 전 테스트. telemetry 키는 시크릿 — 환경변수만, 깃 금지.
