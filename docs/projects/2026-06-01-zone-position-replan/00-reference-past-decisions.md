# 재계획 참조 — 줌 자기장 추출 & 프로위치 영상학습 (과거 결정·폐기·블로커 압축)

> 작성 2026-06-01. 목적: 두 막힌 영역(줌 자기장 추출 / 프로위치 영상학습)의 새 플랜·멀티에이전트·딥리서치가 **모두 이 문서를 단일 출처로 참조**하게 한다. 추측 금지. 모든 항목은 과거 문서/코드 근거 인용.
>
> Linear: 조회 불가 상태(도구 미확인). 새 이슈 번호는 사용자 승인 후 부여.

---

## 0. 한 줄 진단

- **줌 자기장**: 알고리즘은 끝났다. **변환 함수가 capture 파이프라인에 미배선**이고 **라이브 검증 하네스가 없어** A3 게이트에서 멈춤. (근본 난제 아님 — 배선+검증 문제.)
- **프로위치**: 저해상도+이름박스 폐기로 검출률 10%, 720p IP 차단, 그리고 **2페이즈+ 재seed anchor 부재**로 phase1만 데이터가 쌓임.
- **교차점**: 프로위치 2페이즈+ 재seed는 줌 자기장이 만든 "줌 픽셀→게임 좌표" 변환(`zoom-localize.ts`)을 그대로 쓴다. 줌 좌표변환이 공유 토대.

---

## 1. 트랙 A — 줌 자기장 추출

### 1.1 확정된 결정 (재논의 금지, 근거 있음)
- **전체맵 흰 원 = 3점 RANSAC + 각도커버리지 게이트(둘레 55%↑) + Kasa 재피팅**. 그리드선·도시라벨 가짜원 제거. (`zoom-detect.ts:fitRing`, `circle.service.ts`; 근거 `2026-05-27-pub-39-zoom-compare/context-notes.md:36-52`)
- **줌 전략 = A안(원 ruler + 앵커)**: 전체맵서 락된 자기장(절대좌표·반경)을 자로 사용. PUBG는 북쪽 고정+균일 줌 → 회전 무 → 변환 = 스케일+이동만. (`2026-05-27-pub-39-zoom-v2/context-notes.md:1-16`, `mockups/2026-05-29-report-zoom-pipeline-v2.html:80-103`)
- **페이즈→반경 테이블 PUBG_PHASE_RADII**: 페1=0.2492, 페2=0.1374, 페3=0.0815… 휠당 비선형(첫휠 ×2.106, 둘째 ×1.908). 19장 실측, 예측오차 ≤0.84%. (`sift-zone.service.ts:17`, `mockups/2026-05-28-ml-zoom-verify.html:44-56`)
- **부모 포함 제약**: 다음 자기장 ⊂ 현재 자기장. 비례 허용치 `tol = parent.r * 0.2`(절대 아님 — 후반 페이즈 버그 방지). (`zone-geometry.ts:13-22`, `2026-05-27-pub-39-zoom-parent-constraint/context-notes.md:7-9`)

### 1.2 폐기된 접근 (되살리지 말 것)
- **SIFT/AKAZE 지형매칭→호모그래피**: 줌서 inlier 4~29개(게이트 120 미달). 화면 과확대+단조지형으로 특징점 부재. **물리적 불가 확정.** (`2026-05-29-report-zoom-methods.html:112-122`, `2026-05-27-pub-39-zoom-parent-constraint/context-notes.md:30-40`)
- **파란 벽 색분리**: 벽 b-max(65) < 배경 틴트 b-max(72). 색 강도로 분리 불가. (`2026-05-27-pub-39-zoom-compare/context-notes.md:36-52`)
- **parentCircle 단독으로 SIFT 가짜 교정**: 거르기만 할 뿐 SIFT를 못 고침. inlier 게이트서 먼저 다 죽음. (`2026-05-29-report-zoom-methods.html:124-130`)

### 1.3 지금 막힌 지점 (정확히)
1. **좌표변환 미배선**: `capture.service.ts`의 `detectZoneZoom()`이 `deriveZoomTransform()`/`localizeNextZone()`를 호출 안 하고 앵커를 그대로 반환(106줄). → 줌서 자기장 실제 위치변화 추적 불가.
2. **다음 원(다음 페이즈) 검출 불안정**: 현재 원만 안정 검출, 다음 원은 글자·경로선 노이즈로 가짜원. 진짜 다음 원이 작으면 검출 실패.
3. **앵커 없는 콜드스타트 폴백 미구현**: 중간 합류(앵커 없음) 시 ML/도시라벨 필요하나 미구현.
4. **줌 단계 N 식별 모호**: 같은 픽셀반경이 여러 (페이즈,줌) 조합과 겹침(페2줌2 ≈ 페1줌1). 휠 카운트 또는 현재:다음 반경비로 disambiguation 필요.

### 1.4 보유 자산
- 구현 완성: `zoom-detect.ts`(4/4), `zoom-localize.ts`(8/8: `deriveZoomTransform`/`pixelToGame`/`localizeNextZone`), `zone-geometry.ts`(9/9).
- PoC: `.local/poc_zoom_series.py`(19장 배율·반경·공식검증), `.local/poc_zoom_two_white.py`(2v/4v 현재·다음원), `.local/validate-zoom-detect.cjs`(TS↔Python 일치).
- 설계만(미구현): 플레이어아이콘 윈도우 lock(D-1), 미니맵 경계 호 기하(D-2), 줌레벨 분류 보정표(D-3). (`2026-05-27-pub-39-zoom-v2/codex-deep-r5.md`)
- 부재: ±0.3% 정밀 ground truth(에이전트 눈측정 ±2~4%로 불충분) → **라이브 검증 하네스로 대체 필요**.

### 1.5 다음 액션 후보 (플랜 입력)
- (즉시) 변환 파이프라인 배선: `detectZoneZoom()`에서 변환 호출 → 절대좌표 반환.
- (보조) 줌 단계 N 식별: 휠 이벤트 카운트 추적 or 반경비 매칭.
- (검증) 라이브 검증 하네스: 락→줌인 시 자기장 위치/반경이 페이즈 규칙 만족하는지 화면 오버레이로 확인.
- (확장) 다음 원 검출 안정화: 반경비 필터(N:N+1≈0.55)+흰픽셀 게이트.
- (확장) 콜드스타트 폴백.

---

## 2. 트랙 B — 프로위치 영상학습

### 2.1 확정된 결정
- **YOLOv11n fine-tune(합성 5000장, 4클래스)**: 고전 CV(HSV+Hough, SIFT homography) 전부 실패 후 전환. 모델 `best.pt`(6MB, `.local/pub34-yolo-backup/runs/pub34_v7/weights/best.pt`). (`2026-05-23-pub34-yolo-pipeline.md`)
- **영상 소스 = 토너먼트 playlist의 (MAP) view 98편**. 일반영상 109편은 highlights라 무의미. (MAP) 첫 영상 0.4→82개/편(205배). (`2026-05-25-pub34-map-chain-resume.md:35-41`)
- **고화질 재분석 필수(720p~1080p)**. 480p는 통합포맷이라 통과, 720p DASH는 IP차단. (`2026-05-25-pub34-map-chain-resume.md:56-65`)
- **태이고 분류기 = SIFT 양쪽 매칭(에란겔+태이고) 후 재투영 오차 낮은 쪽**. 옛 `avg_R>avg_G*1.2` 버그가 태이고→에란겔 오분류, 98편 재분석 필요. (`2026-05-26-pub-38-taego-reanalysis-plan.md`)
- **도시 anchor 좌표계**: 27개 도시 SIFT 검증, 재투영오차 0.30~0.31px(≈2m). 신뢰 가능. (`2026-05-20-pub34-검증-결과.md:23`)

### 2.2 폐기된 접근
- HSV+HoughCircles(false positive 86%), label-box left-edge=player(완전 불일치), SIFT homography 단독 마커추출(좌표는 1.6m로 정확하나 fp 86.5%가 School 한 점에 16,768개 집중), OWLv2 zero-shot(score<0.3). (`2026-05-23-pub34-yolo-pipeline.md:19-25`, `2026-05-21-pub34-auto-evolve-결과.md`)
- 자율분석 명당 BEST 53/SECONDARY 159 **전량 폐기**(격자 OCR 실패→default transform→좌표 바다로 누적). (`2026-05-20-pub34-검증-결과.md`)

### 2.3 지금 막힌 지점 (왜 1페이즈만)
1. **저해상도+이름박스 폐기**: sec4230서 63명중 6명(10%). 1x=player2/namebox9, 2x업스케일=player10/namebox18, 720p+=5~7배 예상. `full_pipeline.py`가 이름박스를 버림(`if c==1: continue`). (`2026-05-25-pub34-detection-improvement.md:7-41`)
2. **인프라**: YouTube IP차단으로 720p+ 다운로드 불가. (`2026-05-25-pub34-map-chain-resume.md:62-65`)
3. **구조적 — 재seed anchor 부재**: phase1 전체맵에서만 seed. zoom/phase2+ 클립은 라벨 생성 불가. **이것이 "1페이즈만 됨"의 핵심.** (`2026-05-31-pub-41-marker-constellation-codex-review.md`)

### 2.4 PUB-41 marker-constellation Codex 4 BLOCKER
1. **Correspondence matching**: YOLO 점만으론 현재점↔이전player 매칭 불가. 색상/팀라벨/optical flow로 후보 제한 필수.
2. **Scene cut 처리 약함**: 카메라전환/인터미션/타맵서 가짜 pseudo-label. hard gate(fullmap 감지·inlier ratio·scale jump) 필수.
3. **Zoom 재seed 부재**: phase2+ seed 못함 → 자기장 원 ruler/도시명 OCR/격자선서 재seed anchor 필요. ← **트랙 A와 공유점.**
4. **Pseudo-label 검증 기준 없음**: 나쁜 라벨이 모델을 더 망침. HTML overlay 샘플·residual histogram·수동검수 필수.
(근거 `2026-05-31-pub-41-marker-constellation-codex-review.md:3-7`)

### 2.5 보유 자산
- 모델 `best.pt`(재학습 1.5~2h, RTX2080Ti). 파이프라인 `full_pipeline.py`(영상→YOLO→이름박스오프셋→SIFT→게임좌표 JSON, 변환 0.30~0.31px). `.local/pub34-yolo-backup/`(main repo 미포함).
- 데이터: (MAP) 98편. 480p 분석 47편(마커 ~8k~15k 추정), 1080p 재수집 51편 진행. 조건부 명당 static 491개/클러스터 32개.
- mockup: `mockups/2026-05-30-pub-41-r10-model-compare/`(모델 좌표비교), `…r9-lock-verify/`(zoom 게이팅 LABEL/SKIP), `…2026-05-31-pub-41-v3-data-distribution/`(라벨분포), `resources/modi-maps/`(명당 시각화).

### 2.6 Codex 미답 설계 질문 (플랜서 답해야)
- YOLO가 마커 색상/팀명 박스/마커타입을 함께 내는가, 아니면 점 좌표만인가?
- phase1 seed의 player 전역좌표가 수동검증 GT인가, SIFT+YOLO 자동결과인가?
- 추출 가능 fps는? (1fps면 optical flow/multi-frame smoothing 약함.)

### 2.7 다음 액션 후보 (플랜 입력)
- IP 우회→고화질 수집(검출 5~7배). 이름박스 union 복원(2~3배). 둘은 재seed와 독립적으로 즉시 효과.
- zoom/phase2+ 재seed anchor 구현 — 트랙 A 좌표변환 위에.
- correspondence/scene-cut gate/pseudo-label 검증 = PUB-41 4 BLOCKER 해소.

---

## 3. 두 트랙의 의존 관계

```
트랙 A: zoom-localize 배선 + 줌단계 식별 + 라이브 검증  ──┐
                                                          ├─→ (공유) 줌 픽셀→게임 좌표 변환
트랙 B: 고화질 수집 / 이름박스 복원  (A와 독립, 즉시)      │
트랙 B: zoom/phase2+ 재seed anchor  ──────────────────────┘ (A 위에 섭니다)
```

- 병렬 진행하되, 트랙 B의 재seed는 트랙 A의 좌표변환이 라이브 검증을 통과한 뒤 그 위에 올린다.
- 트랙 B의 고화질 수집·이름박스 복원은 A와 완전 독립 → 가장 먼저 착수 가능(빠른 데이터 이득).

---

## 4. 새 플랜에서 답해야 할 열린 결정

1. (A) 콜드스타트(앵커 없음) 폴백을 1차 범위에 넣을지, 후순위로 뺄지.
2. (A) 라이브 검증을 ±0.3% GT 없이 "수동 화면 대조"로 통과 인정할지의 기준.
3. (B) 재seed anchor 1순위 신호: 자기장 원 ruler vs 도시명 OCR vs 격자선 — 어느 것부터.
4. (B) 고화질 IP 우회 방식 확정(Tailscale exit node 재발 리스크: `incident-wsl-exit-node-overnight` 참조).
5. (B) pseudo-label 검증 게이트 통과 기준(residual·수동검수 비율).
6. 딥리서치 결과를 어느 결정에 주입할지의 슬롯.
```
