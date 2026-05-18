"""매치별 맵 자동 식별.
각 매치 시작 프레임에서 map_classifier 호출. PUB-35에서 영상별 6 매치 맵 순서 도출.

PUBG 대회 영상은 보통 1개 영상에 여러 맵 매치 섞임 (e.g., E/M/R/T/M/E for PWS 파이널).
"""
import cv2, json
from pathlib import Path

import map_classifier


def assign_match_maps(frame_paths: list[str], matches: list[tuple[int, int]],
                      interval_sec: int = 30) -> list[dict]:
    """각 매치 시작 직후 프레임으로 맵 분류.
    반환: [{'match': 1, 'start_min': 60, 'end_min': 88, 'map': 'erangel'}, ...]"""
    out = []
    for idx, (s_min, e_min) in enumerate(matches, 1):
        # 매치 시작 직후 1~3분 프레임 (zoom-out 페이즈 1)
        target_sec = (s_min + 2) * 60  # 시작 + 2분
        frame_idx = target_sec // interval_sec
        if frame_idx >= len(frame_paths):
            out.append({'match': idx, 'start_min': s_min, 'end_min': e_min, 'map': 'unknown'})
            continue
        img = cv2.imread(frame_paths[frame_idx])
        if img is None:
            out.append({'match': idx, 'start_min': s_min, 'end_min': e_min, 'map': 'unknown'})
            continue
        sig = map_classifier.map_signature(img)
        out.append({
            'match': idx, 'start_min': s_min, 'end_min': e_min,
            'map': sig['map'], 'land_ratio': sig['land_ratio'],
            'avg_rgb': sig['avg_rgb']
        })
    return out
