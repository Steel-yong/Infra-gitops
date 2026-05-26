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
- 변경은 항상 `00-CORE.md` 또는 역할 파일을 고치고 `build_bibles.sh`로 재생성한다. 생성된 `CLAUDE.md`/`AGENTS.md`를 직접 수정하지 않는다.

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
