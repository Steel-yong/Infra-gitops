# 줌 자기장 로컬라이제이션 — Claude↔Codex 5라운드 (사용자 정정 반영 + 6안)

원문: `.local/zoom-debate-r5-codex.txt` · 프롬프트: `.local/zoom-debate-r5-prompt.md`

## 트리거 — 사용자 정정
r3에서 "후반 줌 목적은 존 가장자리 보기 → 플레이어가 화면 밖 → 플레이어 앵커 강등"으로 판정했으나,
**사용자가 정정: "플레이어가 가장자리를 보려고 줌하지 않는다."**
→ 줌 프레임에 플레이어 아이콘이 있을 가능성이 r3 가정보다 높음 → 플레이어 앵커 재평가. (메모리: project_pub39_zoom_behavior)

## 과제 A — phase별 주력 갱신 (플레이어 앵커 부활)

| Phase | 갱신된 주력 | 플레이어 아이콘 지위 | 보조·게이트 |
|---|---|---|---|
| 2 | 플레이어 앵커 + 줌레벨 scale 사전표 + 공지 윈도우 lock | 주력 | 원 ruler 재앵커 보조, F 약한 gate |
| 3 | 플레이어 앵커 + 원 ruler 교차검증 | 주력 | 줌레벨 scale, parent containment, F 약 gate |
| 4 | 플레이어 앵커 + 원 ruler + 조건부 F | 공동 주력 | F arc 충분할 때만 강, 부족하면 ruler 우선 |
| 5 | 미니맵 경계기하 F + 플레이어 앵커 | 공동 주력 | 원 ruler 재앵커, scale 사전표 gate |
| 6 | 미니맵 F + 플레이어 앵커 + multi-frame 합의 | 공동 주력/강한 보조 | 작은 원·clutter로 단독 위험, 보이면 매우 강함 |

이유: "주로 화면 밖" 가정 폐기 → 플레이어 아이콘은 2·3페 주력 후보로 복귀. 4페부터 원·미니맵 관측성이 올라가 공동 주력. 5·6페는 F가 강해지나 플레이어는 P_world를 직접 주는 anchor라 여전히 고가치. 단 "항상 중앙/항상 보임"은 미측정 → 가시 빈도 측정 필수.

## 과제 B — 6개 end-to-end 방법

| # | 방법 | 라벨 | 검증된 검출만? | 정확도 천장 | phase 적합 | 핵심 미측정 가정 |
|---|---|---|---|---|---|---|
| 1 | 플레이어 앵커 공지 윈도우 lock | **[최선]** (Codex 추천) | 아니오(아이콘 미검증) | 높음 | 2·3·4 최적 | 윈도우서 아이콘 충분히 보임 |
| 2 | 원 ruler 재앵커 | — | **예(흰 원 RANSAC만)** | 중상 | 3·4·5 | 공지 순간 충분한 arc |
| 3 | 미니맵 경계기하 F | — | 아니오 | 중상 | 5·6 최적 | 후반 경계 arc 가시·회전 제어 |
| 4 | 결정론 지도앵커(라벨·해안·도로) | — | 아니오 | 높음 | 중반 | 렌더가 사전지도와 결정론 일치 |
| 5 | 다관측 factor graph 융합 | **[최고]** (천장 최고) | 아니오(primitive 다수) | 6개 중 최고 | 2~6 전체 | primitive false-positive 분포 추정 데이터 |
| 6 | ML retrieval 줌 위치검색 | — | 아니오 | 높을 수 있음 | 2·3·4 | 합성-실제 domain gap 견딤 |

### 각 방법 동작 요약
- **1**: 공지 윈도우 N프레임 → 줌서 플레이어 아이콘 검출 → P_world 연결 → 줌레벨 scale 후보 → 흰 원·parent containment gate → N-of-M 합의 commit. 실패: 아이콘 미검출·UI겹침·P_world drift·scale 오류.
- **2**: 전체맵서 기존 원(중심·반경) 저장 → 줌서 흰 원 RANSAC → 반경비 scale → arc 중심 기준 translation 역산 → parent·phase gate → cluster 안정 시 commit. 실패: 현재/다음 원 혼동·짧은 arc·흰 UI 노이즈.
- **3**: 미니맵서 경계 arc 검출 → 중심·회전·scale로 viewport 후보 → 전체맵 원·phase로 후보 축소 → 줌 arc/아이콘 gate → 후반 commit. 실패: 중반 arc 평평·미니맵 회전 drift·UI 가림.
- **4**: 줌서 라벨·해안·도로·건물 윤곽 검출 → 사전 anchor index 매칭 → transform 후보 → 원·아이콘 gate → multi-frame 반복 시 commit. 실패: 테마변화·라벨가림·배율별 스타일·anchor 희소.
- **5**: 윈도우 동안 모든 관측(아이콘·원·F·scale·지도앵커)을 factor화 → 신뢰도·오차모델 부여 → viewport·scale·translation·phase latent → parent·phase hard constraint → N프레임 최적화, posterior 최협 commit, 낮으면 보류. 실패: 오차모델 틀리면 높은 헛confidence·복잡도·디버깅.
- **6**: 전체맵을 zoom·crop·style 합성 → retrieval index → 줌 crop embedding → nearest 검색 → 원·아이콘·phase 재랭킹 → 수렴 시 commit. 실패: domain gap·맵업데이트·유사지형·편향.

## Codex 단일 추천
첫 빌드 = **방법 1(플레이어 앵커 윈도우 lock)**. 사용자 정정 후 플레이어 아이콘이 가장 값싼 절대 anchor로 복귀, 검증된 흰 원 RANSAC을 gate로 붙이면 단독 아이콘 검출 위험 완화. 순서: 아이콘 검출률 측정 → 줌레벨 scale 후보표 → 원 ruler gate → N-of-M commit. factor graph는 최종형 최고지만 첫 빌드엔 미측정 primitive 과다.

## Claude 이견 (양방향 피드백)
**최선(첫 빌드)은 방법 2가 더 안전하다는 반론.** 방법 1은 미검증 검출(플레이어 아이콘) + P_world 부트스트랩 의존을 추가한다. 방법 2는 필요한 검출이 **전부 이미 라이브 검증된 흰 원 RANSAC뿐**이고, 이미 락된 현재 원이 그 자체로 절대 anchor+자(ruler)다. 단점은 "아는 원이 같이 보여야"인데, 다음 원만 보일 때만 플레이어/지도앵커가 필요하다.
→ **실용 권고: 방법 2를 코어로 먼저(공통 commit/gate 프레임워크 위에), 방법 1을 두 번째 anchor 소스로 추가.** 둘은 같은 프레임워크를 공유하므로 1+2 동시 진행이 자연스럽다. 최종 판정은 사용자.

## 빌드 전 측정 (가장 결정적 2개)
1. phase 2~6별, 공지 윈도우 줌 프레임 안 **플레이어 아이콘 가시율·검출률** (방법1 가치 확정).
2. 같은 윈도우 **흰 원 arc 검출률 + 현재/다음 원 혼동률** (방법2 가치 확정).
