"""인트로 vs 매치 화면 분류. 좌측 가장자리 G 채널 < 25면 보라색 인트로."""
import cv2, numpy as np
from pathlib import Path


def is_intro(img) -> bool:
    """프레임 좌측 5% 영역 평균 RGB로 인트로 판정.
    PWS 인트로 보라색 배경 — B > R > G, G 매우 낮음.
    다양한 PWS 영상 인트로 색조에 robust한 임계값.
    PUB-36 후속: 영상별 색조 차이 큼 — 자기장 검출 기반 매치 식별로 전환 검토."""
    h, w = img.shape[:2]
    edge = img[:, 0:int(w*0.05)]
    b, g, r = edge.mean(axis=(0,1))
    is_purple = (b > r + 5) and (b > g + 25) and (g < 45)
    return is_purple


def find_matches_by_zone(frame_paths: list[str], interval_sec: int = 30,
                          gap_tolerance: int = 4, min_match_minutes: int = 10) -> list[tuple[int, int]]:
    """v4: 자기장 검출 기반 매치 식별.
    인트로 색조 차이가 큰 영상에 robust.
    - 자기장 검출됨 = 매치 진행 (페이즈 2+)
    - 자기장 안 보임 = 인트로/wait/페이즈 1 wait
    - 연속 자기장 검출 그룹 = 한 매치 (gap_tolerance 프레임 이내 끊김 허용)"""
    import zone_detector
    detected_minutes = []
    for i, fp in enumerate(frame_paths):
        img = cv2.imread(fp)
        if img is None: continue
        zone = zone_detector.detect_zone(img)
        if zone and 0.05 <= zone['r_screen'] <= 0.5:
            detected_minutes.append((i + 1) * interval_sec // 60)

    if not detected_minutes: return []

    # 연속 그룹화
    segments = [[detected_minutes[0], detected_minutes[0]]]
    for m in detected_minutes[1:]:
        if m - segments[-1][1] <= gap_tolerance:
            segments[-1][1] = m
        else:
            segments.append([m, m])
    return [(s, e) for s, e in segments if e - s >= min_match_minutes]


def find_matches(frame_paths: list[str], interval_sec: int = 30,
                 gap_tolerance: int = 2, min_match_minutes: int = 10) -> list[tuple[int, int]]:
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
