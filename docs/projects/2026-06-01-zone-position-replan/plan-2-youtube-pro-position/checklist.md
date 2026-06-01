# 트랙 B 체크리스트 — 프로위치 영상학습

> 완료 시 즉시 체크. 참조 [[plan]].

## 선행 결정 / 질문
- [ ] D-IP: 고화질 IP 우회 방식 확정(incident 가드)
- [ ] D-SEED: 재seed anchor 1순위(원 ruler/도시 OCR/격자선) — 멀티에이전트 비교
- [ ] D-TEL: telemetry 접근 가능 여부(트랙 A 공유)
- [ ] D-GATE: 학습 게이트 center-inside 확정
- [ ] Codex 미답 3질문(YOLO 출력/seed GT 성격/fps) 답
- [ ] Linear 이슈번호 부여(B-1~B-6)

## B-1 고화질 수집 (D-IP 후)
- [ ] 네트워크 프리플라이트 가드 통과 로그
- [ ] (MAP) 98편 720p+ 수집 N편
- [ ] 480p vs 720p 검출수 ≥3배 샘플

## B-2 이름박스 union
- [ ] full_pipeline.py 이름박스 union(if c==1 continue 제거)
- [ ] 동일 sec 검출수 ≥2배
- [ ] 오프셋 캘리브레이션 좌표오차 측정

## B-3 줌/2페이즈+ 재seed (A-2·A-3 후, D-SEED)
- [ ] 재seed anchor 1순위 구현
- [ ] phase2+ 좌표추출 성공, 오차 측정
- [ ] seed 끊김 시 재seed 성공률

## B-4 correspondence matching
- [ ] 색상/팀라벨/optical flow 후보 제한
- [ ] 연속 프레임쌍 매칭 정확도

## B-5 scene-cut hard gate
- [ ] fullmap+inlier+scale jump 게이트
- [ ] scene-cut 클립 가짜라벨 0

## B-6 pseudo-label 검증 (A-5 공유, D-GATE)
- [ ] HTML 오버레이 + residual histogram (+telemetry 교차)
- [ ] center-inside soft 게이트, full-inside는 경고만
- [ ] 통과기준 명문화 + 수동검수 일치율
