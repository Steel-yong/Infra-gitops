# Claude 검증 응답 — AGENTS.md/CLAUDE.md 상호검증

> 대상: Codex 검수(`.local/review-pipeline/.review/firsttest_codex.txt`) + `docs/projects/2026-05-26-agent-md-mutual-review.md`의 6개 기준.
> 방식: 파이프라인(`review_loop.sh`)의 첫 실전 검증. Codex가 read-only 검수 → Claude가 증거 기반 응답. 자동수정은 하지 않음(중요 지침 파일이라 사용자 승인 후 적용).

## Response To Blocking

- **[CLAUDE.md 대량 삭제·보존규칙 위반] 반영 필요(인정).** `git diff --stat CLAUDE.md` = 168 insertions / **265 deletions**. 목차·0부 등 원문이 통째로 재작성됐고 AGENTS.md §4가 요구하는 삭제 원문요약·이유·대체위치·승인여부가 남지 않았다. 단 이 편집은 Codex가 CLAUDE.md를 "구현자 바이블로 정리"하며 한 것(미커밋 M)이라 **사용자 승인 사안**. → 보존 노트 추가 또는 원복 중 택1.
- **[`any` 사용] 반영함(내 위반 확정).** `apps/services/capture/src/capture/sift-zone.service.ts:16-17`에 `/* eslint-disable @typescript-eslint/no-explicit-any */` + `type CV = any`. CLAUDE.md/AGENTS.md `any` 금지 직접 위반. 사유는 `@techstark/opencv-js`(WASM)에 타입 정의가 없어서지만 규칙 위반은 맞다. → 사용 멤버만 담은 최소 인터페이스 or `unknown`+지역 캐스트로 교체(PUB-39 후속).
- **[PUB-39 산출물 3종 누락] 반영함(확정).** `ls docs/projects | grep pub-39` = 0건. PUB-36·37은 plan/checklist/context-notes 3종 존재. PUB-39는 "바로 구현하라"는 사용자 지시로 산출물 단계를 건너뛴 경위가 있으나 규칙 위반은 맞다. → checklist.md·context-notes.md 작성.

## Response To Should Fix

- **[테스트·커버리지 미보고, PUB-39 미완결] 인정.** PUB-39 SIFT-zone v1은 라이브 검증 전 상태로 develop에 올라갔고 유닛 테스트가 없다. 커버리지 95% 규칙 미충족.
- **[세션 프로토콜 Linear 예외 비대칭] 인정.** AGENTS.md §0(line 29)엔 "Linear 조회 불가 시 명시" 규칙이 있으나 CLAUDE.md 0부엔 없다. → CLAUDE.md에 동일 예외 추가 권장.
- **[settings.local.json 위험명령 누적] 부분 인정.** `rm -rf /tmp/pub34/*`, `yt-dlp` 외부 다운로드 등이 누적. "반복 허가 안 물음"과 "destructive/외부전송은 먼저 알림" 경계를 문서·설정 양쪽에서 분리 필요.
- **[classify 수정 .local 미추적] 인정.** `.local/pub34-yolo-backup/full_pipeline.py` 수정은 gitignore 영역이라 Linear·커밋·테스트와 미연결. → PUB-38 이슈에 연결하고 추적 가능한 위치(워크트리 video-analyzer) 동기화.

## Review Result

- **AGENTS.md**: 구조·역할·형식 모두 양호. CLAUDE.md와 역할 분리(Claude=구현, Codex=검증) 정합. §3 상시 준수 체크리스트가 CLAUDE.md 규칙을 빠짐없이 반영.
- **CLAUDE.md**: 내용은 충실(0~5부)하나 265줄 재작성이 §4 보존규칙 미준수. 세션 프로토콜에 Linear 예외 누락.
- **두 문서 충돌**: 핵심 역할·산출물·금지규칙은 일치. 비대칭은 ① Linear 조회불가 예외(AGENTS만 있음) 하나뿐.

## Requested Changes

1. CLAUDE.md 265줄 삭제 건 — 보존 노트 추가 or 원복 (사용자 승인).
2. `sift-zone.service.ts`의 `any` 제거.
3. PUB-39 checklist.md·context-notes.md 작성.
4. CLAUDE.md에 "Linear 조회 불가 명시" 예외 추가.

## Instruction Compliance

- **CLAUDE.md 준수**: 부분 위반 — `any`(#2), PUB-39 산출물 누락(#3), 테스트 미보고.
- **Codex 피드백 준수**: 본 응답으로 항목별 반영 여부 명시. Blocking 3건 중 #2·#3은 Claude가 수정 가능, #1은 사용자 승인 대기.
