"""진짜 명당 v2 — 페이즈 1 마커 + 대도시 외부 + 매치 다양성 핵심 신호.

알고리즘 재설계 근거:
- 페이즈 1 마커 = 매치 시작 직후 팀 위치 (자기장 형성 시점, 이미 도착)
- 대도시 클러스터 (자동 검출 41곳) 외부에 있으면 = 비대중 선택 (의도적)
- 여러 매치에서 같은 비대중 위치에 마커 → 진짜 명당 (사용자 통찰: 작은 건물, 능선, 호)
- 페이즈 2~3 자기장 중심 거리는 보조 신호

명당 점수:
  score = log(매치 다양성 + 1) × sqrt(마커 수) × (1 - 가장 가까운 대도시 영향력)

- 대도시 가까울수록 영향력 ↑ (점수 ↓): 도시 안이거나 도시 근접 마커 제외 효과
- 대도시 멀수록 영향력 0 (점수 그대로): 외곽 능선/작은 마을 강조
"""
import json, sys, math
from collections import defaultdict
from pathlib import Path

import numpy as np
from sklearn.cluster import DBSCAN

sys.path.insert(0, str(Path(__file__).parent))


def detect_cities(p1_markers, eps=0.020, min_samples=40):
    coords = np.array([[m['gx'], m['gy']] for m in p1_markers])
    db = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)
    cities = []
    for label in set(db.labels_):
        if label == -1: continue
        pts = coords[db.labels_ == label]
        cities.append({
            'cx': float(pts[:, 0].mean()),
            'cy': float(pts[:, 1].mean()),
            'r': 0.040,
            'marker_count': int(len(pts)),
        })
    cities.sort(key=lambda c: -c['marker_count'])
    return cities


def city_influence(gx, gy, cities, decay=0.04):
    """가장 가까운 대도시 영향력 (0~1).
    거리 0 (도시 안) → 1.0 (완전 제외)
    거리 decay (320m) → 0.37 (감쇄)
    거리 2×decay (640m) → 0.13 (약함)
    거리 3×decay+ → 0 (영향 없음, 진짜 명당)
    """
    min_d = float('inf')
    for c in cities:
        d = math.sqrt((gx - c['cx']) ** 2 + (gy - c['cy']) ** 2)
        if d < min_d: min_d = d
    return math.exp(-min_d / decay)


def find_myungdang_v2(markers, cities, eps=0.015, min_matches=3):
    """페이즈 1 마커 → 대도시 외부 → 클러스터링 → 명당 점수."""
    # 페이즈 1만 (사용자 통찰: 자기장 형성 직후 이미 도착한 위치)
    p1 = [m for m in markers if m['phase'] == 1]

    # 대도시 영향력 적은 마커만 가중 (도시 안 ~ 도시 외곽까지 점수 자연 감쇄)
    coords = np.array([[m['gx'], m['gy']] for m in p1])
    db = DBSCAN(eps=eps, min_samples=8).fit(coords)
    labels = db.labels_

    clusters = defaultdict(lambda: {'markers': [], 'matches': set()})
    for i, label in enumerate(labels):
        if label == -1: continue
        clusters[label]['markers'].append(p1[i])
        clusters[label]['matches'].add(p1[i]['source'])

    hotspots = []
    for c in clusters.values():
        if len(c['matches']) < min_matches: continue
        gx = sum(m['gx'] for m in c['markers']) / len(c['markers'])
        gy = sum(m['gy'] for m in c['markers']) / len(c['markers'])
        influence = city_influence(gx, gy, cities)
        non_city_factor = 1.0 - influence  # 0 (도시 안) ~ 1 (도시 멀리)

        n_markers = len(c['markers'])
        n_matches = len(c['matches'])
        score = math.log(n_matches + 1) * math.sqrt(n_markers) * non_city_factor

        # 라벨 결정 (사용자 통찰 반영)
        if influence > 0.5: label = '대도시 안/근접 (시작위치, 명당 아님)'
        elif influence > 0.2: label = '외곽 작은 마을 (진짜 명당)'
        else: label = '능선/호 (희귀 명당)'

        hotspots.append({
            'gx': round(gx, 4),
            'gy': round(gy, 4),
            'score': round(score, 3),
            'marker_count': n_markers,
            'match_count': n_matches,
            'city_influence': round(influence, 3),
            'non_city_factor': round(non_city_factor, 3),
            'matches': sorted(c['matches']),
            'label': label,
        })
    hotspots.sort(key=lambda h: -h['score'])
    return hotspots


def main(dataset_path, out_path):
    ds = json.load(open(dataset_path))
    markers = ds['markers']
    p1 = [m for m in markers if m['phase'] == 1]

    print(f"=== 페이즈 1 마커 {len(p1)} ===")
    cities = detect_cities(p1)
    print(f"대도시 자동 검출: {len(cities)}곳")
    print(f"  Top 5 대도시:")
    for c in cities[:5]:
        print(f"    ({c['cx']:.3f}, {c['cy']:.3f}) — {c['marker_count']} 마커")

    hotspots = find_myungdang_v2(markers, cities)
    print(f"\n=== 진짜 명당 v2 후보 {len(hotspots)}곳 ===")
    print(f"라벨 분포:")
    for label in ['능선/호 (희귀 명당)', '외곽 작은 마을 (진짜 명당)', '대도시 안/근접 (시작위치, 명당 아님)']:
        cnt = sum(1 for h in hotspots if h['label'] == label)
        avg_match = np.mean([h['match_count'] for h in hotspots if h['label'] == label]) if cnt else 0
        print(f"  {label}: {cnt}곳 (평균 매치 {avg_match:.1f})")

    print(f"\nTop 15 진짜 명당 (점수 순):")
    for i, h in enumerate(hotspots[:15], 1):
        print(f"  {i:2d}. ({h['gx']:.3f},{h['gy']:.3f}) score={h['score']:5.2f} | "
              f"매치={h['match_count']:2d} 마커={h['marker_count']:3d} | "
              f"도시영향={h['city_influence']:.2f} | {h['label']}")

    # 진짜 명당만 (외곽 작은 마을 + 능선/호)
    real_md = [h for h in hotspots if not h['label'].startswith('대도시 안')]
    print(f"\n=== 진짜 명당 (대도시 안 제외) {len(real_md)}곳 ===")
    for i, h in enumerate(real_md[:25], 1):
        print(f"  {i:2d}. ({h['gx']:.3f},{h['gy']:.3f}) score={h['score']:5.2f} | "
              f"매치={h['match_count']:2d} 마커={h['marker_count']:3d} | "
              f"도시영향={h['city_influence']:.2f} | {h['label']}")

    out = {
        'cities': cities,
        'all_hotspots': hotspots,
        'real_myungdang': real_md,
        'meta': {
            'algorithm': 'phase 1 markers + city influence decay',
            'total_p1_markers': len(p1),
            'total_cities': len(cities),
        },
    }
    json.dump(out, open(out_path, 'w'), indent=2, default=str)
    print(f"\n→ {out_path}")
    return out


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/pub34/ml_dataset_v4.json",
         sys.argv[2] if len(sys.argv) > 2 else "/tmp/pub34/myungdang_v2.json")
