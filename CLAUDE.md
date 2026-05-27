# pubg — Claude 바이블 (collab)

<!-- 생성됨: build_bibles.sh collab (2026-05-27). 직접 수정 금지 — generic/CORE.md·project/pubg.md·역할 파일을 고치고 재빌드. -->
<!-- 현재 모드: collab -->

<!-- 공통 CORE (프로젝트 무관 방법론) — Claude·Codex 공통, 협업·단독 모드 공통.
     build_bibles.sh가 [generic/CORE] + [project/<프로젝트>] + [역할]을 합쳐 CLAUDE.md/AGENTS.md 생성.
     ⚠ 스택 종속 섹션 = "2부 테스트 원칙"(Vitest/Playwright), "3부 코딩 스타일"(TypeScript/React).
        다른 프로젝트로 옮길 때 이 두 섹션만 해당 스택에 맞게 교체·삭제하면 된다. -->

## 0부. 세션 시작 프로토콜

새 세션 시작 시 무조건 아래 순서로 확인한 뒤 사용자에게 보고한다. 확인 없이 작업을 시작하지 않는다.

1. `docs/projects/` 진행 중인 계획 파일을 모두 읽는다.
2. Linear에서 `In Progress` 상태 이슈를 조회한다. 도구가 없거나 권한 문제로 조회하지 못하면 추측하지 말고 `Linear 조회 불가`라고 명시한다.
3. `git worktree list`로 열린 워크트리를 확인한다.
4. `git log origin/develop..develop --oneline`으로 미푸시 커밋을 확인한다.
5. `git status`로 미커밋 변경을 확인한다.

보고 형식.

```text
현재 진행 상태.
- 계획: [docs/projects/파일명]의 [어디까지].
- 작업 중 이슈: PUB-XX.
- 미푸시 develop 커밋: N개.
- 열린 워크트리: feature-XX, feature-YY.
다음 할 일: [구체적 작업].
계속 진행할까요?
```

---

## 1부. 절대 규칙 (MUST DO / MUST NOT)

### MUST DO.

- 작업 전 관련 파일 전체를 읽는다.
- 작업 전 계획, `checklist.md`, `context-notes.md` 3종 산출물을 작성한다.
- 모든 작업은 Linear 이슈와 연결한다.
- 모든 브랜치 작업은 `git worktree`로 한다. 메인 폴더는 항상 clean 상태로 유지한다.
- 모든 PR base는 `develop` 브랜치로 한다.
- 새 소스 파일 첫 줄에 한국어 한 줄 역할 주석을 둔다.
- 사용자 결정이 필요하면 HTML 시각화부터 만든다.
- 완료 선언 전 테스트를 실행하고 결과를 보고한다.
- 논리적 변경 하나가 완료되면 즉시 커밋한다 (사용자 요청을 기다리지 않는다).
- 변경 하나 = 커밋 하나. 한 문장으로 설명 가능해야 한다.
- 한국어 문장은 마침표, 물음표, 느낌표로만 끝낸다.

### 🗣️ 대화 원칙.

- 확실하지 않으면 질문한다. 가정한 내용은 명확히 밝힌다.
- 여러 해석이 가능하면 묵묵히 선택하지 않는다. 모두 제시하고 사용자에게 선택권을 준다.
- 더 간단한 방법이 있으면 반드시 언급한다. 사용자 안이 과해 보이면 반박한다.
- 이해가 안 되면 멈춘다. 무엇이 헷갈리는지 말하고 질문한다.

### MUST NOT.

- 코드베이스를 읽지 않고 추측해서 작성하지 않는다.
- 계획, 이슈, 테스트 없이 코딩을 시작하지 않는다.
- `main` 브랜치에 직접 머지하지 않는다 (사용자 명시 요청 시에만).
- 테스트 실패 상태로 다음 단계에 진행하거나 완료를 선언하지 않는다.
- `any` 타입을 사용하지 않는다.
- `console.log`나 하드코딩 시크릿을 커밋하지 않는다.
- 요청하지 않은 기능을 추가하거나 멀쩡한 코드를 무단 리팩토링하지 않는다.
- 인접 코드, 주석, 포맷을 무단 수정하지 않는다.
- 원인 파악 전에 흔한 수정부터 적용하지 않는다 (패턴 매칭 추측 금지).
- 커버리지 95% 미달 상태로 PR을 열지 않는다.

---

## 2부. 작업 흐름

### 단계별 흐름

```
세션 시작 프로토콜 (0부)
   ↓ 1. 코드베이스 읽기 (관련 파일 전체)
   ↓ 2. 계획 수립(/ce-plan 등) + checklist.md + context-notes.md
   ↓ 3. Linear 이슈로 쪼개기 (1이슈 = 1일 이내)
   ↓ 4. git worktree로 브랜치 분리
   ↓ 5. 구현 ↔ 테스트 반복 (커버리지 95%까지)
   ↓ 6. 논리 단위마다 즉시 커밋 → PR → develop 머지 → 워크트리 삭제
```

### 이슈 분리 기준 (크기 + 문제 격리)
이슈는 **크기**(1이슈 = 1일 이내)뿐 아니라 **문제 격리** 기준으로도 나눈다.
- 서로 다른 기능·관심사가 한 작업에 섞이면, 문제가 났을 때 어디가 원인인지 찾기 어렵다.
- **실패 지점이 많거나 여러 기능이 섞이는 작업은 기능별로 이슈(브랜치/worktree)를 나눠서** 각각 독립적으로 테스트·리뷰·되돌리기가 가능하게 한다.
- 한 PR에는 한 기능만. "이 변경이 깨지면 어디를 보면 되는가"가 한 곳으로 좁혀져야 한다.

### 산출물 3종 (계획 단계)

| 파일 | 목적 |
|------|------|
| 계획 본문 | 무엇을 왜 만드는지 |
| `checklist.md` | 체크박스 작업 목록. 완료 시 즉시 체크 |
| `context-notes.md` | 작업 중 내린 결정과 이유. 다음 세션이 이어가는 근거 |

사용자가 계획만 주고 코딩하라 해도 멈추고 묻는다: "체크리스트·컨텍스트 노트 먼저 만들까요?"

### 다단계 작업 계획 형식

다단계 작업은 반드시 이 형식으로 명시한다. 각 단계마다 검증 방법이 있어야 한다.

```
1. [단계] → 검증: [확인 방법]
2. [단계] → 검증: [확인 방법]
```

"그냥 작동하게 해라" 같은 모호한 기준은 지속적 확인을 요구한다. 명확한 성공 기준은 독립 반복을 가능하게 한다.

### 검증 가능한 목표로 전환

| 모호한 지시 | 검증 가능한 형태 |
|-----------|---------------|
| 유효성 검사 추가 | 유효하지 않은 입력 테스트 작성 → 통과 |
| 버그 수정 | 버그를 재현하는 테스트 작성 → 통과 |
| 리팩토링 | 리팩토링 전후 테스트 모두 통과 |

### 커밋 / PR / 워크트리

- 커밋 기준: "이 커밋을 한 문장으로 설명할 수 있나?" 가능하면 커밋, 불가능하면 분리한다.
- 브랜치 규칙: `feature/* → develop → (최종 완성 후) main`.
- 워크트리: `git worktree add ../feature-{이슈번호} feature/{이슈번호}`.
- 커밋 후 흐름: ① "PR 생성할까요?" → push + PR. ② "머지 후 worktree 삭제할까요?". ③ "다음 이슈 시작할까요?".

### 테스트 원칙

| 종류 | 도구 | 비고 |
|------|------|------|
| 유닛 | Vitest | 외부 의존성 mock, 엣지 케이스 필수 |
| E2E | Playwright | 화면공유 플로우 자동화, 실패 시 스크린샷 |
| 커버리지 | Vitest --coverage | 95% 미달 = PR 블락 |

```bash
pnpm test            # 유닛
pnpm test:coverage   # 커버리지
pnpm test:e2e        # E2E
```

완료 선언 전 무조건 테스트를 실행한다. 테스트 환경이 없으면 최소한 빌드·컴파일이라도 확인한다.

### 에러 처리 순서

1. 전체 에러 메시지 + 스택 트레이스를 읽는다.
2. 로그에 찍힌 실제 내용을 확인한다 (예상 내용이 아니라).
3. 원인 확인 전 흔한 수정을 적용하지 않는다.
4. 불명확하면 로그를 추가해 상태를 확인한 뒤 수정한다.

키워드만 보고 패턴 매칭으로 추측하지 않는다. 한 줄 버그가 세 파일 리팩토링이 된다.

---

## 3부. 코딩 스타일

### TypeScript 기본
- strict mode 필수, `any` 금지.
- 모든 public 함수에 JSDoc.
- 에러 처리 필수 (try/catch).
- React는 함수형 + hooks만.

### 단순함 우선
- 요청한 기능 외 추가 금지.
- 일회용 코드에 추상화 금지.
- 불가능한 시나리오 에러 처리 금지.
- 200줄 짠 게 50줄로 가능하면 다시 쓴다.
- "시니어가 과하다고 할까?" 그렇다면 단순하게.

### 외과적 변경
- 꼭 필요한 것만 건드린다.
- 인접 코드·주석·포맷 무단 개선 금지. 기존 스타일이 달라도 맞춘다.
- 변경된 모든 줄이 사용자 요청에 직접 연결돼야 한다.
- 고아 정리: 내 변경으로 안 쓰이게 된 import·변수·함수는 제거. 기존부터 있던 죽은 코드는 요청 없으면 그대로 둔다.

### 새 파일 첫 줄 한국어 주석
모든 새 소스 파일 첫 줄에 역할을 한국어 한 줄로. `'use client'`·`'use server'`·shebang 바로 아래에 위치. 설정 파일(`*.config.ts`, `package.json`)은 생략.
```typescript
// 화면 캡처 프레임에서 자기장 원을 추출하는 서비스
```
```python
# 대회 영상에서 프로 선수 위치 좌표를 추출하는 파이프라인
```
이유: 에이전트는 파일을 선택적으로 읽는다. 한 줄 헤더가 다음 세션의 탐색 비용을 줄인다.

### 한국어 출력
- 사용자가 한국어로 쓰면 출력도 한국어.
- 모든 문장 종결은 `.`, `?`, `!`. 콜론은 코드·키-값·라벨에만, 문장 끝에 금지.

---

## 4부. 문서화 규칙

### docs/ PARA 구조
```
docs/
├── projects/     # 진행 중 프로젝트 계획 (완료 시 archives로)
├── areas/        # 인프라/SSH/운영 등 지속 관리 영역
├── resources/
│   ├── solutions/  # 해결된 버그·패턴 (YAML 프론트매터: module, tags, problem_type)
│   └── mockups/    # HTML 시각화
└── archives/     # 완료/비활성 보관
```
금지 경로: `docs/plans/`, `docs/solutions/`, `docs/mockups/`, `docs/decisions/` — 모두 PARA로 통일.

### HTML 시각화 (결정 필요 시 필수)
사용자가 결정해야 하는 사항은 텍스트 설명 금지. 무조건 시각화 먼저.
- 경로: `docs/resources/mockups/[날짜]-decision-[주제].html`.
- 포함: 선택지별 트레이드오프 비교표, 영향 범위, 추천 + 이유, 결정 후 액션.
- 형식: 자급자족 단일 HTML(CSS 인라인), 다크 테마, 한국어 라벨.

### 보고서·분석은 시각화 자료로
보고서, 분석 결과, 진행 요약 등은 가능하면 텍스트만이 아니라 **시각화 자료**(주로 자급자족 HTML, 표·차트)로 만들어 올린다. 경로·형식은 위 HTML 시각화와 동일(`docs/resources/mockups/`).

### 작업 산출물 경로
```
docs/projects/<작업명>/plan.md
docs/projects/<작업명>/checklist.md
docs/projects/<작업명>/context-notes.md
docs/projects/<작업명>/codex-review.md
docs/projects/<작업명>/claude-response.md
docs/projects/<작업명>/verification.md
```
단일 파일 네이밍 `docs/projects/YYYY-MM-DD-pub-XX-*.md`도 허용한다. 단 리뷰와 응답은 구분한다.

---

## 5부. 상시 지침 준수 검사

모든 계획, 구현, 리뷰, 테스트 보고에 아래 체크를 포함한다.

- 작업이 Linear 이슈와 연결되어 있는가?
- `docs/projects/`에 계획·`checklist.md`·`context-notes.md`가 있는가?
- 작업이 git worktree에서 이루어졌는가?
- 메인 폴더가 clean 상태인가?
- PR base가 `develop`인가?
- 새 소스 파일 첫 줄에 한국어 역할 주석이 있는가?
- 요청하지 않은 기능 추가나 불필요한 리팩토링이 없는가?
- `any`, `console.log`, 하드코딩 시크릿이 없는가?
- 테스트와 커버리지 결과가 보고되었는가?
- 사용자 결정이 필요한 사안에 HTML 시각화가 있는가?
- 한국어 문장이 마침표, 물음표, 느낌표로 끝나는가?

위반이 있으면 `Instruction Compliance`에 반드시 적고 조치한다.

---

## 6부. 지침 문서 보존 규칙

`CORE`, 역할 파일, 작업 계획서, 체크리스트, 컨텍스트 노트는 정돈할 수 있지만 항목을 임의로 삭제하지 않는다.

삭제가 허용되는 경우는 아래뿐이다.
- 같은 의미 항목이 명확히 중복되어 하나로 합치는 경우.
- 현재 시스템 구조에서 더 이상 적용되지 않는 규칙인 경우.
- 상위 규칙과 충돌해서 유지하면 잘못된 행동을 유도하는 경우.
- 사용자가 명시적으로 삭제를 승인한 경우.

삭제·통합 시 반드시 남긴다: 원문 요약, 정확한 이유, 대체 위치 또는 남은 동등 규칙, 사용자 승인 필요 여부. 이 설명 없이 항목을 제거한 변경은 `Blocking`으로 본다.

---

## 7부. 권한 운영 (공통 원칙)

허용 목록에 있는 도구는 사용자에게 반복 확인하지 않고 사용한다. 단 작업 목적과 결과는 보고한다.

destructive 명령, 대량 삭제, 외부 네트워크 다운로드, 시크릿 접근, 프로덕션 배포는 사용자에게 목적과 영향 범위를 먼저 알린다.

> 이 둘은 서로 다른 레이어다. **허용 목록**(예: `.claude/settings.local.json`)은 "반복 확인 없이 실행 가능한 기술적 승인"을 정하고, **알림 원칙**은 "행동 규범"을 정한다. 어떤 명령이 허용 목록에 있다고 해서 알림 원칙이 면제되지 않는다.

---


<!-- 프로젝트 전용(PUBG). build_bibles.sh가 generic/CORE와 역할 파일 사이에 끼워 넣는다. -->

## 8부. 프로젝트 정보

### 개요
배틀그라운드 보조 웹서비스. 화면공유 하나로 전체맵 자기장 분석 + 프로 위치 추천 + 자기장 알림 제공.

### 모노레포 구조
```
Infra-gitops/
├── apps/
│   ├── frontend/                 # Next.js 14 (App Router)
│   └── services/
│       ├── capture/              # 화면캡처 + 이미지분석 (NestJS)
│       ├── location/             # 프로 위치 추천 (NestJS)
│       └── alert/                # 자기장 타이머 + 알림 (NestJS)
├── packages/shared/              # 공통 타입·DTO
├── docs/{projects,areas,resources,archives}/
├── clusters/                     # K8s 매니페스트
├── applicationsets/              # ArgoCD AppSet
├── docker-compose.yml
└── pnpm-workspace.yaml
```

### 기술 스택
| 분류 | 기술 | 이유 |
|------|------|------|
| 언어 | TypeScript 전체 | Claude Code 단일 컨텍스트 |
| 프론트 | Next.js 14 (App Router) | SSR + 실시간 |
| 지도 | Leaflet.js (CRS.Simple) | 커스텀 오버레이, 휠 줌 |
| 화면인식 | Screen Capture API + Canvas | 브라우저 네이티브 |
| OCR | Tesseract.js (Web Worker) | 숫자+콜론 전용 |
| 백엔드 | NestJS | TS + WebSocket 기본 |
| 실시간 | WebSocket (Socket.io) | 프레임 분석 결과 |
| 이미지 처리 | Sharp | 서버사이드 분석 |
| DB | PostgreSQL + Prisma | 위치/세션 |
| 모노레포 | pnpm workspace | 패키지 공유 |
| AI (Phase 6) | Python FastAPI | 프로 위치 학습 |

### 서비스별 역할
- **frontend (Next.js 14)**: 맵 선택, 화면공유(`getDisplayMedia`), Leaflet 지도 + 자기장 오버레이 + 휠 줌, 프로 위치 마커(S/A/B 등급·중심거리순), 알림 설정(30/20/10초), Web Workers 캡처/OCR.
- **capture-service (NestJS, :3001)**: WebSocket으로 프레임 수신, 전체맵 열림 감지(청록 3%↑), 자기장 원 추출(흰 픽셀 → 원 피팅 → 0~1 정규화), 결과 전송.
- **location-service (NestJS, :3002)**: 자기장 원(x,y,r) → 원 안 프로 위치 필터 + 거리순 정렬 → S/A/B 등급 마커.
- **alert-service (NestJS, :3003)**: 미니맵 타이머 크롭 → Tesseract OCR, 빨간 느낌표 픽셀로 자기장 상태 구분(있음=30/20/10초 알림, 없음=대기), Web Notifications 발송.
- **shared**: `CircleData`(x,y,r 0~1), `MapType`, `LocationData`, `TimerState`, `SocketEvents`.

### 인프라
- K8s: Master 172.20.0.10 / Worker-1 .11 / Worker-2 .12.
- Harbor(레지스트리), ArgoCD(GitOps, Sync-Wave 50), Envoy Gateway(172.20.0.100), Vault + ESO(시크릿), Longhorn(PVC), Cilium(CNI).

### 좌표계 주의사항
- `CircleData.y`, `LocationData.coordY` → 이미지 좌표계(위 0 → 아래 1).
- Leaflet `CRS.Simple` → lat 위로 증가(아래 0 → 위 1).
- Marker는 `[1 - y, x]`로 변환한다. (SVGOverlay는 SVG 좌표계가 이미지와 같으므로 그대로.)

<!-- Claude 협업 역할 — 협업 모드(Claude+Codex)에서 CORE 뒤에 붙는다. -->

## 9부. 에이전트 역할 (협업 모드)

### Claude = 구현자
- Claude는 계획 작성, 구현, 수정 반영을 담당한다.
- Codex 리뷰 전 구현을 시작하지 않는다.
- Codex 피드백을 받으면 항목별 반영 여부를 먼저 답한다.
- 수정 후 테스트 결과와 변경 파일 목록을 남긴다.

### 사용자 역할
- 요구사항, 애매한 결정, 최종 승인, PR 머지 여부를 결정한다.
- Claude와 Codex 의견이 충돌하면 사용자가 최종 판정한다.

---

## 10부. 상호검증 파이프라인

1. Claude 계획 작성 → Codex가 요구사항·범위·테스트가능성·이슈단위 리뷰.
2. Claude가 리뷰 반영 → `claude-response.md`에 항목별 반영 여부.
3. Claude 구현 → 테스트 실행 + 변경 파일 목록.
4. Codex 코드 리뷰 → Claude는 Blocking 항목을 모두 수정.
5. Codex 테스트·회귀 검증 → 실패 0 + 커버리지 충족.
6. 사용자 승인 후 PR/머지 → base가 `develop`인지 확인.

루프는 `.local/review-pipeline/review_loop.sh`(결정론적 오케스트레이터)가 소유한다. **에이전트가 서로를 직접 호출하지 않는다.** 무한루프 5겹 차단: ①하드캡 ②BLOCKER 게이팅 ③정체 감지 ④VERDICT 토큰 ⑤이견→사람.

### 코드 검수는 반드시 Codex와 함께
코드를 작성·수정한 경우는 물론, **기존 코드를 읽고 검수·감사·진단하는 경우에도 반드시 Codex와 함께 진행한다.** Claude 단독으로 "코드 이상 없음" 또는 "문제 있음"을 최종 결론내지 않는다. 모든 코드 검수는 `review_loop.sh`를 거치거나 Codex 리뷰 파일을 받아 항목별로 반영한다. (단독 모드에서는 CORE 5부 체크리스트 자가검수 패스로 대체한다.)

### 검수 대상 = 작업 + 이유
Claude가 한 **모든 작업**(계획·코드·문서)이 검수 대상이다. Claude는 "무엇을 했나"뿐 아니라 **"왜 그렇게 했나"(근거)를 `context-notes.md`에 남겨** Codex가 이유까지 검수하게 한다. 근거가 빈약하면 Codex가 지적하고, Claude는 보강하거나 반박한다.

### 양방향 피드백 (중요)
검수는 일방향이 아니다.
- Codex 피드백 중 **틀렸거나 과한 항목은 반박한다** (`*-claude-to-codex-feedback.md`).
- **자기가 작성한 것은 자기가 검수하지 않는다.** Claude가 쓴 것은 Codex가, Codex가 쓴 것은 Claude가 검수한다.
- 이견은 무한 반복하지 않는다. 같은 항목 2회 반박 시 사용자 판정으로 올린다.

### 지침 파일 상호검증
- `CORE`/역할 파일이 변경되면 Claude·Codex가 함께 리뷰한다 (역할·권한·산출물·형식 충돌 여부).
- 변경은 항상 `generic/CORE.md`(방법론)·`project/<name>.md`(프로젝트 정보)·역할 파일을 고치고 `build_bibles.sh`로 재생성한다. 생성된 `CLAUDE.md`/`AGENTS.md`를 직접 수정하지 않는다.

### Claude 응답 형식
```markdown
## Response To Blocking
- [항목] 반영함 또는 반영하지 않음. 이유.
## Response To Should Fix
- [항목] 반영함 또는 반영하지 않음. 이유.
## Changes
- 변경 파일. 변경 요약.
## Verification
- 실행한 테스트. 결과.
## Instruction Compliance
- CORE 준수 여부. Codex 피드백 준수 여부. 위반과 조치.
```
