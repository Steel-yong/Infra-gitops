# 분리 브랜치 테스트 정리 (2026-05-27)

> 밤샘 작업(feature/overnight-2026-05-27)을 기능별 브랜치로 분리한 뒤, **무엇을 어떻게 검증하는지** 한 곳에 정리.
> 라이브 항목은 사용자가 화면공유·게임플레이로 직접 확인. 확인되면 [x].

## 1. 브랜치 현황 (모두 push 완료, PR base = develop)

| 브랜치 | 내용 | 검증 | 영향 서비스 |
|--------|------|------|-------------|
| ~~`feature/PUB-38-taego`~~ | 태이고 명당 526개 데이터 | ✅ 라이브 확인·**develop 머지 완료** | frontend (data) |
| `feature/PUB-37-gameend` | 게임 종료(치킨/사망) 감지 OCR | 라이브 + 유닛 | frontend (hooks) |
| `feature/PUB-39-zoom` | 줌 자기장 parentCircle 제약 | 라이브 + 유닛 | capture |
| `feature/admin` | `/admin` 비번 게이트 + API 테스트 패널 | 라이브 + 유닛 | frontend |
| `feature/regression-tests` | useLockedCircle 회귀 테스트 | 유닛만 | frontend (test) |
| `feature/agents-viz-rule` | bible 규칙 2개(시각화 자료·이슈 분리) | 검증 불요(문서) | docs |

세 라이브 브랜치는 서로 다른 서비스(frontend data / frontend hooks / capture)라 **독립 머지·독립 테스트** 가능.

## 2. 라이브 테스트 (사용자 직접 — 화면공유)

### PUB-38 태이고 명당 ✅ 완료 (2026-05-27 머지)
- [x] 태이고 맵 선택 → 명당 마커 526개(S6/A26/B83/C411) 표시 — 사용자 확인(1px 오차 허용).
- [x] (참고) 에란겔 955개 정상 표시.
- develop 머지 완료(`588029e`), 브랜치 삭제.

### PUB-37 종료감지 OCR
- [ ] **치킨** — 노란 치킨 화면에서 알림 + 자기장 초기화.
- [ ] **사망** — 어두운 결과화면 + 순위("#N/99") 텍스트 → OCR 확인 후 초기화.
- [ ] **오판 없음** — 동굴·야간 등 어두운 인게임에서는 초기화 안 됨(OCR 텍스트 없음).

### PUB-39 줌 자기장
- [ ] 선행: capture에 `SIFT_ZONE_ENABLED=true` 설정(기본 off — 매 프레임 AKAZE 비용 때문).
- [ ] 전체맵 줌인 상태에서 자기장 원 복원, 부모 제약으로 우상단 가짜원 억제.
- [ ] 과도 줌·후반 페이즈에서 `tol`(부모반경*0.2)·`MIN_STRONG_INLIERS`(120) 튜닝 필요 여부 기록.

### 어드민 페이지
- [ ] 선행: frontend에 `ADMIN_PASSWORD` 설정(미설정 시 `/admin` 잠김).
- [ ] `/admin` 접속 → 미인증이면 `/admin/login` 리다이렉트.
- [ ] 올바른 비번 → 패널 진입. 틀린 비번 → 에러.
- [ ] capture/location/alert health·locations 버튼 → 실제 응답(HTTP 상태+본문) 표시.
- [ ] 로그아웃 → 다시 로그인 요구.

## 3. 유닛 테스트 (자동 — 라이브 불요)

| 브랜치 | 테스트 | 결과 |
|--------|--------|------|
| regression-tests | useLockedCircle.test | 6/6 |
| PUB-37-gameend | endScreenClassifier.test | 10/10 |
| PUB-39-zoom | zone-geometry.spec | 9/9 |
| admin | admin-auth·login-route·pages | 18/18 |

## 4. 테스트 선행 절차
1. 각 브랜치를 develop로 PR 머지(서비스가 달라 순서 무관).
2. 해당 서비스 재빌드 — frontend(`PUB-38`,`PUB-37`) / capture(`PUB-39`).
3. 화면공유로 위 라이브 항목 확인.
- 대안: 통합 테스트 브랜치에 셋 다 머지 후 한 번에 검증.

## 5. 라이브 불요 (즉시 머지 가능)
- `regression-tests`, `agents-viz-rule` — 유닛/문서뿐이라 화면 확인 불필요.

## 6. 미분리·후속
- **E 유저 실시간 위치** — PoC상 미니맵 매칭만으론 부족, 플레이어 화살표 검출 필요 → 별도 이슈.
