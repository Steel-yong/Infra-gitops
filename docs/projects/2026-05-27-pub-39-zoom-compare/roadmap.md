# PUB-39 줌 로컬라이제이션 — 마스터 로드맵 (PoC 비교 → 제품 출시, 순차)

루프 구동용. **위에서부터 1개씩** 실행→검증→즉시 커밋→체크. 막히면 추측 말고 context-notes에 남기고 다음으로(단 게이트는 멈춤).
태그: `[자율]`=루프 혼자 가능 · `[게이트]`=사람 필요, 도달 시 멈추고 보고.

---

## PHASE A — 방법 2·1·5 PoC 비교 (전부 [자율])
> 상세 검증 기준은 `checklist.md` 참조. 아래는 순서.
- [x] A1. 검출 모듈 정리: 흰 안전구역 원 + 파란 블루존 벽 원 안정 검출(파란 헛원 제거). → 검증: 5프레임 오버레이 육안 OK + inlier 기준. **(완료: 흰 4/5 정확, 파란 헛원 제거, 파란 벽 색분리 불가 실측. context-notes A1.)**
- [x] A2. `ground_truth.json`: 프레임별 흰 원 중심 도시 → erangel-cities 좌표(정답). → 검증: 프레임당 (도시,gx,gy). **(완료(라운드2 재작성): 검출기와 독립, candidateRegion+visualEvidence+detectorObservation 분리, 줌↔전체맵 matchTable 잠금(1페·2페 high/med, 2v·4v unmatched 분리). 절대err→상대/sanity 메트릭. Codex CHANGES_REQUESTED 반영.)**
- [~] A3. known 앵커 추출: 전체맵(1페·2페)에서 현재 원 abs / P_world. → 검증: 앵커 좌표 출력. **(🚪 GATE — 기하 스펙은 Codex 라운드3로 잠금(Opt1 control point + residual gate + leave-one-out sensitivity, codex-consult.md). 단 control point 정밀 픽셀좌표를 에이전트가 눈으로 못 맞춤(±2~4% ≫ 요구 ±0.3%) → 데이터/도구 보강 필요로 멈춤. overnight-progress.md 옵션 참조.)**
- [ ] A4. 방법2(원 ruler) PoC → compare_result.json m2. → 검증: 프레임별 err·sanity.
- [ ] A5. 방법1(플레이어 앵커) PoC → m1. → 검증: 아이콘 가용성 + err.
- [ ] A6. 방법5(factor graph 융합) PoC → m5. → 검증: 단일앵커 실패시도 결과 + err.
- [ ] A7. `poc_compare.py` 집계표(err·가용성·sanity 평균) + 승자 선정. → 검증: 표 + 근거.
- [ ] A8. HTML 비교 보고서(`docs/resources/mockups/2026-05-27-report-zoom-compare-result.html`). → 검증: 자급자족·다크·한국어·오버레이 포함.
- [ ] A9. Codex 검수(비교 방법론·결론): `codex exec` read-only → 결과 반영. → 검증: codex 출력 파일.

### 🚪 GATE-1 [게이트] — 승자 신뢰도 판정
- **메트릭(Codex 라운드2 Q4 반영, 절대 err 폐기 — 정답이 약한 candidateRegion이라 절대오차는 정답노이즈 측정).** 측정 항목:
  - 가용성: 각 방법이 target circle을 산출했는가.
  - identity sanity: current/next를 뒤바꾸지 않았는가.
  - 후보군 포함률: 산출 중심이 ground_truth candidateRegion(또는 같은 지형 권역)에 드는가.
  - 상대 일관성: 같은 페이즈쌍(2페확대↔2페확대2)에서 중심이동·반지름 관계가 일관적인가.
  - 기각 품질: 4v 같은 불확실/작은 링을 틀린 큰 원으로 자신있게 내지 않는가.
- 승자가 위에서 명확히 우세 + matched 프레임 위주로 견고하면 → PHASE B.
- 애매하거나 셋 다 부진/정답 부족이면 → **멈추고 보고**. 모래 위 TS 빌드 금지.

---

## PHASE B — 승자 TS 제품화 (GATE-1 통과 시 [자율])
- [ ] B1. worktree 생성: `git worktree add ../feature-pub39-zoom-vN feature/PUB-39-zoom-vN`. → 검증: worktree list.
- [ ] B2. 제품화 plan/checklist/context-notes 작성. → 검증: 3종 파일 존재.
- [ ] B3. 순수 변환 모듈(`zone-geometry.ts` 재사용 + 승자 로직 신규 함수, opencv 무관) + 유닛테스트. → 검증: vitest 통과, 엣지 케이스.
- [ ] B4. `capture.service`/`sift-zone.service` 배선: 줌 프레임 → 승자 파이프라인 → 절대 자기장. → 검증: 기존 테스트 회귀 0 + 신규 테스트.
- [ ] B5. `packages/shared` 타입 + WebSocket 이벤트(줌 추적 결과). → 검증: 빌드(tsc) 통과.
- [ ] B6. 프론트 Leaflet 오버레이: 줌 중 추적 자기장 표시(신뢰도 낮으면 보류 상태). → 검증: 컴포넌트 렌더/유닛.
- [ ] B7. 커버리지: `pnpm test:coverage` 95%↑. → 검증: 커버리지 리포트.
- [ ] B8. Codex 코드 리뷰: `bash .local/review-pipeline/review_loop.sh <산출물>` → BLOCKER 0까지. → 검증: ledger BLOCKER 0.

### 🚪 GATE-2 [게이트] — 빌드·테스트·리뷰
- 빌드/유닛/커버리지/Codex BLOCKER 0 모두 통과면 → PHASE C 대기 보고.
- 실패 잔존 시 → **멈추고 보고**(잔여 실패 목록).

---

## PHASE C — 라이브 검증·머지 (전부 [게이트], 사람 필요)
### 🚪 GATE-3 — 라이브 검증
- 사용자가 화면공유로 실제 줌에서 추적 동작 확인(자율 불가). 라이브 체크리스트 제공만 자율.
- [ ] C1. 라이브 검증 체크리스트 작성(무엇을 어떻게 볼지). → 검증: 항목별 기대결과.
### 🚪 GATE-4 — PR·머지
- [ ] C2. 사용자 승인 후 PR(base `develop`) 생성. → 검증: PR URL.
- [ ] C3. 사용자 머지 승인 → develop 머지 → worktree 삭제. → 검증: 머지 커밋, worktree 정리.

---

## PHASE D — 후속/보류 재평가 (선택 [게이트] 사용자 결정)
- [ ] D1. 측정 게이트 데이터로 방법1 아이콘 가시율 등 재확인.
- [ ] D2. factor graph 정식 통합 레이어(방법5)로 다관측 융합.
- [ ] D3. ML 보류 재평가(deterministic 앵커로 줌 crop auto-label 쌓인 뒤).

---

## 자율 루프 안전 규칙 (전 구간)
- develop/worktree에만 커밋. **main 금지·push 금지·삭제 금지·외부 다운로드 금지.**
- 변경마다 즉시 커밋(한 문장 설명 가능 단위).
- 게이트 도달 = 멈추고 보고. 게이트 너머로 자율 진행 금지.
- 막힘(애매한 정답·검출 실패·승자 불명확) = 노트 남기고 GATE-1처럼 멈춤 판단.
- 코드 작성/검수는 반드시 Codex 동반(review_loop.sh) 또는 CORE 5부 자가검수 패스.
