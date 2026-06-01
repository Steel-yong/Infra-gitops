> # 플랜 2 — 유튜브 영상추출 (프로위치) · ⏸ PAUSED
> **보류 (2026-06-01)** — 유튜브 영상 추출 접근은 **중단**. 프로위치는 공식 telemetry로 직접 취득([[plan-1-pro-position-telemetry/plan]]). 본 플랜(이하 원문)은 비-토너먼트(일반 스트리머 등) fallback 가치로 **보존**. 재개 시 telemetry 미커버 영역에 한정.

# 트랙 B — 프로위치 영상학습 (2페이즈+ 추출) 플랜

> 참조: [[00-reference-past-decisions]] §2, [[01-research-findings]], `2026-05-31-pub-41-marker-constellation-codex-review.md`. Linear 조회 불가 → 이슈번호 placeholder `B-n`.
> 한 줄 진단: 저해상도+이름박스 폐기로 검출률 10%, 720p IP 차단, **2페이즈+ 재seed anchor 부재**로 phase1만 데이터 축적. PUB-41 Codex 4 BLOCKER 미해소.

## 목표
대회 (MAP) 영상에서 **2페이즈 이후(줌/이동 국면)에도 프로 위치를 게임 좌표로 추출**해 데이터 빈약을 해소하고, telemetry로 라벨 품질을 검증한다.

## 범위
- 포함: 고화질 수집, 이름박스 신호 복원, 줌/2페이즈+ 재seed anchor(트랙 A 위), correspondence matching, scene-cut hard gate, pseudo-label 검증.
- 비포함: 새 YOLO 아키텍처 교체(기존 `best.pt` 재사용), 명당 추천 UI(별 이슈).

## 트랙 간 의존
- **B-3(줌 재seed)는 트랙 A A-2+A-3(좌표변환·맵square)이 telemetry 검증 통과한 뒤** 그 위에 올린다.
- B-6(pseudo-label 검증)은 A-5(telemetry 하네스)와 공유.
- B-1·B-2는 트랙 A와 **독립 → 즉시 착수 가능(빠른 데이터 이득)**.

---

## 이슈 분할

### B-1. 고화질 (MAP) 영상 수집  `worktree: feature/pos-hires-collect`  ※D-IP 선행
[[00-reference-past-decisions]] §2.3-1·2.3-2. 검출 5~7배 기대.
1. (D-IP 확정 후) IP 우회로 (MAP) 98편을 720p~1080p로 수집. [[incident-wsl-exit-node-overnight]] 네트워크 프리플라이트 가드 필수.
   → 검증: ≥720p 다운로드 N편 성공, 자율런 전 네트워크 헬스체크 통과 로그.
2. 동일 프레임 480p vs 720p 검출수 비교 샘플.
   → 검증: 샘플 sec에서 720p 검출수가 480p 대비 ≥3배.

### B-2. 이름박스 union 신호 복원  `worktree: feature/pos-namebox-union`
[[00-reference-past-decisions]] §2.3-1. `full_pipeline.py`가 이름박스 버림(`if c==1: continue`).
1. 이름박스(name_box) 검출을 player 위치 추정에 union(오프셋 규칙).
   → 검증: 동일 sec(예 4230)서 63명 중 검출수 측정, union 전 대비 ≥2배.
2. 이름박스↔player 매칭 오프셋 캘리브레이션.
   → 검증: 수동 라벨 대비 좌표 오차(맵 m) 측정.

### B-3. 줌/2페이즈+ 재seed anchor  `worktree: feature/pos-zoom-reseed`  ※A-2·A-3 의존, D-SEED
PUB-41 Codex BLOCKER 3 해소. 트랙 A 좌표변환 위.
1. (D-SEED 결정 후) 줌 프레임 재seed anchor 구현: 자기장 원 ruler / 도시명 OCR / 격자선 중 1순위.
   → 검증: phase2+ 프레임에서 프로 좌표 추출 성공, A-5/telemetry 또는 수동 대조 오차 측정.
2. phase1 seed → phase2+ propagation 연결(앵커 끊김 시 재seed).
   → 검증: 한 클립 전체에서 seed 끊김 횟수·재seed 성공률.

### B-4. correspondence matching  `worktree: feature/pos-correspondence`
PUB-41 Codex BLOCKER 1. YOLO 점만으론 현재점↔이전player 매칭 불가.
1. 색상/팀라벨/optical flow로 매칭 후보 제한.
   → 검증: 연속 프레임쌍에서 매칭 정확도(수동 대조) 측정.

### B-5. scene-cut hard gate  `worktree: feature/pos-scenecut-gate`
PUB-41 Codex BLOCKER 2. 카메라전환/인터미션/타맵서 가짜 pseudo-label 방지.
1. hard gate: fullmap 감지 + inlier ratio + scale jump 임계.
   → 검증: scene-cut 포함 클립서 가짜 라벨 생성 0, 정상 구간 라벨 유지.

### B-6. pseudo-label 검증 게이트  `worktree: feature/pos-label-verify`  ※A-5 공유, D-GATE
PUB-41 Codex BLOCKER 4. 나쁜 라벨이 모델 악화.
1. 검증 산출물: HTML 오버레이 샘플 + residual histogram + (가능 시) telemetry 교차검증.
   → 검증: 라벨셋의 residual 분포·이상치 비율 리포트.
2. 부모 제약 게이트 = `center inside parent`(soft), child-full-inside 강제 금지([[01-research-findings]] A4·D-GATE).
   → 검증: center-inside 위반 라벨만 배제, full-inside 위반은 경고만.
3. 통과 기준 명문화(residual 임계·수동검수 표본 비율).
   → 검증: 기준 문서화 + 표본 수동검수 일치율.

---

## 열린 결정 (이 트랙)
- **D-IP** (B-1 선행): 고화질 IP 우회 방식. → 사용자 + [[incident-wsl-exit-node-overnight]] 가드.
- **D-SEED** (B-3): 재seed anchor 1순위(원 ruler / 도시 OCR / 격자선). → 멀티에이전트 후보비교.
- **D-TEL** (B-6): telemetry 접근 가능 여부(트랙 A 공유).
- **D-GATE**: 학습 게이트 center-inside 확정(트랙 A 공유).

## 보유 자산
- 모델 `best.pt`(YOLOv11n, `.local/pub34-yolo-backup/`), 파이프라인 `full_pipeline.py`(좌표변환 0.30~0.31px≈2m), 도시 anchor 27개(SIFT 검증), (MAP) 98편, mockup r9/r10/v3.

## Codex 미답 설계 질문 (B-3·B-4 착수 전 답)
- YOLO가 마커 색상/팀명/타입을 함께 내는가, 점 좌표만인가?
- phase1 seed 전역좌표가 수동검증 GT인가 자동결과인가?
- 추출 가능 fps는?(1fps면 optical flow 약함 → B-4 방식 좌우)

## 상시 지침 준수
- 이슈별 worktree, PR base develop, 새 파일 첫줄 한국어 주석, `any`/`console.log` 금지, 완료 전 테스트. 데이터 수집은 외부 다운로드 → 사용자 알림 원칙(7부) 준수.
