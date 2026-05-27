# 🌙 밤샘 자율 작업 마스터 로드맵 (2026-05-27)

> 이 문서 하나만 읽고 밤새 자율로 진행한다(새 세션은 이전 대화 기억 없음).
> 모드: `claude --dangerously-skip-permissions` (권한 무제한) → **안전은 아래 하드 금지선으로 자기검열.**
> 루프: `/loop` 자율. 다음 미완료 작업 1개를 **[플랜→이슈(docs)→구현→검증→즉시 커밋→체크]** 하고 반복.

---

## ⛔ 하드 금지선 (권한이 풀려도 절대 금지 — 위반 = 사고)
- **git push 금지. main 머지/체크아웃 금지. force push·남의 브랜치 삭제 금지.**
- **클러스터 변경 절대 금지**: `kubectl`/`helm`/`argocd`/`k9s`의 apply·delete·patch·scale·rollout, `docker push`, 매니페스트 적용 — 전부 금지(여긴 k8s-bastion).
- **삭제 금지**: `rm -rf`, 대량 삭제, 내가 안 만든 파일 덮어쓰기(읽기 전), DB drop/migrate reset.
- **외부 금지**: 외부 다운로드·설치(필요하면 멈추고 보고), 시크릿/`.env`/vault 접근, 외부 전송.
- **인프라 디렉토리 수정 금지**: `clusters/`, `applicationsets/`, `*.yaml` 매니페스트, `.github/workflows/`.
- 애매하면 = **하지 말고 멈추고 노트.** 파괴적일 가능성 있으면 무조건 중단.

## ✅ 허용 범위
- `.local/` 파이썬 PoC, `docs/`, `apps/`·`packages/` 앱 코드(worktree 안), 테스트.
- 커밋: develop 또는 feature/* worktree. 변경마다 즉시 1커밋(한 문장 설명 가능 단위).
- 실행: `python3`, `pnpm`/`vitest` 테스트·빌드, `codex exec`(read-only 검수), git add/commit/status/log/diff.
- 코드 작성·검수는 Codex 동반 또는 CORE 5부 자가검수.

## 🔧 Codex 검수 호출법 (WSL — review_loop.sh의 /c/ 경로는 WSL서 깨짐, 아래로)
```bash
CODEX=$(ls -t /mnt/c/Users/USER/AppData/Local/OpenAI/Codex/bin/*/codex.exe | head -1)
cat <프롬프트.md> | "$CODEX" exec --cd 'D:\infra project\Infra-gitops' -s read-only --skip-git-repo-check - > <출력.txt> 2>&1
```
- stdin으로 프롬프트 파이프(positional 인자로 주면 stdin 대기로 멈춤). stdout+stderr 둘 다 파일로(`2>&1`, 내용은 stderr로 나옴). read-only.
- 출력 파일에서 codex의 한국어 답변부만 읽으면 됨(앞부분은 codex의 세션 점검 로그).

## 🚪 사람이 필요한 게이트 (도달 시 멈추고 보고)
- 라이브 검증(화면공유), PR 생성, develop 머지, 인프라 변경 — 전부 사람. 자율로 넘지 말 것.
- 막힘(승자 불명확·검출 실패·애매한 정답) = 노트 남기고 다음 작업으로(또는 멈춤 판단).

## 작업당 공통 절차 (CORE 준수)
각 작업 시작 = ① 관련 파일 읽기 → ② 없으면 `docs/projects/<작업>/`에 plan·checklist·context-notes 생성(=이슈) → ③ worktree 필요하면 `git worktree add` → ④ 구현↔테스트 → ⑤ 논리단위 커밋 → ⑥ 검증·검수.
Linear 조회 불가 → **docs/projects 폴더가 이슈 역할.**

---

# 순차 작업 (위에서부터)

## ▶ 작업 1 — PUB-39 줌 자기장 로컬라이제이션 (+ 줌 검출 정밀화 포함)
**스펙: `docs/projects/2026-05-27-pub-39-zoom-compare/roadmap.md` + `checklist.md` 따른다.**
- Phase A: 방법 2·1·5 PoC 비교 → 정답(도시라벨) → 점수표 → HTML 보고서 → Codex 검수.
- **줌 검출 정밀화(이 작업에 포함)**: 둘째 흰 원(다음 존) 분리 검출, 흰 픽셀 오염 제거, 단색 지형(물·평지) 오검출 대응. → Phase A의 "검출 모듈 정리"에서 같이.
- 🚪 GATE-1: 승자 신뢰도 충분하면 Phase B(승자 TS 제품화, worktree). 애매하면 멈추고 보고.
- 🚪 GATE-3/4(라이브·PR·머지)에서 멈춤.

## ▶ 작업 2 — capture-service 스케일링 ① busy 가드 (독립·안전·빠른 승)
**근거: `docs/areas/capture-scaling.md` (4안 중 ①만 이번에 구현, ②③④는 플랜만).**
- 이슈 생성: `docs/projects/2026-05-27-pub-XX-capture-busy-guard/` plan·checklist·context-notes.
- worktree: `git worktree add ../feature-capture-busyguard feature/capture-busy-guard`.
- 구현: capture.gateway/service에서 **처리 중이면 들어온 프레임 버리고 최신 1장만 처리**(skip-to-latest). 1인 부하를 "처리 1회당 1장"으로 캡. busy 플래그 + 최신 프레임 보관.
  - 외과적 변경. 기존 검출 로직 건드리지 않음. → 검증: 유닛테스트(연속 프레임 중 처리중엔 최신만), 기존 테스트 회귀 0, 커버리지 유지.
- ②전송률↓ ③클라사이드 검출 ④최적화·수평확장 = **구현 말고 플랜 문서만**(아키텍처 큼·리스크). checklist에 설계 기록.
- Codex 코드 리뷰(review_loop.sh) → BLOCKER 0.
- 🚪 PR·머지는 사람. 멈추고 보고.

## ▶ 작업 3 — PUB-40 유저 실시간 위치 추적 (줌 토대 공유, 작업1 이후)
**기존 스펙: `docs/projects/2026-05-26-pub-40-user-position-*` 갱신해 사용.**
- 작업1(줌)에서 만든 앵커·미니맵 검출 토대를 공유한다. 줌 결론 난 뒤 진행.
- 우선 PoC(미니맵 크롭 → 프레임간 오도메트리 타당성, `.local`)부터 → 가능성 데이터 확보.
- 이슈/플랜 갱신 → PoC → (가능하면) detectPlayer 순수모듈 + 테스트. 프론트 PlayerMarker는 이미 토대 있음.
- 🚪 라이브 검증은 사람. 무리하면 PoC+플랜까지만 하고 멈춰 보고.

---

## 종료·보고
- 작업1 Phase A(비교+HTML 보고서)는 무조건 완수 목표. 그 뒤 가능한 만큼 2→3 진행.
- 게이트/막힘 도달 시: `docs/projects/2026-05-27-overnight-progress.md`에 "한 일 / 막힌 곳 / 아침에 사람이 할 것" 적고 보고.
- 아침에 사용자가 `tmux attach -t pubg`로 확인. git log로 밤새 커밋 추적.
