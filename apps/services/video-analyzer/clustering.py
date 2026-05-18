"""DBSCAN 핫스팟 클러스터링 + tier 결정.
- tier S: ≥3 매치 공통
- tier A: 2 매치 공통
- tier B: 1 매치
"""
import numpy as np
from sklearn.cluster import DBSCAN


def cluster_hotspots(markers_game: list[dict], eps: float = 0.025, min_samples: int = 5) -> list[dict]:
    """게임 좌표 마커들 → 핫스팟 클러스터.
    markers_game: [{'gx', 'gy', 'match', ...}, ...]"""
    if not markers_game: return []
    coords = np.array([[m['gx'], m['gy']] for m in markers_game])
    db = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)
    labels = db.labels_

    by_label: dict[int, list[dict]] = {}
    for label, m in zip(labels, markers_game):
        if label == -1: continue
        by_label.setdefault(label, []).append(m)

    hotspots = []
    for label, ms in by_label.items():
        cx = float(np.mean([m['gx'] for m in ms]))
        cy = float(np.mean([m['gy'] for m in ms]))
        matches_seen = sorted(set(m['match'] for m in ms))
        if len(matches_seen) >= 3:
            tier = 'S'
        elif len(matches_seen) == 2:
            tier = 'A'
        else:
            tier = 'B'
        hotspots.append({
            'gx': round(cx, 4), 'gy': round(cy, 4),
            'count': len(ms), 'matches': matches_seen, 'tier': tier,
        })
    hotspots.sort(key=lambda h: (-len(h['matches']), -h['count']))
    return hotspots
