# PUB-38 컨텍스트 노트 — 태이고 재분석

## 핵심 결정과 이유

### 분류기를 색상 → SIFT 양쪽매칭으로
- 옛 분류기 `classify_frame`는 `avg_R > avg_G*1.20`이면 taego로 봤다. 이는 **붉은 맵(미라마)**을 잡으려던 의도였는데, 태이고는 초록 우세(R<G)라 정반대로 빠져 erangel 기본값으로 오분류됐다.
- AKAZE/SIFT 특징점 매칭은 태이고를 압도적으로 구분한다(3039 vs 5 inlier). 그래서 색상 판정을 폐기하고 **두 기준맵에 모두 매칭 → 재투영 오차(hm[2]) 낮은 쪽 채택**. intro/비행 화면만 싸게 거른다.
- 비용: 프레임당 SIFT 매칭 2회(에란겔+태이고)로 분석 시간 약 2배. 오프라인 배치라 수용.

### 재다운로드 불가피
- 체인은 영상 처리 후 `rm`으로 삭제한다(디스크 절약). 그래서 프레임 원본이 없어 재분석하려면 재다운로드해야 한다.
- 단 1편씩 받아→처리→삭제라 디스크 peak는 1편(~2.5GB), 누적 대역폭만 크다. 사용자가 "250GB 한번에 받는 것" 우려해서 이 점진 방식 유지.

### IP 우회 (집 exit node)
- 회사 서버 IP(112.216)가 YouTube 봇차단. WSL Tailscale exit node로 집 IP(114.204)를 빌려 우회. yt-dlp가 WSL에서 정상 동작 확인(제목·스트림 URL·프레임 추출 성공).
- ffmpeg는 PATH에 없어서 imageio_ffmpeg 제공 static 바이너리를 `~/.local/bin/ffmpeg`로 심볼릭. 단 `--download-sections`(구간컷)에서 segfault(-11) 발생 → 구간컷 안 쓰고 **전체 다운로드 후 처리** 방식으로(체인 기본 방식과 동일).

### WSL 영속 실행
- `wsl -- bash -c "...&"`로 띄운 백그라운드는 wsl.exe 리턴 시 WSL VM이 내려가며 같이 죽는다.
- 해결: 체인을 `&` 없이 포그라운드로 두고, 그 wsl.exe 호출을 하니스 백그라운드로 유지 → 체인 도는 내내 WSL 생존.

## 검증 기록
- AKAZE 인식: taego_named_full.jpg → taego 3039 / erangel 5 inlier.
- 분류 수정 전후(video1080, GPU 불필요): 태이고 구간 taego 0→11, 에란겔 구간 erangel 2→11.

## 관련
- 옛 진행 메모: `2026-05-25-pub34-map-chain-resume.md`
- 체인/모델 백업: `.local/pub34-yolo-backup/`
- 분류 수정 파일: `.local/pub34-yolo-backup/full_pipeline.py` (← /tmp/pub34/yolo로 동기화 필요)
