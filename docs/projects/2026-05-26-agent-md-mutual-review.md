# AGENTS.md와 CLAUDE.md 상호검증 요청

> 목적: Claude 구현자와 Codex 검증자 역할 분리를 문서화하고, 두 에이전트가 지침 준수 여부를 상시 검증하도록 한다.

## Codex 변경 요약.

- `AGENTS.md`를 Codex 검증자 바이블로 정리했다.
- `CLAUDE.md`를 Claude 구현자 바이블로 정리했다.
- Claude는 구현자, Codex는 검증자라는 기본 역할을 분리했다.
- 계획 리뷰, 코드 리뷰, 테스트 검증, 지침 준수 검사를 상호검증 파이프라인에 넣었다.
- `AGENTS.md`와 `CLAUDE.md` 자체가 변경될 때도 상호검증 대상으로 명시했다.
- Claude 권한 설정에 허용된 도구는 반복 허가를 묻지 않는다는 운영 원칙을 `CLAUDE.md`에 넣었다.
- Codex 권한은 Claude 설정과 별개라서 승인 팝업을 문서만으로 완전히 끌 수 없다는 한계를 `AGENTS.md`에 명시했다.
- 지침 문서 정돈 시 항목을 임의 삭제하지 못하게 보존 규칙을 추가했다.

## Claude 검증 요청.

아래 기준으로 검증한다.

1. `CLAUDE.md`가 Claude의 실제 작업 방식과 맞는가?
2. `AGENTS.md`가 Codex의 실제 검증 방식과 충돌하지 않는가?
3. 두 파일 모두 계획, 구현, 리뷰, 테스트, 지침 준수 검사를 빠뜨리지 않는가?
4. Claude 권한 운영 규칙이 `.claude/settings.local.json`의 허용 목록과 맞는가?
5. 사용자에게 매번 묻지 않아도 되는 작업과 반드시 물어야 하는 작업의 경계가 명확한가?
6. 지침 문서 항목 삭제 또는 통합 시 이유와 대체 위치를 남기도록 충분히 강제하는가?

## Claude 응답 형식.

```markdown
## Response To Blocking
- [항목] 반영함 또는 반영하지 않음. 이유.

## Response To Should Fix
- [항목] 반영함 또는 반영하지 않음. 이유.

## Review Result
- AGENTS.md 검증 결과.
- CLAUDE.md 검증 결과.
- 두 문서 간 충돌 여부.

## Requested Changes
- 수정이 필요한 항목.

## Instruction Compliance
- CLAUDE.md 준수 여부.
- Codex 피드백 준수 여부.
```

## Codex 자체검증.

## Blocking
- 없음.

## Should Fix
- Claude를 Codex가 직접 호출할 수 없으므로, 실제 Claude 검증은 사용자가 Claude 세션에서 이 문서를 읽도록 해야 한다.

## Questions
- 없음.

## Verification
- `AGENTS.md`와 `CLAUDE.md`에 상호검증 규칙이 들어갔는지 확인했다.
- `docs/projects/2026-05-26-agent-md-mutual-review.md`에 Claude 검증 요청을 남겼다.

## Instruction Compliance
- Codex는 직접 구현자가 아니라 문서 검증자 역할로 작업했다.
- 이번 작업은 지침 문서 정리라 테스트 실행 대상은 없다.
