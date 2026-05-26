# 밤샘 자율작업 핸드오프 — 2026-05-27

> 이 문서는 **다음 세션(백그라운드 자율)이 켜자마자 읽고 바로 이어가도록** 현재 상태·결정·작업큐·제약을 정리한 것이다. 세션 시작 시 CLAUDE.md 0부 프로토콜 + 이 문서를 먼저 읽어라.

## 0. 운영 모드 (자율 루프)
- 스스로 생각 → 구현 → **Codex 헤드리스 검수** → 피드백 반영 → 반복. 최선의 방법을 탐색한다.
- **브랜치 규칙(중요)**: `develop` 직접 커밋 금지. **`feature/overnight-2026-05-27`** 브랜치를 만들어 거기서만 작업·커밋한다. 아침에 사용자가 PR로 리뷰·머지.
- 각 코드 변경은 Codex 검수에서 **BLOCKER 0 / VERDICT APPROVED**까지 반복한다. 같은 항목 2회 이견이면 문서에 적고 다음으로(사람 판정 대기).
- **라이브 검증 불가** — PUBG 화면공유·게임플레이가 필요한 검증은 못 한다. 코드 + 유닛테스트 + Codex까지만 하고, 라이브 필요한 항목은 결과에 **"아침 라이브확인 필요"**로 표시.
- 막히거나 결정 필요하면 추측하지 말고 이 문서 하단 "막힌 점"에 기록하고 다음 항목으로 넘어간다.
- **빌드 안 돌려보고 커밋 금지** (오늘 사고의 원인). 변경 후 `tsc`/빌드/테스트 확인 후 커밋.

## 1. 현재 상태 (오늘 2026-05-26~27 한 일)
오늘 PUB-39(줌/SIFT/opencv) 작업이 잘 되던 핵심기능 3개를 깨뜨려 전부 복구함. **develop에 푸시 완료(33e3ccb).**
- `f0dc52c` capture 컴파일 크래시 복구 (opencv-js declare module이 패키지 자체 타입과 충돌 → 로컬 타입+단언, 락파일 동기화).
- `20d890f` 전체맵 검출 복구 — RANSAC이 서브샘플(3000)로 점수내 얇은 원이 솎여 594<800 탈락. **best 후보를 전체 점(points)으로 재채점**(594→1779).
- `b2912ec` SIFT 폴백을 `SIFT_ZONE_ENABLED` env로 게이트(기본 off) — 매 프레임 AKAZE로 느려지던 것 해소(SIFT 성공 0%였음).
- `33e3ccb` 락 풀림 수정 — 30초 stale-expire 제거, 페이즈 재락 단조증가(+낮은페이즈 5연속=새게임 재락).
- `4522400` PUB-40 유저위치 계획.

**현재 동작**: 전체맵 자기장 검출 ✅ / 빠름 ✅ / 락 유지 ✅ / 줌(확대) ❌(SIFT off).

## 2. 결정사항 (사용자 확정 — 변경 금지)
- 어드민 페이지 인증 = **간단 비번(env 변수)**.
- 종료감지(D) = **어두움 게이트 + OCR 필수확인.** 어두운 프레임일 때만 OCR을 돌려 결과화면 텍스트가 확인돼야 초기화. **어두움만으로 초기화 금지**(동굴·야간 오판 방지).
- C/E = **PoC 결과로 더 쉬운(=AKAZE inlier 높은) 것 자동 선택.** 둘 다 무방.
- CDN / Mixpanel = **지금 안 함**(나중 백로그).

## 3. 작업 큐 (이 순서대로)

### B. 회귀 테스트 굳히기 [최우선·안전망]
무인 작업의 안전망. 이게 있어야 이후 작업이 핵심을 다시 안 깬다.
- `apps/services/capture/scripts/probe-shots.ts`(이미 있음, 일회성 프로브)를 **정식 vitest 테스트**로 굳힌다.
- 픽스처: `.claude/images/1페.png`(전체맵 phase1), `2페.png`(전체맵 phase2). `processFrame(base64, hintPhase)`로 검출 성공 + phase·r(±오차) 검증.
- `useLockedCircle` 유닛테스트: ①null→락 ②높은페이즈→갱신 ③낮은페이즈 5연속→재락, 4연속까진 유지 ④같은페이즈/null→유지.
- 검증: `pnpm --filter @pubg-helper/capture test` (+ frontend test) 통과.

### PoC. C/E 난이도 측정 [데이터로 4번 결정]
- C(줌): `1페확대.png/1페짤림1~3.png/2페확대.png`를 sift-zone AKAZE에 넣어 inlier 측정.
- E(유저위치): 각 스크린샷 **미니맵 영역(우하단)** 크롭 → AKAZE inlier 측정.
- inlier 높고 안정적인 쪽이 feasible. 결과를 이 문서 "PoC 결과"에 기록하고 4번에서 그걸 구현.

### D. 종료감지 정밀화 [OCR 필수]
- 현재 `apps/frontend/src/hooks/endScreenClassifier.ts`: 치킨 노랑6%/죽음 어두움72% (픽셀비율만).
- 변경: **어두움을 1차 게이트**로 → 어두울 때만 OCR(Tesseract, 기존 ocrWorker 재사용) → 결과화면 텍스트(예 `#N/99` 순위, "다음", "결과") 확인 → **OCR 확인돼야 초기화.**
- 유닛테스트: `다음.png`(어두움90%·OCR순위→초기화O), `치킨.png`(노랑→O), `데스.png`(어두움81%→OCR확인 필요), 어두운 인게임 샘플(초기화X).
- 라이브확인 필요(아침).

### 4. 더 쉬운 기능 구현 (PoC 결과로 C 또는 E)
- **C(줌, PUB-39)**: 잠긴 `parentCircle`(다음 자기장은 이 안) + 페이즈 반경 고정 → 확대 화면에서 **호만** 찾는 방식으로 재설계. (현재 SIFT-전체매칭은 실패율 높음.) 새 접근이 사용자가 제안한 핵심.
- **E(유저위치, PUB-40)**: 미니맵→게임좌표, shared에 `PlayerPosition{x,y,heading}`, capture `detectPlayer()`, 프론트 `PlayerMarker`([1-y,x]+방향회전). 계획서: `docs/projects/2026-05-26-pub-40-*`.
- 유닛테스트까지. 라이브확인 필요(아침).

### 5. 어드민 페이지
- Next.js 별도 라우트(예 `/admin`), **env 비번 게이트**(미들웨어 또는 서버컴포넌트 체크).
- capture/location/alert API를 호출해 응답·동작을 확인하는 테스트 UI(버튼→호출→결과 표시).
- 유닛/통합 테스트. 라이브확인 필요(아침).

## 4. 핵심 기술 컨텍스트
- 검출 진입: `capture.service.processFrame(base64, hintPhase?, parentCircle?)`.
  - `hintPhase` 없으면 검출 skip(OCR 게이트키퍼). parentCircle = 잠긴 자기장, 다음 페이즈는 이 안에서만 검색(배선됨: page.tsx→useCaptureSocket→gateway).
- `circle.service`: phase1 흰픽셀 RANSAC, phase2~8 blue-edge. minScore phase1=800. **점수는 best를 전체점으로 재계산(20d890f).**
- `sift-zone.service`: AKAZE 호모그래피(화면→게임좌표). `SIFT_ZONE_ENABLED` env로 게이트(현재 off). opencv 타입은 `src/types/techstark-opencv-js.d.ts`(로컬 모듈).
- 좌표계: `CircleData` x,y는 이미지좌표 0~1. 프론트 Leaflet은 `[1-y, x]`.
- 스크린샷: `.claude/images/` (1페=전체맵1, 2페=전체맵2, 1페확대·짤림=줌, 다음=사망결과, 치킨·데스=종료).

## 5. 도구·명령
- 빌드/기동: `docker compose build <svc> && docker compose up -d <svc>` (capture:3001 location:3002 alert:3003 frontend:3000).
- 호스트 단독 실행/검출 프로브: `cd apps/services/capture && TS_NODE_TRANSPILE_ONLY=1 pnpm exec ts-node -r tsconfig-paths/register scripts/probe-shots.ts`.
- Codex 헤드리스 검수:
  ```bash
  CODEX="$(ls -t /mnt/c/Users/USER/AppData/Local/OpenAI/Codex/bin/*/codex.exe | head -1)"
  "$CODEX" exec --cd "D:\infra project\Infra-gitops" -s read-only --skip-git-repo-check \
    "<검수 프롬프트> ... 마지막 줄에 'VERDICT: APPROVED' 또는 'VERDICT: CHANGES_REQUESTED'만 출력하라."
  ```
- 코딩 규칙: `any` 금지, `console.log` 커밋 금지, 새 소스 첫 줄 한국어 역할주석, 변경→빌드확인→커밋.

## 6. 하지 말 것
- `develop` 직접 커밋 금지(브랜치만). 라이브 검증 필요한 걸 "됐다" 단정 금지.
- 빌드 안 돌려보고 커밋 금지. `SIFT_ZONE_ENABLED`를 함부로 켜서 전체맵 느리게 만들지 말 것.

## 7. 진행 로그 (다음 세션이 채워라)
- [ ] feature/overnight-2026-05-27 브랜치 생성
- [ ] B 회귀 테스트
- [ ] PoC 결과: (C inlier=__, E inlier=__) → 선택=__
- [ ] D 종료감지 OCR
- [ ] 4 기능 구현
- [ ] 5 어드민 페이지

## 8. 막힌 점 / 결정 대기 (사람용)
- (없음 — 생기면 여기 적기)
