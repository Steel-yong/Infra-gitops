---
module: video-analyzer / pub34 / meta-process
date: 2026-05-24
problem_type: workflow_issue
component: background_job
severity: high
symptoms:
  - "chain log 마지막 라인이 'cooldown 90s' 또는 클러스터 PNG 재계산이라 마치 정상 진행처럼 보임"
  - "`FileExistsError: [Errno 17] File exists: '/dev/null'` 가 step log 안에 묻혀 있음"
  - "wrapper가 fail step 무시하고 cooldown → 다음 영상 다운 → 또 fail. 6시간 동안 새 결과 0건"
  - "결과 디렉터리 파일 카운트 6시간 변화 없음"
  - "사용자에게 '진행 중' 보고했으나 실제로는 silent fail 무한 반복"
root_cause: missing_workflow_step
resolution_type: workflow_improvement
applies_when:
  - "bash wrapper가 여러 step을 chain으로 무한 반복할 때"
  - "환경 변수로 step skip 의도 전달할 때 (OUT_DIR=/dev/null 등)"
  - "사용자가 자리 비운 채 장시간 백그라운드 작업이 도는 동안"
  - "log 마지막 라인만 보고 '진행 중' 판단하려 할 때"
related_components:
  - tooling
  - development_workflow
tags:
  - silent-fail
  - watchdog
  - background-task
  - chain-script
  - dev-null
  - verification
  - pub34
  - self-confirmation-trap
---

# 백그라운드 chain 작업의 silent fail 회피 — /dev/null 가드 + watchdog + 결과 카운트 검증

## Context

PUB-34 PUBG 영상 자동 분석 파이프라인의 무한 chain wrapper(`infinite_chain_v2.sh`)가 step fail을 검증하지 않고 다음 step으로 넘어가 **6시간 동안 새 분석 결과 0건**을 만들었다. log 마지막 라인은 "정상 진행"처럼 보여 silent fail을 감지하지 못한 채 사용자에게 "진행 중"으로 보고했다. 사용자가 자고 깬 후 "얼마나 진행됐어"라고 묻고서야 발견. 신뢰 손상 + 6시간 시간 손해.

영상 다운 → YOLO 분석 → 클러스터링 → cooldown 90초 사이클을 무한 반복하는 구조. 시각화 산출물 skip 의도로 `OUT_VIS_DIR=/dev/null` 환경변수 전달.

## Symptoms

- 매 사이클 Python pipeline이 `Path("/dev/null").mkdir(parents=True, exist_ok=True)` 호출에서 `FileExistsError`로 즉시 죽음
- bash wrapper는 fail step 무시하고 cooldown → 다음 영상 다운 → 또 fail. 무한 반복
- chain log 마지막 라인이 항상 "cooldown 90s..." 또는 기존 결과 캐시 재계산 PNG 메시지라 정상으로 보였다
- 결과 파일 카운트 6시간 동안 변화 없음 (영상 다운 트래픽만 의미 없이 반복)
- process state(`ps`) 만 보면 wrapper 자체는 살아있음 (fail step 무시 중)

## What Didn't Work

다음 신호를 "정상 진행"으로 잘못 해석했다:

- **마지막 log 라인만 확인.** "cooldown 진입" 메시지 보고 "정상 진행"이라 가정. 실제로는 그 위 수십 줄이 Python traceback이었다.
- **클러스터링 PNG 타임스탬프 확인.** 기존 결과 캐시 재계산으로 PNG mtime 갱신 → "뭔가 돌긴 도는" 신호로 오해. 새 분석은 0건.
- **process state(`ps`) 만 확인.** wrapper 자체는 살아있었다. **프로세스 살아있음 ≠ 작업 진행.**

## Solution

네 단계 layered defense. 모두 즉시 재사용 가능.

### 1. Python pipeline에 환경변수 의도 가드 (root fix)

`OUT_VIS_DIR="/dev/null"` 환경변수로 시각화 skip 의도 → 받는 쪽에서 명시적 분기:

```python
OUT_VIS_DIR = Path(os.environ.get("OUT_VIS_DIR", "/tmp/pub34/yolo/full_vis"))
SAVE_VIS = str(OUT_VIS_DIR) not in ("/dev/null", "")
if SAVE_VIS:
    OUT_VIS_DIR.mkdir(parents=True, exist_ok=True)

# ... 루프 안에서 ...
if SAVE_VIS and save_vis_every and i % save_vis_every == 0:
    # 시각화 저장
    ...
```

**핵심**: 환경변수로 "skip" 의미를 전달했으면 받는 쪽 코드가 그 의도를 명시적으로 분기 처리해야 한다. `/dev/null`이 디렉터리처럼 동작할 거란 가정 금지.

### 2. chain script inline watchdog — 30분 무진척 시 자살

```bash
LAST_COUNT=$(ls /tmp/pub34/yolo/results_chain/ 2>/dev/null | wc -l)
LAST_PROGRESS=$(date +%s)

watchdog_check() {
  local now cur elapsed
  now=$(date +%s)
  cur=$(ls /tmp/pub34/yolo/results_chain/ 2>/dev/null | wc -l)
  if [ "$cur" -gt "$LAST_COUNT" ]; then
    LAST_COUNT=$cur
    LAST_PROGRESS=$now
    echo ">>> WATCHDOG: progress OK ($cur results)"
  else
    elapsed=$((now - LAST_PROGRESS))
    if [ $elapsed -gt 1800 ]; then
      echo ">>> !!! WATCHDOG ALERT: 30분 동안 새 결과 0건. STOP."
      exit 99
    fi
  fi
}
```

매 사이클 끝에 `watchdog_check` 호출. **결과 파일 카운트 변화가 유일한 진척 지표** — log 메시지는 신뢰하지 않는다.

### 3. 별도 monitor process — 외부 5분 주기 감시

```bash
#!/bin/bash
# /tmp/pub34/yolo/watchdog.sh — chain script와 독립 process
while true; do
  sleep 300
  now=$(date +%s)
  cur=$(ls $RESULTS_DIR 2>/dev/null | wc -l)
  err_recent=$(tail -200 "$CHAIN_LOG" 2>/dev/null | grep -cE "Error|Exception|Traceback|FAIL")
  elapsed=$((now - LAST_TIME))
  if [ $elapsed -gt 1800 ]; then
    echo "$(date +%H:%M:%S) !!! ALERT: $((elapsed/60))min stagnant" >> "$LOG"
  fi
done
```

inline watchdog과 독립으로 돈다. chain wrapper가 죽거나 멈춰도 외부에서 신호가 남는다.

### 4. 사용자 memory에 영구 체크리스트 저장

`~/.claude/memory/feedback_background_task_verification.md` — 다음 세션에서도 자동 적용되는 3원칙:

1. **시작 직후 1~5분 sanity check 의무.** 첫 결과가 실제로 떨어졌는지 카운트로 확인
2. **사용자 보고 시마다 3종 동시 확인** — (a) 결과 카운트 변화 (b) error grep (c) process state
3. **"잘 돌고 있을 것" 추측 금지.** 카운트 변화로 증명 못 하면 "확인 불가"로 보고

## Why This Works

- **Root cause는 두 겹.** (1) Python의 `/dev/null` mkdir 실패 = 직접 원인. (2) 더 본질적으로 bash wrapper가 step exit code를 검증하지 않고 다음 step으로 무조건 넘어간 게 silent fail을 가능하게 한 구조적 원인.
- **Fix #1**은 직접 원인 제거. **Fix #2~4**는 다음 silent fail이 발생해도 30분 안에 자동 감지·중단되도록 layered defense.
- **결과 파일 카운트는 위조 불가능한 진척 신호다.** log 메시지는 step이 죽기 직전에 "정상" 라인을 찍을 수 있지만, 디스크에 새 결과가 생기지 않는 건 거짓말할 수 없다.
- **외부 monitor + inline watchdog 이중화**: wrapper 자체가 죽거나 멈춰도 외부에서 detect 가능.

## Prevention

다음 백그라운드 작업 시작 전 체크:

- **환경변수로 skip 의도 전달 시 반드시 받는 쪽 가드.** `if VAR not in ("/dev/null", "", "none", "skip")` 패턴
- **chain/loop wrapper는 step exit code 반드시 체크.** `set -e` 또는 명시적 `if ! step; then handle_fail; fi`
- **모든 장시간 백그라운드 작업에 결과 카운트 기반 watchdog 부착.** 30분 무진척 = 자살. log 메시지는 watchdog 신호로 쓰지 않는다
- **백그라운드 작업 진행 보고 시 3종 검증 의무** — 카운트 변화 + error grep + process state. 하나라도 빠지면 "확인 불가" 명시
- **새 chain script 작성 시 watchdog scaffold 먼저.** 비즈니스 로직보다 감시 코드를 먼저 짜는 게 silent fail 비용보다 싸다
- **"자고 오세요" 안내 전 최소 2~3 cycle 검증.** 사용자가 자리 비우는 동안 silent fail이 일어나면 시간 회복 불가

## Related

### Solutions (같은 PUB-34 프로젝트)

- [[pub34-coordinate-transform-anchor-verification-2026-05-22]] — **Moderate overlap**. "self-confirmation trap" 메타 패턴 공유 (자가 검증으로 OK 선언 → 사용자 검증 시 어긋남). 특히 사건 3 ("v12 검수 통과" 자가선언 트랩)이 이번 wrapper "정상 진행" 보고 트랩과 동형
- [[2026-05-23-pub34-classical-cv-detection-failure]] — 같은 video-analyzer 모듈 회고. "부분 정확도 ≠ 전체 성공" 교훈 (체인 일부 통과 ≠ 결과 생성)
- [[2026-05-24-pub34-synth-data-iteration-lessons]] — 같은 PUB-34 YOLO pipeline 자매 회고. "metrics ≠ 사용자 시각 검수" 메타 패턴 동일

### Memory (자매 항목)

- `~/.claude/memory/feedback_background_task_verification.md` (이 회고의 핵심 origin)
- `~/.claude/memory/feedback_verify_dont_wait.md` — 4일 전 저장. 동일 root cause "요약 숫자만 보고 OK 선언"의 검증 시점 측면

### 진행 문서 / 산출물

- `docs/projects/2026-05-23-pub34-yolo-pipeline.md` — PUB-34 진행 메인
- `/tmp/pub34/yolo/full_pipeline.py` — root fix 적용 파일
- `/tmp/pub34/yolo/infinite_chain_v2.sh` — inline watchdog 추가된 wrapper
- `/tmp/pub34/yolo/watchdog.sh` — 외부 monitor
- Linear: PUB-34
