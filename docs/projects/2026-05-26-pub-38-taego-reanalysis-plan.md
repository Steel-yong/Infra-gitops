# PUB-38 — 태이고 재분석 (분류기 버그 수정 후)

> Linear: PUB-38. 작성: 2026-05-26. 역할: Claude 구현, Codex 검수(분석 완료 후).

## 배경 / 문제

대회는 맵을 균등 사용하는데 명당 데이터가 에란겔:태이고 = **20:1**(erangel 8567 마커 / taego 434 마커)로 심하게 치우쳐 있었다. 원인은 영상 프레임의 맵 분류기 버그.

- 위치: `myungdang_pov_v3.py:classify_frame`
- 버그: `avg[2] > avg[1] * 1.20` (R > G×1.2면 taego로 판정). 태이고 맵은 **초록 우세(R<G)**라 이 조건을 통과 못 해 **기본값 erangel로 오분류** → erangel base에 SIFT 매칭 실패 → 프레임 폐기 → 태이고 마커 손실.

## 목표

분류기를 **색상 휴리스틱 → erangel·taego 두 base SIFT 양쪽 매칭(재투영 오차 낮은 쪽 채택)**으로 교체하고, 98편을 **고친 분류기로 재분석**해 태이고 데이터를 에란겔 수준으로 정상화한다.

## 범위

- `full_pipeline.py` 분류 분기 교체 (완료).
- 영속 실행되는 체인으로 98편 재다운로드 → 재분석 (1편씩 다운→처리→삭제, 디스크 peak 1편).
- 재분석 후 조건부 명당 재계산 → `myungdang-taego.json` / `myungdang-erangel.json` 갱신.

## 비범위

- YOLO 모델 재학습 안 함 (기존 best.pt 사용).
- 미라마/론도 등 기준맵 없는 맵은 skip (의도).

## 인프라 전제

- YouTube IP 밴 → WSL Tailscale exit node(집 IP 114.204) 우회 (확인됨).
- ffmpeg = imageio 제공 static 바이너리를 PATH에 심볼릭.
- WSL 백그라운드 영속 = 하니스 백그라운드로 포그라운드 체인 유지.

## 완료 기준

- 태이고 매치 프레임이 taego로 정확히 분류 (검증: video1080 태이고 구간 taego 0→11 확인됨).
- 재분석 후 taego 마커 수가 erangel과 같은 자릿수.
- `myungdang-taego.json` 갱신 + 프론트 반영 + develop 커밋.
- Codex 검수 통과.
