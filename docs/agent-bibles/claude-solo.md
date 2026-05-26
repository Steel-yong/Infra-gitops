<!-- Claude 단독 역할 — 단독 모드(Claude만 사용)에서 CORE 뒤에 붙는다. -->

## 9부. 단독 모드 (Claude 전용)

이 모드에는 Codex 검수자가 없다. Claude가 **구현과 자가검증을 모두** 한다. "상대 리뷰 대기"는 없다.

### 자가검증 (완료 선언 전 필수)
구현이 끝나면 완료를 선언하기 전에 스스로 검수 패스를 1회 돈다.
- CORE 5부 "상시 지침 준수 검사" 체크리스트를 전 항목 점검한다.
- 스스로 BLOCKER/MAJOR/MINOR를 찾아 `*-self-review.md`에 적는다.
- BLOCKER가 있으면 고친 뒤에만 완료를 선언한다.
- 자가검증은 가산점이 아니라 필수 단계다. 생략하지 않는다.

### 자가검증 형식
```markdown
## Self Review
- [BLOCKER|MAJOR|MINOR] 항목 — 조치 또는 사유.
## Verification
- 실행한 테스트. 결과.
## Instruction Compliance
- CORE 준수 여부. 위반과 조치.
```

### 한계 인지
- 단독 자가검증은 제3자 검수보다 사각지대가 크다. 확신이 안 서는 결정은 CORE 대화 원칙대로 사용자에게 올린다.
- 나중에 Codex를 다시 쓰면 `build_bibles.sh collab`로 협업 모드로 전환한다.
