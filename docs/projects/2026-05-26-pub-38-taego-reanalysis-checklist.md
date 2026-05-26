# PUB-38 체크리스트 — 태이고 재분석

## 분류기 수정
- [x] classify 버그 원인 규명 (색상 휴리스틱 R>G×1.2 → 태이고 오분류)
- [x] `full_pipeline.py` 분기 교체 (두 base SIFT 매칭, 오차 낮은 쪽 채택)
- [x] AKAZE 인식 검증 (taego_named_full.jpg: taego 3039 vs erangel 5)
- [x] video1080 태이고 구간 분류 검증 (수정전 taego 0 → 수정후 11)

## 인프라
- [x] IP 우회 확인 (WSL exit node, 집 IP로 yt-dlp 동작)
- [x] GPU 확인 (torch CUDA True, 11GB)
- [ ] ffmpeg 1080p 병합 segfault 없는지 확인 (첫 영상)
- [ ] WSL 영속 실행 해결 (하니스 백그라운드 포그라운드 체인)

## 재분석
- [ ] 기존 buggy 결과 백업 (results_chain_map → _buggy)
- [ ] 수정된 full_pipeline.py를 /tmp/pub34/yolo에 동기화
- [ ] 체인 1편 end-to-end 확인 (다운→병합→YOLO→분류→마커)
- [ ] 98편 재분석 완주
- [ ] taego 마커 수가 erangel과 같은 자릿수인지 확인

## 집계·반영
- [ ] 조건부 명당 재계산
- [ ] myungdang-taego.json / erangel.json 갱신
- [ ] apps/frontend/public/data 반영
- [ ] develop 커밋

## 검수
- [ ] Codex 검수 (review_loop.sh)
- [ ] Blocking 반영
