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


def find_matches_v5(frame_paths: list[str], interval_sec: int = 30,
                    min_match_minutes: int = 12, max_match_minutes: int = 35) -> list[tuple[int, int]]:
    """v5: 자기장 반경 변화 기반 매치 분리.

    PUBG 매치는 페이즈 1 → 페이즈 6+ 사이클. 자기장 반경이
    페이즈 1(0.244)에서 페이즈 6(0.010)까지 단조 감소.
    매치 끝 = 자기장 반경 매우 작음 (페이즈 6+, < 0.04) 또는 자기장 없음.
    매치 시작 = 자기장 반경 큼 (페이즈 1~2, > 0.10).

    인트로 색 분류 (v2) + 자기장 연속 그룹 (v4) 둘 다 fail하는 영상에 적용.
    """
    import zone_detector
    zone_radii = []  # (분, 화면 반경) — None이면 자기장 안 보임
    for i, fp in enumerate(frame_paths):
        img = cv2.imread(fp)
        if img is None:
            zone_radii.append(((i + 1) * interval_sec // 60, None))
            continue
        zone = zone_detector.detect_zone(img)
        r = zone['r_screen'] if zone and 0.05 <= zone['r_screen'] <= 0.5 else None
        zone_radii.append(((i + 1) * interval_sec // 60, r))

    # 매치 시작 후보: 자기장 안 보임 → 큰 자기장 출현 (페이즈 1)
    # 매치 끝 후보: 큰 자기장 → 자기장 없음 (다음 매치 인트로) 또는 작은 자기장 (페이즈 6+)
    segments = []
    in_match = False
    start = None
    last_seen = None
    for minute, r in zone_radii:
        if r is not None and r > 0.18:  # 페이즈 1~2 자기장
            if not in_match:
                start = minute
                in_match = True
            last_seen = minute
        elif r is not None and r < 0.04:  # 페이즈 6+ 매치 끝 신호
            if in_match and last_seen and minute - start >= min_match_minutes:
                segments.append((start, minute))
                in_match = False
                start = last_seen = None
        elif r is None and in_match:
            # 자기장 안 보임 — 인트로 또는 페이즈 사이 wait
            # 5분 이상 안 보이면 매치 끝
            if last_seen and minute - last_seen > 5:
                if last_seen - start >= min_match_minutes:
                    segments.append((start, last_seen))
                in_match = False
                start = last_seen = None
        elif r is not None:
            last_seen = minute

    if in_match and last_seen and last_seen - start >= min_match_minutes:
        segments.append((start, last_seen))

    # 너무 긴 매치는 분리 (max_match_minutes 이상이면 중간 분리)
    final = []
    for s, e in segments:
        if e - s <= max_match_minutes:
            final.append((s, e))
        else:
            # 중간 분리 — max_match_minutes 단위로
            cur = s
            while cur + min_match_minutes <= e:
                nxt = min(cur + max_match_minutes, e)
                final.append((cur, nxt))
                cur = nxt
    return final


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
