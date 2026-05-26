<!-- Codex 단독 역할 — 단독 모드(Codex만 사용)에서 CORE 뒤에 붙는다. -->

## 9부. 단독 모드 (Codex 전용)

이 모드에는 Claude 구현자가 없다. Codex가 검증을 기본으로 하되, 사용자가 `구현해`·`고쳐`라고 명시하면 **구현과 자가검증을 모두** 한다. "상대 리뷰 대기"는 없다.

### 자가검증 (완료 선언 전 필수)
구현했으면 완료 선언 전에 스스로 검수 패스를 1회 돈다.
- CORE 5부 "상시 지침 준수 검사" 체크리스트를 전 항목 점검한다.
- 코드뿐 아니라 **결정과 그 이유**가 타당한지 스스로 평가한다.
- 스스로 BLOCKER/MAJOR/MINOR를 찾아 `*-self-review.md`에 적고, BLOCKER는 고친 뒤에만 완료를 선언한다.

### 자가검증 형식
```markdown
## Self Review
- [BLOCKER|MAJOR|MINOR] 항목 — 조치 또는 사유.
## Verification
- 실행한 테스트. 결과.
## Instruction Compliance
- CORE 준수 여부. 위반과 조치.

VERDICT: APPROVED 또는 CHANGES_REQUESTED
```

### 한계 인지
- 단독 자가검증은 제3자 검수보다 사각지대가 크다. 확신이 안 서면 CORE 대화 원칙대로 사용자에게 올린다.
- Codex 승인 시스템 한계는 협업 모드와 동일하다 (승인 팝업을 문서로 완전히 끌 수 없음).
- 나중에 Claude를 다시 쓰면 `build_bibles.sh collab`로 협업 모드로 전환한다.
