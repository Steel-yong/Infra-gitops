# PUB-39 줌 비교 — Codex 상시 상담 로그

사용자 지시(2026-05-28): 모든 주요 단계(검출 설계·방법 선택·scale/기하·비교 결론·구현)마다 Codex에 ①현황+선택지 ②피드백 ③검증 ④항목별 반영/반박. 단독 결론 금지. 상담 기록은 이 파일에.
호출법: `cat 프롬프트.md | "$CODEX" exec --cd 'D:\infra project\Infra-gitops' -s read-only --skip-git-repo-check -` (WSL, read-only).

---

## 라운드 1 — A1 검출 모듈 + A2 접근 (2026-05-28)
- 프롬프트: `.local/zoom-a1-codex-prompt.md` · Codex 원응답: `.local/zoom-a1-codex-out.txt`.
- 검수 대상: 검출기 설계(흰=흰픽셀 RANSAC+커버리지, 파란=lit/dim 윤곽), "색분리 불가" 결론, A2 정답 접근.

### Codex BLOCKER → 내 반영
- **[Q4] A2 정답이 검출기 산출물에 의존하면 안 됨**(검출 원 중심 근처 도시를 정답화 = 검출 오류 흡수, 4v는 wrong target 정답화 위험). → **반영.** A2는 검출 원 중심을 쓰지 않고, **프레임에 보이는 도시 라벨을 독립적으로(비전) 읽어** 정답 구성. 검출 결과는 정답이 아니라 "방법들이 맞혀야 할 대상"으로만 비교 단계에서 사용.
- **[Q5] target identity 먼저 고정**(각 프레임 흰 원이 현재/다음/이전큰/작은후반 중 무엇인지 독립 근거로). 안 그러면 A4~A7 비교가 모래 위. → **반영.** A2에 프레임별 `targetCircle` 식별·근거를 명시. identity 불명확 프레임은 low-confidence로 분리.
- **[Q2] "색분리 불가"를 4v 2샘플로 절대결론화 말 것.** "현 샘플에서 단순 BGR 파랑강도 마스크가 불충분"이 방어가능. → **반영.** context-notes A1·코드 주석 문구를 한정 표현으로 수정. 다중 프레임 색분포 추가 표본은 후속 과제로 기록.

### Codex SHOULD-FIX → 내 반영/보류
- **[Q1] RANSAC seed 없음(재현성).** → **반영(즉시).** `np.random.default_rng(seed)` 고정.
- **[Q2] lit/dim 윤곽법 해안선·바다·ROI경계 오인 위험 → wall에 sanity gate**(흰 원 포함/동심 등). → **반영.** wall 후보는 "흰 원이 존재하고 wall이 그 흰 원을 포함(동심·parent)"일 때만 채택. 아니면 기각.
- **[Q3] 4v 작은 링: min_inl을 반지름 비례로(`inl≥k·2πr·visible`).** → **부분 반영.** min_inl 반지름 비례화는 합리적이라 검토하되, 4v 작은 링은 OPINION Q3대로 정답에 `small-ring missed`로 명시하고 비교에서 분리(과투자 회피). 작은 링 전용 second-pass는 보류.
- **[Q4] best+second보다 `targetCircle/visibleLandmarks/confidence/excludedReason` 스키마.** → **반영.** ground_truth.json 스키마에 반영.
- **[Q1] residual 분포·arc 길이·bin 밀도상한·gradient 일치 추가 게이트** / **[Q1] Kasa→Taubin/Pratt** / **[Q2] 벽 국소대비(Scharr/edge tangent/normal 밝기변화) 단서** → **보류(기록).** PoC 단계는 현 게이트로 가짜 제거가 실측상 충분. 제품화(PHASE B) 또는 lit/dim 윤곽이 부진할 때 도입. 반박 아님, 우선순위 보류.

### Codex OPINION → 수용
- 파란 벽은 "색 검출"이 아니라 "원형 경계 검출" 방향이 맞다(단 lit/dim 단일 컴포넌트는 보조신호). 수용.
- 도시 라벨 정답은 "정답"보다 "약한 앵커" — confidence 등급 필수. 수용(스키마에 confidence).
- 우선순위: A2 정답 독립성 → target identity → 4v 정책 → wall sanity → 그다음 A4/5/6. **수용, 이 순서로 진행.**

### 검증(Codex)
- read-only로 지정 파일 직접 읽음, 테스트 미실행. 4v(inl361,cov.56)는 신뢰 4개 묶음에서 분리 타당 동의.

### 조치 요약(이 라운드 결과)
1. 검출기: RANSAC seed 고정 + wall 포함 sanity gate 추가 → 재실행.
2. context-notes A1 색결론 문구 한정.
3. A2: 검출기와 독립적인 ground_truth.json(도시 라벨 비전 식별 + target identity + confidence + excludedReason).
4. 위 산출물 다시 Codex 검증(라운드 2).
