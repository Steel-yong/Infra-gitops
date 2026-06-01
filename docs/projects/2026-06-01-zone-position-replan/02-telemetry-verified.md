# telemetry 실측 검증 — 결과·자료·재현 (3개 플랜 공통 토대)

> 2026-06-01 실측. [[00-reference-past-decisions]] · [[01-research-findings]]의 D-TEL을 실데이터로 종결. 세 플랜(1 프로위치 / 2 자기장 발전·검증 / 3 라이브 추출)이 이 문서를 공통 근거로 참조한다.

## 1. 접근·보관 — 확정
- `tournaments` 엔드포인트로 e스포츠 telemetry 접근됨(API 키 필요, 무료, 10 RPM). 매치·telemetry 다운로드는 **키 불필요 + rate limit 미적용**.
- **대회 1097개, 2018-06-13 ~ 2026-05-30 — 사실상 영구 보관.** (일반매치 "14일"과 무관.) PGS5 전부 존재.
- telemetry는 영상이 아니라 JSON 이벤트. 자기장·선수위치를 **정확한 숫자**로 제공.

## 2. 자기장 정답 — 확정
- `LogGameStatePeriodic.gameState.safetyZonePosition/Radius`(다음 흰 원), `poisonGasWarningPosition/Radius`(현재 블루존), cm, (0,0)=좌상단, 8x8맵 변=816000cm.
- 한 경기 184스냅, 전 구간. 반경이 0.7132→0.2496→0.1373→0.0824→… 로 축소.
- **우리 실측(ml-zoom-verify) 교차검증 일치**: P1 0.2496 vs 0.2492, P2 0.1373 vs 0.1374, P3 0.0824 vs 0.0815. → 반경 prior를 telemetry로 확증(플랜2 P2-1).

## 3. 프로 위치 + 상태 플래그 — 확정
- `LogPlayerPosition` 한 경기 7607건, 60명, **~10초 주기**, 전 구간.
- character 내장 플래그: `isInVehicle`(운전), `isInBlueZone`(자기장 밖), `isDBNO`(기절), `health`, `teamId`, `ranking`, `numAlivePlayers`, `zone`(지역명).
- `LogParachuteLanding`(착지), `LogVehicleRide/Leave` 각 938건.
- → 운전·공중·자기장밖을 모두 걸러 "걸어서 자기장 안에 있던 프로 위치"만 정제 가능.

## 4. 명당 추출 로직 검증 — 성공 (플랜1 핵심)
스펙: **착지 무시. 자기장 안(`isInBlueZone`=false) + 비차량(`isInVehicle`=false) + 착지후. 3샘플 연속(~20~30초) 이동량 < T(정지)면 그 중심을 명당으로, 페이즈 태깅. P1~P5만**(P6~9는 자기장 극한 축소로 교전 강제 자리·사람 흩어짐·표본 희소 → 명당 무의미, 사용자 결정).
- 1경기 실행 결과(에란겔): 자격표본 6011, 차량제외 1400, 존밖제외 196.
- **명당 458개**(T=10m, P1~5). 페이즈별 P1 283 / P2 68 / P3 38 / P4 39 / P5 30.
- 정지임계 분포(튜닝, P1~5): T=5m 361 / 10m 458 / 20m 510 / 50m 388개. → T(정지 임계) 확정은 플랜1 P1-4.
- 미정교: `skip_air=0` — LogParachuteLanding 이름매칭 보정 필요(플랜1 P1-3).

## 5. 자료·스크립트 인덱스 (재현)
| 경로 | 역할 |
|---|---|
| `.local/verify-pubg-telemetry.py` | 접근·보관·자기장 존재 검증(키 필요) |
| `.local/explore-telemetry.py` | 주기·커버·착지·자기장 타임라인 추출 → data.json |
| `.local/extract-pro-holdings.py` | 명당(자기장안+비차량+정지3) 추출 → holdings.json |
| `docs/resources/mockups/2026-06-01-telemetry-탐색/index.html` | 자기장 축소·착지 분포 시각화 |
| `docs/resources/mockups/2026-06-01-telemetry-탐색/data.json` | 착지66 + 자기장184스냅 |
| `docs/resources/mockups/2026-06-01-telemetry-탐색/holdings.json` | 명당 540개(페이즈태깅) |

## 6. 좌표·맵 메모
- 정규화 = cm / map_side. 8x8(에란겔=Baltic_Main/미라마=Desert/태이고=Tiger/비켄디=DihorOtok/데스턴=Kiki/론도=Neon) 816000, 사녹=Savage 408000.
- 프론트 마커 `[1 - y, x]`(이미지 y下 → Leaflet lat上). SVGOverlay 그대로.
- **명당은 절대좌표(지형 고정)로 저장한다 ★사용자 확정.** 자기장은 매 경기 랜덤이지만 지형(건물·고지)은 절대맵에 고정 → 명당은 절대 위치. 추천 = "라이브 자기장(절대, 플랜3) ∩ 절대 명당 DB" 매칭(자기장이 그 명당을 덮을 때 추천). 자기장 컨텍스트(당시 안전지대 중심·반경)는 조건부 랭킹용 메타로 부가 저장(플랜1 P1-6).

## 7. 세 플랜으로의 함의
- **플랜1**(프로위치 telemetry): telemetry로 명당 DB(절대좌표, P1~5).
- **플랜2**(유튜브 영상추출): 이전 접근, **보류(PAUSED) 보존** — telemetry 미커버(비-토너먼트) fallback 가치.
- **플랜3**(자기장 시스템): 화면공유 **라이브 추출 + telemetry prior 발전 + 검증**을 한 플랜에. 라이브 추출은 telemetry로 대체 불가(핵심).
