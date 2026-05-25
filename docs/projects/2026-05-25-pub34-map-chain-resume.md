# PUB-34 — (MAP) 영상 chain 진행 메모 (재시작용)

> 2026-05-25. 컴퓨터 재시작 후 즉시 이 파일 읽고 사용자 안내. 진행 중단 없이 chain 이어서 재개.
> Linear: PUB-34. 진행 main 문서: `docs/projects/2026-05-23-pub34-yolo-pipeline.md`

## 한 줄

진짜 (MAP) view 영상 98편 chain 분석 중. **컴퓨터 재시작 후 `bash /mnt/d/infra\ project/Infra-gitops/.local/pub34-yolo-backup/RESUME.sh` 실행으로 즉시 이어감.**

## 컴퓨터 끄기 전 마지막 상태 (2026-05-25)

| 항목 | 상태 |
|---|---|
| 학습 모델 best.pt | 백업됨 (`runs/pub34_v7/weights/best.pt`) |
| chain 진행 | 1편 분석 완료 (`-aeYyiqCwRo.json`, 82 markers) |
| 남은 영상 | 97편 (`map_video_ids.txt`) |
| 통합 클러스터 | **정품화됨 (2026-05-25)** — MAP만 사용, static=491, clusters=32, S=School·Quarry |

## combiner 정품화 (2026-05-25 검수)

`cluster_chain_combined.py`를 **`results_chain_map/`만** 쓰도록 수정 (1차 일반영상·weekly_test 중복·1080 제외). 오염 전 sources=148/static=1671/Pochinki S 5개 과분할 → 정품 후 static=491/clusters=32/S=School·Quarry(여러 영상 반복). `.local/pub34-yolo-backup/`의 combiner도 정품 버전으로 동기화했으니 RESUME.sh 재기동해도 정품 유지. 검수 경위: `docs/resources/mockups/2026-05-25-decision-pub34-data-midcheck.html`.

## 2026-05-25 추가 진행 (검출 개선·태이고·IP 차단)

**chain 멈춤**: 07:45 봇차단 후 chain이 멈추지 않고 **1,789번 재시도** → IP 차단 심화 → watchdog가 09:36 정지. **47/98편**에서 멈춤. 원인은 chain의 backoff 부재 (재설계 시 exponential backoff + 연속실패 중단 추가 필요).

**검출률 ~10% 문제**: sec=4230(63명 생존) 검증에서 6명만 검출. 원인 = 저해상도(480p) + 이름박스 미사용. **이름박스 union을 `full_pipeline.py`에 적용** (점 못 잡아도 이름박스 윗변 0.7배 위에 동그라미 추론) → 360p에서 2.6배(44→115). 고화질이면 5~7배 예상. 상세: `docs/projects/2026-05-25-pub34-detection-improvement.md`.

**태이고 좌표화**: SIFT 좌표엔진 0.32px 확정(에란겔급). 지명 anchor v5 = `docs/resources/mockups/2026-05-25-taego-anchor-v5.png` (사용자 검증 중, A~I/I~Q 격자·100m 단위). `full_pipeline.py`에 태이고 분기 추가 (classify=taego_other → taego.jpg SIFT). `TAEGO_CITIES` 19개 코드에 들어감. demo 1편 분석 = 에란겔 115 + 태이고 2마커 (이 영상 에란겔 위주).

**IP 차단 = 현재 유일 병목**: youtube 봇차단 지속. 쿠키 `.claude/www.youtube.com_cookies.txt`(2027까지 유효) 있지만 IP 자체 차단이라 안 풀림. 해결 = 시간 대기 or IP 변경(VPN/핫스팟, WSL이라 사용자가 어려워함). **IP 풀리면**: ① 고화질 재분석 ② 태이고 영상 수집 ③ (선택) 도커라이즈→K8s.

**MLOps 아키텍처**: `docs/areas/2026-05-25-pub34-mlops-architecture.html` — 인프라(Harbor/ArgoCD/K8s/Longhorn/Grafana)는 MLOps 뼈대 거의 갖춤, 추가 필요 = MLflow+Argo Workflows+DVC.

## 핵심 발견 — 어제까지 한 chain 작업이 효과 없었던 이유

**1차 chain (480p, 109편 일반 영상)**: PUBG Esports KR 채널 main 영상 fetch → 거의 다 highlights/interview/teaser → **(MAP) view 영상 0편**. 마커 +38만 추가 (영상당 평균 0.4개). 6~10시간 작업 사실상 무의미.

**진짜 (MAP) 영상 source**: 채널 main 아니라 **토너먼트 playlist 안에 있음**. 17개 playlist (2026 PWS / PGS 3~10 / PGC 2025 등)에서 "(MAP)" 또는 "[MAP]" 키워드 영상만 필터 → **98편 진짜 (MAP) view 영상** 발견.

**검증**: 첫 (MAP) 영상 1편에서 82 마커 (이전 일반 영상 1편 평균 0.4개 → **205배**).

자세한 source 정보: memory `project_pub34_map_video_source.md`.

## 컴퓨터 재시작 후 즉시 할 일 (1줄)

```bash
bash "/mnt/d/infra project/Infra-gitops/.local/pub34-yolo-backup/RESUME.sh"
```

이 스크립트가:
1. `/tmp/pub34/yolo/` 살아있으면 그대로, 죽었으면 백업에서 복원 (best.pt + scripts + 결과 JSON)
2. 이미 분석된 영상 skip, 남은 영상부터 다운 + 분석 + 자동 클러스터링
3. watchdog + safety (GPU 온도/CPU load)

## 2026-05-25 IP 우회 + 1080p chain (다음 재시작 시 필수)

**IP 차단 대응 = Tailscale Exit Node 우회**: pol-server 공인 IP(112.216.8.114)가 YouTube 봇차단되면 → home-desktop(Tailscale 100.107.151.4, 공인 114.204.62.206 — 깨끗) Exit Node로 우회.
- 사용: `sudo tailscale set --exit-node=100.107.151.4 --exit-node-allow-lan-access` (sudo 비번 필요 — 사용자가)
- 확인: `tailscale exit-node list` + `curl ifconfig.me`(114.204면 OK)
- **home-desktop(집 컴퓨터) 켜져 있어야 함**. Exit Node는 집 컴퓨터에서 `tailscale up --advertise-exit-node` + admin 콘솔(login.tailscale.com) 승인 필요. SSH는 Tailscale 내부망(100.x)이라 안 끊김.

**chain 고화질화됨**: `infinite_chain_map.sh` = `best[height<=1080]` + 쿠키(`.claude/www.youtube.com_cookies.txt`) + backoff(연속 5회 DL 실패 시 `exit 88`로 안전 중단 — 1789번 폭주 재발 방지). `full_pipeline.py` = 이름박스 union + 에란겔/태이고 분기 + `zone_game`(조건부 명당용 자기장 게임좌표) 저장. 전부 `.local/pub34-yolo-backup/`에 동기화됨.

**현재 상태**: 47편(480p 기존) + 51편 1080p 재수집 중. 끝나면 조건부 명당(`P(방문|자기장포함)` + Wilson 보정, [[project_pub34_myungdang_conditional_scoring]]) 재계산 → 맵 전체 공평 추천. 47편도 1080p 재분석하면 완전 균일.

## 백업 위치

`/mnt/d/infra project/Infra-gitops/.local/pub34-yolo-backup/` (12MB)

| 파일 | 의미 |
|---|---|
| `runs/pub34_v7/weights/best.pt` | **YOLO 학습 모델** (재학습 어려움 — 가장 중요) |
| `results_chain/*.json` | 어제 일반 영상 109편 분석 결과 (참고용, 마커 적음) |
| `results_chain_map/*.json` | 진짜 (MAP) 영상 분석 결과 (현재 1편) |
| `*.sh / *.py` | chain 스크립트 + 파이프라인 코드 |
| `map_video_ids.txt` | 98편 (MAP) 영상 ID list |
| `full_results_weekly_v8zone.json` 등 | weekly_test / 1080 영상 결과 |

## 예상 시간

98편 × 영상당 다운 5분 + 분석 1~2분 + cooldown 90초 = **약 10~12시간** 전체.

자고 오시면 끝나있을 것. 끝나면 자동으로 1시간 sleep 모드로 들어가고 새 영상 fetch 시도.

## 새 세션 시작 시 보고 형식 (CLAUDE.md 0부)

```
현재 진행 상태:
- 계획: docs/projects/2026-05-25-pub34-map-chain-resume.md 의 (MAP) chain 재개
- 작업 중 이슈: PUB-34
- 미푸시 develop 커밋: N개
- 열린 워크트리: feature-PUB-34 등
다음 할 일: RESUME.sh 실행해서 chain 재개
계속 진행할까요?
```

## 결정 옵션 (재시작 후 사용자 선택)

| 옵션 | 시간 | 효과 |
|---|---|---|
| **A. RESUME.sh 실행 — 97편 (MAP) chain 자동 재개** | 10~12시간 백그라운드 | 진짜 명당 데이터 폭증 (~8000~15000 마커 예상) |
| **B. 일부만 (예: 30편)** | 3~4시간 | 빠른 결과 확인 |
| **C. 현재 결과로 commit + 멈춤** | 30분 | 진행 적음 |

**추천: A** (어차피 백그라운드 무인 도는 작업). 사용자 답 받기 전에 자동 실행해도 OK.

## 관련 회고 (다음 같은 실수 안 하도록)

- `docs/resources/solutions/architecture-patterns/2026-05-24-background-chain-silent-fail-watchdog.md` — silent fail 회피 패턴
- `docs/resources/solutions/architecture-patterns/2026-05-24-pub34-synth-data-iteration-lessons.md` — 합성 데이터 6회 iteration 교훈
- `docs/resources/solutions/architecture-patterns/2026-05-23-pub34-classical-cv-detection-failure.md` — 고전 CV 폐기

## 이번 (MAP) source 발견의 영구 학습 (memory)

`~/.claude/memory/project_pub34_map_video_source.md` — 다음 세션에서도 자동 적용. 채널 main 아닌 토너먼트 playlist에서만 (MAP) 영상 추출.
