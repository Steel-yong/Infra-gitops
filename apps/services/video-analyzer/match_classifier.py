"""인트로 vs 매치 화면 분류. 좌측 가장자리 G 채널 < 25면 보라색 인트로."""
import cv2, numpy as np
from pathlib import Path


def is_intro(img) -> bool:
    """프레임 좌측 5% 영역 평균 RGB로 인트로 판정.
    PWS 인트로 보라색 배경 — G 채널 매우 낮음 (12 부근)."""
    h, w = img.shape[:2]
    edge = img[:, 0:int(w*0.05)]
    b, g, _ = edge.mean(axis=(0,1))
    return g < 25 and b > 40


def find_matches(frame_paths: list[str], interval_sec: int = 30,
                 gap_tolerance: int = 2, min_match_minutes: int = 3) -> list[tuple[int, int]]:
    """프레임 시퀀스 → 매치 시작/끝 시간(분) 튜플 리스트.
    매치 사이 인트로 ≥1프레임으로 분리. 짧은 노이즈는 머지."""
    classified = []
    for i, fp in enumerate(frame_paths):
        img = cv2.imread(fp)
        if img is None: continue
        minute = ((i + 1) * interval_sec) // 60
        classified.append((minute, is_intro(img)))

    segments = []
    in_seg = False
    start = end = None
    for minute, intro in classified:
        if not intro:
            if not in_seg: start = minute; in_seg = True
            end = minute
        elif in_seg:
            segments.append((start, end)); in_seg = False
    if in_seg: segments.append((start, end))

    merged = []
    for seg in segments:
        if merged and seg[0] - merged[-1][1] <= gap_tolerance:
            merged[-1] = (merged[-1][0], seg[1])
        else:
            merged.append(list(seg))
    return [tuple(m) for m in merged if m[1] - m[0] >= min_match_minutes]
