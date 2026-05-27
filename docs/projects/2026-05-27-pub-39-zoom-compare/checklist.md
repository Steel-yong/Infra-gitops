# PUB-39 줌 비교 — 체크리스트 (자동 루프 구동용)

루프 1회 = 다음 미완료 항목 1개 실행 → 검증 → 즉시 커밋 → 체크. 항목마다 검증 방법 명시.

## 0. 기반
- [x] 프레임/도시표/PoC 패턴 확인.
- [x] 방법2 1차 PoC(`poc_m2_ruler.py`) + 색 오버레이(`poc_overlay_circles.py`).
- [x] 검출 모듈 정리: 흰 안전구역 원 + 파란 블루존 벽 원 안정 검출. → 검증: 5개 줌 프레임 오버레이가 육안상 맞고 inlier≥기준. **(완료: 흰 원 4/5 정확 inl2472~3547, 파란 헛원 제거. 파란 벽=색분리 불가 실측→구조윤곽법. 4v 작은 링 미검출=후속. `.local/poc_detect_circles.py`, det_*.png, context-notes A1 참조.)**

## 1. 정답(ground truth)
- [x] 각 테스트 프레임의 흰 원 중심 도시 식별 → `erangel-cities.ts` 좌표로 `ground_truth.json` 작성. → 검증: 프레임마다 (도시명, gx, gy) 한 줄. 애매하면 best+second 기록. **(완료: `.local/pub39-shots/ground_truth.json`. Codex 라운드2 반영 — candidateRegion(약한앵커)+matchTable(줌↔전체맵)+detector분리. 1페확대↔1페, 2페확대·2페확대2↔2페(1) 매칭. 2v·4v는 전체맵 매칭없어 분리. codex-consult.md 라운드2.)**
- [ ] 전체맵(1페·2페)에서 known 앵커(현재 원 abs / P_world) 추출해 줌 프레임에 매칭(같은 페이즈). → 검증: 앵커 abs 좌표 출력.

## 2. 방법2 — 원 ruler
- [ ] `poc_m2_ruler.py` 완성: known 원(파란 벽 or 앵커) + 흰 원 → scale·offset·절대중심. → 검증: 프레임별 예측중심 + 정답거리 출력, parent sanity.
- [ ] 결과를 `compare_result.json`의 m2 섹션에 적재. → 검증: 프레임별 {err, available, sanity}.

## 3. 방법1 — 플레이어 앵커
- [ ] `poc_m1_player.py`: 줌 프레임 플레이어 아이콘 검출(흰 화살표/노란) + P_world 앵커 → 절대중심. → 검증: 프레임별 아이콘 가시여부 + 예측중심 + 정답거리.
- [ ] 결과를 compare_result.json m1 섹션에 적재. → 검증: 가용성(아이콘 보인 프레임 비율) 포함.

## 4. 방법5 — factor graph 융합
- [ ] `poc_m5_fusion.py`: 원 ruler + 플레이어 + 도시라벨 앵커를 신뢰도 가중 합성 + sanity 게이트 + confidence. → 검증: 단일 앵커 실패 프레임에서도 결과 내는지, 정답거리.
- [ ] 결과를 compare_result.json m5 섹션에 적재. → 검증: 프레임별 사용된 앵커 목록 + err.

## 5. 비교·판정
- [ ] `poc_compare.py`: 3방법 프레임별 err·가용성·sanity 집계 표 + 평균. → 검증: 표 출력, 승자 선정 근거.
- [ ] 최종 HTML 보고서(`docs/resources/mockups/2026-05-27-report-zoom-compare-result.html`): 오버레이 + 점수표 + 추천. → 검증: 자급자족 HTML, 다크, 한국어.

## 6. 검수
- [ ] Codex 리뷰(`review_loop.sh` 또는 직접 codex exec)로 비교 방법론·결론 검수. → 검증: codex 출력 파일 + 반영.

## 7. (승자) 제품화 브리지
- [ ] 이긴 방법 TS 제품화 계획 + `git worktree add ../feature-pub39-zoom-v2 ...`. → 검증: 워크트리 생성, 계획 문서.
- [ ] zone-geometry.ts 재사용 + 신규 순수모듈 + 유닛테스트(엣지). → 검증: vitest 통과, 커버리지.

## 완료 조건
- 5번까지 끝나고 HTML 보고서 + compare_result.json 존재 → 사용자에게 "최고 결과" 보고. 6·7은 승자 명확하면 이어서.
