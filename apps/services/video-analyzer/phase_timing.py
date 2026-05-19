"""PUBG 페이즈별 타이밍 + 시점 추정 — pipeline에서 페이즈 N 변환식 도출용."""

# PUBG 페이즈 타이밍 (초 단위) — PUB-30 page.tsx에서 가져옴
# 페이즈 N: 매치 시작 시점부터 wait 후 형성, 그 다음 shrink, 그 후 다음 페이즈 시작
PHASE_TIMING = [
    # (wait, shrink)
    (90, 240),   # 페이즈 1
    (100, 195),  # 페이즈 2
    (80, 130),   # 페이즈 3
    (50, 120),   # 페이즈 4
    (30, 100),   # 페이즈 5
    (30, 90),    # 페이즈 6
    (30, 60),    # 페이즈 7
    (30, 30),    # 페이즈 8
]


def phase_start_sec(phase: int) -> int:
    """페이즈 N 형성 시점 (매치 시작 후 누적 초)."""
    if phase < 1 or phase > 8:
        raise ValueError(f'phase out of range: {phase}')
    cum = 0
    for n in range(1, phase):
        wait, shrink = PHASE_TIMING[n - 1]
        cum += wait + shrink
    cum += PHASE_TIMING[phase - 1][0]  # 페이즈 N wait
    return cum


def phase_end_sec(phase: int) -> int:
    """페이즈 N shrink 끝 시점 (= 페이즈 N+1 wait 시작)."""
    start = phase_start_sec(phase)
    return start + PHASE_TIMING[phase - 1][1]


def phase_at_sec(sec_in_match: int) -> int | None:
    """매치 시작 후 누적 초 → 그 시점의 활성 자기장 페이즈.
    페이즈 N의 자기장이 화면에 보이는 시점:
    - 페이즈 N 형성 (start) ~ 페이즈 N+1 형성 (= 페이즈 N+1 wait 시작) 사이
    - 즉 [phase_start_sec(N), phase_start_sec(N+1)] 구간

    페이즈 1 wait 중 (sec < phase_start_sec(1))이면 None — 자기장 없음."""
    if sec_in_match < phase_start_sec(1):
        return None
    for n in range(1, 8):
        if phase_start_sec(n) <= sec_in_match < phase_start_sec(n + 1):
            return n
    if sec_in_match >= phase_start_sec(8):
        return 8
    return None


def phase_sampling_sec(phase: int, fraction: float = 0.5) -> int:
    """페이즈 N 중간 시점 추출용 — 자기장 변환식 도출에 쓸 프레임 선택.
    fraction=0.5: shrink 중간 시점 (안정적, 화면 자기장 가시화)."""
    start = phase_start_sec(phase)
    _, shrink = PHASE_TIMING[phase - 1]
    return start + int(shrink * fraction)
